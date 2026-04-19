import { getYahooNews } from './yahooFinance.js';
import { searchCredibleNews } from './tavilySearch.js';
import { wrap } from '../services/cache.js';

export async function getMergedNews(symbol, { date, windowDays = 7 } = {}) {
  const dateRange = dateWindow(date, windowDays);
  const key = `news:${symbol}:${date || 'live'}:${windowDays}`;
  const ttl = date ? 30 * 86400 : 3600;

  return wrap(key, ttl, async () => {
    const [yahoo, tavily] = await Promise.all([
      safeList(() => getYahooNews(symbol)),
      safeList(() =>
        searchCredibleNews(symbol, {
          startDate: dateRange?.startDate,
          endDate: dateRange?.endDate,
        }),
      ),
    ]);

    const combined = [...yahoo, ...tavily];
    const seen = new Set();
    const merged = [];
    for (const item of combined) {
      const k = normalizeUrl(item.url);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      merged.push(item);
    }

    merged.sort((a, b) => {
      const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return tb - ta;
    });

    return merged;
  });
}

function dateWindow(date, windowDays) {
  if (!date) return null;
  const center = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(center.getTime())) return null;
  const start = new Date(center.getTime() - windowDays * 86400 * 1000);
  const end = new Date(center.getTime() + windowDays * 86400 * 1000);
  return { startDate: iso(start), endDate: iso(end) };
}

function iso(d) {
  return d.toISOString().slice(0, 10);
}

function normalizeUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    u.hash = '';
    u.search = '';
    return u.toString().toLowerCase().replace(/\/$/, '');
  } catch {
    return null;
  }
}

async function safeList(fn) {
  try {
    const v = await fn();
    return Array.isArray(v) ? v : [];
  } catch (err) {
    console.warn('[newsService] source failed:', err?.message || err);
    return [];
  }
}
