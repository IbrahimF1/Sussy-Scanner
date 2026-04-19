// Unified market-data adapter. The rest of the codebase imports from here
// so we can swap or combine sources without touching callers.
//
// v1 pipeline: Finnhub for quote/profile/metrics/news, Stooq for historical
// OHLCV (since Finnhub paywalled /stock/candle for US stocks in 2024).
// Yahoo Finance is kept as a last-resort fallback — the adapter tries
// Finnhub/Stooq first and only reaches for Yahoo if both fail.

import * as finnhub from './finnhub.js';
import * as yahooChart from './yahooChart.js';
import * as yahoo from './yahooFinance.js';
import { getMergedNews as mergedNews } from './newsService.js';

const HAS_FINNHUB = () => !!process.env.FINNHUB_API_KEY;

export async function getQuote(symbol) {
  if (HAS_FINNHUB()) {
    try {
      const q = await finnhub.getQuote(symbol);
      if (q) return q;
    } catch (err) {
      console.warn('[marketData] finnhub.quote failed:', err?.message || err);
    }
  }
  // Yahoo's raw chart endpoint — unauthenticated, not rate-limited like /v7/quote.
  try {
    const q = await yahooChart.getQuote(symbol);
    if (q) return q;
  } catch (err) {
    console.warn('[marketData] yahooChart.quote failed:', err?.message || err);
  }
  return tryYahoo('getQuote', [symbol]);
}

export async function getHistory(symbol, opts = {}) {
  // Primary: Yahoo's unauthenticated chart endpoint. Free, reliable,
  // sidesteps yahoo-finance2's crumb-based /v7 rate limits.
  try {
    const h = await yahooChart.getHistory(symbol, opts);
    if (Array.isArray(h) && h.length) return h;
  } catch (err) {
    console.warn('[marketData] yahooChart.history failed:', err?.message || err);
  }
  // Fallback: Finnhub candles (paywalled on free tier; works for paid keys).
  if (HAS_FINNHUB()) {
    try {
      const c = await finnhub.getCandles(symbol, { from: opts.period1, to: opts.period2 });
      if (Array.isArray(c) && c.length) return c;
    } catch (err) {
      console.warn('[marketData] finnhub.candles failed:', err?.message || err);
    }
  }
  // Last resort: yahoo-finance2's historical() — same data, but goes
  // through the rate-limited /v7 path so often 429s.
  return tryYahoo('getHistory', [symbol, opts]);
}

// Unified stats blob, shaped like yahoo-finance2's quoteSummary output so
// the feature modules don't have to branch. We translate Finnhub's metric
// response into the same {summaryDetail, defaultKeyStatistics, majorHoldersBreakdown}
// keys that liquidity/squeeze features read.
export async function getStats(symbol) {
  if (HAS_FINNHUB()) {
    try {
      const [profile, metric] = await Promise.all([
        finnhub.getProfile(symbol).catch(() => null),
        finnhub.getMetrics(symbol).catch(() => null),
      ]);
      if (profile || metric) return translateFinnhubStats({ profile, metric });
    } catch (err) {
      console.warn('[marketData] finnhub.stats failed:', err?.message || err);
    }
  }
  return tryYahoo('getStats', [symbol]);
}

// Options chain. Finnhub's option-chain is premium-only and yahoo is often
// rate-limited; we return null on failure so squeezeFeatures gracefully
// emits null for put_call_oi_ratio / call_volume_zscore.
export async function getOptions(symbol) {
  return tryYahoo('getOptions', [symbol]);
}

// Merged news. The existing newsService handles Yahoo-search + Tavily
// credible-domain merge. We additionally prepend Finnhub company news
// if available so coverage on less-covered small caps is better.
export async function getNews(symbol, { date, windowDays = 7 } = {}) {
  let finnhubItems = [];
  if (HAS_FINNHUB()) {
    try {
      const { from, to } = dateWindow(date, windowDays);
      finnhubItems = await finnhub.getCompanyNews(symbol, { from, to });
    } catch (err) {
      console.warn('[marketData] finnhub.news failed:', err?.message || err);
    }
  }
  const rest = await mergedNews(symbol, { date, windowDays }).catch((err) => {
    console.warn('[marketData] mergedNews failed:', err?.message || err);
    return [];
  });
  return dedupeByUrl([...finnhubItems, ...rest]);
}

export async function searchSymbol(q) {
  if (HAS_FINNHUB()) {
    try {
      const r = await finnhub.searchSymbol(q);
      if (Array.isArray(r) && r.length) return r;
    } catch (err) {
      console.warn('[marketData] finnhub.search failed:', err?.message || err);
    }
  }
  return tryYahoo('searchSymbol', [q]);
}

async function tryYahoo(fn, args) {
  try {
    return await yahoo[fn](...args);
  } catch (err) {
    console.warn(`[marketData] yahoo.${fn} failed:`, err?.message || err);
    return null;
  }
}

function translateFinnhubStats({ profile, metric }) {
  const m = metric?.metric || {};
  const p = profile || {};

  const shortPctFloat = num(m.shortInterestSharePercent) ?? num(m.shortInterestPercentFloat);
  const shortRatio = num(m.shortRatio);
  const sharesShort = num(m.sharesShort);
  const shareOut = (p.shareOutstanding ?? num(m.sharesOutstanding)) * 1e6 || null;
  const floatShares = num(m.floatShares) || shareOut;
  const marketCap = p.marketCapitalization ? p.marketCapitalization * 1e6 : null;
  const avgVol10 = num(m['10DayAverageTradingVolume']);
  const avgVol3m = num(m['3MonthAverageTradingVolume']);

  return {
    summaryDetail: {
      marketCap,
      averageVolume10days: avgVol10,
      averageVolume: avgVol3m || avgVol10,
      fiftyTwoWeekHigh: num(m['52WeekHigh']),
      fiftyTwoWeekLow: num(m['52WeekLow']),
    },
    defaultKeyStatistics: {
      floatShares,
      sharesOutstanding: shareOut,
      sharesShort,
      shortPercentOfFloat: shortPctFloat,
      shortRatio,
    },
    majorHoldersBreakdown: {
      // Finnhub doesn't expose this cleanly on free tier; leave null and
      // the confidence coverage will reflect it.
      institutionsPercentHeld: null,
    },
    _source: 'finnhub',
    _raw: { profile, metric },
  };
}

function num(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function dedupeByUrl(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const k = normalizeUrl(item?.url);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  out.sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });
  return out;
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

function dateWindow(date, days) {
  if (!date) {
    return {
      from: new Date(Date.now() - days * 86400000).toISOString().slice(0, 10),
      to: new Date().toISOString().slice(0, 10),
    };
  }
  const center = new Date(`${date}T00:00:00Z`);
  return {
    from: new Date(center.getTime() - days * 86400000).toISOString().slice(0, 10),
    to: new Date(center.getTime() + days * 86400000).toISOString().slice(0, 10),
  };
}
