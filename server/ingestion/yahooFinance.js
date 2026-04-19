import yahooFinance from 'yahoo-finance2';
import { wrap } from '../services/cache.js';

yahooFinance.suppressNotices(['yahooSurvey']);

const DAY = 24 * 60 * 60;

async function withRetry(fn, { retries = 2, baseMs = 800 } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = String(err?.message || err);
      const throttled = /Too Many Requests|429|Invalid Crumb/i.test(msg);
      if (!throttled || i === retries) throw err;
      const delay = baseMs * Math.pow(2, i);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

export async function getQuote(symbol) {
  return wrap(`quote:${symbol}`, 30, () => withRetry(() => yahooFinance.quote(symbol)));
}

export async function getHistory(symbol, { period1, period2, interval = '1d' } = {}) {
  const p1 = period1 || new Date(Date.now() - 180 * 86400 * 1000);
  const p2 = period2 || new Date();
  const key = `history:${symbol}:${iso(p1)}:${iso(p2)}:${interval}`;
  return wrap(key, DAY, () =>
    withRetry(() => yahooFinance.historical(symbol, { period1: p1, period2: p2, interval })),
  );
}

export async function getStats(symbol) {
  return wrap(`stats:${symbol}`, 12 * 3600, () =>
    withRetry(() =>
      yahooFinance.quoteSummary(symbol, {
        modules: [
          'defaultKeyStatistics',
          'summaryDetail',
          'financialData',
          'majorHoldersBreakdown',
        ],
      }),
    ),
  );
}

export async function getOptions(symbol) {
  return wrap(`options:${symbol}`, 30 * 60, () =>
    withRetry(() => yahooFinance.options(symbol)),
  );
}

export async function getYahooNews(symbol) {
  return wrap(`yahoo-news:${symbol}`, 3600, async () => {
    const result = await withRetry(() =>
      yahooFinance.search(symbol, { newsCount: 10 }),
    );
    return (result.news || []).map((n) => ({
      source: 'yahoo',
      outlet: n.publisher,
      title: n.title,
      url: n.link,
      publishedAt: n.providerPublishTime
        ? new Date(n.providerPublishTime * 1000).toISOString()
        : null,
    }));
  });
}

export async function searchSymbol(query) {
  return wrap(`symbol-search:${query}`, DAY, async () => {
    const result = await withRetry(() =>
      yahooFinance.search(query, { quotesCount: 8, newsCount: 0 }),
    );
    return (result.quotes || [])
      .filter((q) => q.symbol && q.shortname)
      .map((q) => ({ symbol: q.symbol, name: q.shortname, exchange: q.exchange }));
  });
}

function iso(d) {
  return d instanceof Date ? d.toISOString().slice(0, 10) : String(d);
}
