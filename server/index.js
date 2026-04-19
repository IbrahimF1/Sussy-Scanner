import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import express from 'express';
import cors from 'cors';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, '..', '.env') });

const { wrap, purgeExpired } = await import('./services/cache.js');
const { getQuote, getHistory, getStats, getNews, searchSymbol } = await import(
  './ingestion/marketData.js'
);
const { searchSocial } = await import('./ingestion/tavilySearch.js');
const { analyze } = await import('./services/explainability.js');
const { computeSimilarity } = await import('./services/similarityEngine.js');
const { PRESET_EVENTS } = await import('./scripts/build_anchors.js').catch(() => ({ PRESET_EVENTS: [] }));

const REQUIRED_ENV = ['TAVILY_API_KEY', 'GEMINI_API_KEY'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(
    `Missing env vars: ${missing.join(', ')}. Copy .env.example to .env and fill in real values.`,
  );
  process.exit(1);
}

if (!process.env.FINNHUB_API_KEY) {
  console.warn('[server] FINNHUB_API_KEY not set — market-data adapter will skip Finnhub and use Stooq for history.');
}

const PORT = Number(process.env.PORT) || 3001;

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    model: process.env.GEMINI_MODEL || 'gemma-4-it',
    ts: new Date().toISOString(),
  });
});

app.get('/api/stock/quote/:symbol', handler(async (req) => getQuote(req.params.symbol.toUpperCase())));

app.get(
  '/api/stock/history/:symbol',
  handler(async (req) => {
    const { symbol } = req.params;
    const { period1, period2, interval } = req.query;
    return getHistory(symbol.toUpperCase(), {
      period1: period1 ? new Date(period1) : undefined,
      period2: period2 ? new Date(period2) : undefined,
      interval: interval || '1d',
    });
  }),
);

app.get('/api/stock/stats/:symbol', handler(async (req) => getStats(req.params.symbol.toUpperCase())));

app.get(
  '/api/stock/search',
  handler(async (req) => searchSymbol(String(req.query.q || ''))),
);

app.get(
  '/api/news/:symbol',
  handler(async (req) =>
    getNews(req.params.symbol.toUpperCase(), {
      date: req.query.date,
      windowDays: req.query.window ? Number(req.query.window) : 7,
    }),
  ),
);

app.get(
  '/api/social/:symbol',
  handler(async (req) => {
    const { symbol } = req.params;
    const date = req.query.date;
    const windowDays = req.query.window ? Number(req.query.window) : 7;
    const range = date ? window(date, windowDays) : {};
    return searchSocial(symbol.toUpperCase(), range);
  }),
);

app.get(
  '/api/analysis/:symbol',
  handler(async (req) =>
    analyze(req.params.symbol.toUpperCase(), { date: req.query.date }),
  ),
);

app.get('/api/presets', (_req, res) => res.json(PRESET_EVENTS));

app.get(
  '/api/similarity/:symbol',
  handler(async (req) => {
    const result = await analyze(req.params.symbol.toUpperCase(), { date: req.query.date });
    return { symbol: result.symbol, date: result.date, ...(result.similarity || {}) };
  }),
);

app.get(
  '/api/timeline/:symbol',
  handler(async (req) => {
    const { symbol } = req.params;
    const date = req.query.date;
    const windowDays = req.query.window ? Number(req.query.window) : 60;
    const end = date ? new Date(`${date}T00:00:00Z`) : new Date();
    const start = new Date(end.getTime() - windowDays * 86400000);
    const far = new Date(end.getTime() + 5 * 86400000);

    const history = await getHistory(symbol.toUpperCase(), {
      period1: start,
      period2: far,
    });

    // Best-effort social velocity per day within the window.
    const social = await searchSocial(symbol.toUpperCase(), {
      startDate: start.toISOString().slice(0, 10),
      endDate: far.toISOString().slice(0, 10),
    }).catch(() => []);

    const velocityByDay = bucketByDay(social);
    const series = (history || []).map((bar) => {
      const day = (bar.date instanceof Date ? bar.date : new Date(bar.date))
        .toISOString()
        .slice(0, 10);
      return {
        date: day,
        close: bar.close,
        volume: bar.volume,
        social_velocity: velocityByDay[day] || 0,
      };
    });

    return { symbol: symbol.toUpperCase(), date: date || null, windowDays, series };
  }),
);

function bucketByDay(posts) {
  const out = {};
  for (const p of posts || []) {
    const t = p.publishedAt ? Date.parse(p.publishedAt) : null;
    if (!Number.isFinite(t)) continue;
    const day = new Date(t).toISOString().slice(0, 10);
    out[day] = (out[day] || 0) + 1;
  }
  return out;
}

function handler(fn) {
  return async (req, res) => {
    try {
      const value = await fn(req);
      res.json(value);
    } catch (err) {
      console.error(`[${req.path}]`, err?.message || err);
      res.status(502).json({ error: err?.message || 'upstream_error' });
    }
  };
}

function window(date, days) {
  const center = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(center.getTime())) return {};
  const start = new Date(center.getTime() - days * 86400 * 1000);
  const end = new Date(center.getTime() + days * 86400 * 1000);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

app.get('/api/_cache/ping', async (req, res) => {
  const key = `ping:${req.query.k || 'default'}`;
  const hit = { cached: true };
  let served = 'hit';
  const value = await wrap(key, 30, async () => {
    served = 'miss';
    return { cached: false, computed_at: new Date().toISOString() };
  });
  res.json({ served, key, value });
});

purgeExpired();

app.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`);
});
