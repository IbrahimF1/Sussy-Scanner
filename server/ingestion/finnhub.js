import axios from 'axios';
import { wrap } from '../services/cache.js';

const BASE = 'https://finnhub.io/api/v1';
const DAY = 24 * 60 * 60;

function token() {
  const t = process.env.FINNHUB_API_KEY;
  if (!t) throw new Error('FINNHUB_API_KEY missing');
  return t;
}

async function get(path, params = {}) {
  const { data } = await axios.get(`${BASE}${path}`, {
    params: { ...params, token: token() },
    timeout: 15000,
  });
  return data;
}

// Current quote. Shape: { c: current, d: change, dp: changePct, h, l, o, pc: prevClose, t: ts }
export async function getQuote(symbol) {
  return wrap(`fh:quote:${symbol}`, 30, async () => {
    const q = await get('/quote', { symbol });
    if (!q || !Number.isFinite(q.c)) return null;
    return {
      symbol,
      regularMarketPrice: q.c,
      regularMarketChange: q.d,
      regularMarketChangePercent: q.dp,
      regularMarketDayHigh: q.h,
      regularMarketDayLow: q.l,
      regularMarketOpen: q.o,
      regularMarketPreviousClose: q.pc,
      asOf: q.t ? new Date(q.t * 1000).toISOString() : null,
    };
  });
}

// Company profile: name, industry, exchange, shares outstanding, ipo, etc.
export async function getProfile(symbol) {
  return wrap(`fh:profile:${symbol}`, 24 * 3600, () => get('/stock/profile2', { symbol }));
}

// Fundamental metrics: 52w range, short interest (if available), ADV, float approx.
export async function getMetrics(symbol) {
  return wrap(`fh:metric:${symbol}`, 12 * 3600, () =>
    get('/stock/metric', { symbol, metric: 'all' }),
  );
}

// Company news in a date window.
export async function getCompanyNews(symbol, { from, to } = {}) {
  const fromDate = from || isoDate(new Date(Date.now() - 14 * 86400000));
  const toDate = to || isoDate(new Date());
  return wrap(`fh:news:${symbol}:${fromDate}:${toDate}`, 3600, async () => {
    const arr = await get('/company-news', { symbol, from: fromDate, to: toDate });
    if (!Array.isArray(arr)) return [];
    return arr.map((n) => ({
      source: 'finnhub',
      outlet: n.source,
      title: n.headline,
      url: n.url,
      publishedAt: n.datetime ? new Date(n.datetime * 1000).toISOString() : null,
      summary: n.summary,
    }));
  });
}

// Candle/history. Returns array of { date, open, high, low, close, volume }.
// Finnhub's /stock/candle free tier was restricted for US stocks in 2024;
// this call may return 403 premium_required — we throw on that so the
// orchestrator can fall back to Stooq.
export async function getCandles(symbol, { from, to, resolution = 'D' } = {}) {
  const p1 = from ? Math.floor(new Date(from).getTime() / 1000) : Math.floor((Date.now() - 180 * 86400000) / 1000);
  const p2 = to ? Math.floor(new Date(to).getTime() / 1000) : Math.floor(Date.now() / 1000);
  const key = `fh:candle:${symbol}:${resolution}:${p1}:${p2}`;
  return wrap(key, DAY, async () => {
    const d = await get('/stock/candle', { symbol, resolution, from: p1, to: p2 });
    if (d?.s === 'no_data') return [];
    if (d?.s !== 'ok' || !Array.isArray(d?.t)) {
      // Finnhub returns { error: "You don't have access..." } on premium endpoints
      throw new Error(d?.error || 'finnhub_candle_unavailable');
    }
    return d.t.map((ts, i) => ({
      date: new Date(ts * 1000),
      open: d.o[i],
      high: d.h[i],
      low: d.l[i],
      close: d.c[i],
      volume: d.v[i],
    }));
  });
}

// Symbol search autocomplete.
export async function searchSymbol(query) {
  return wrap(`fh:search:${query}`, DAY, async () => {
    const d = await get('/search', { q: query });
    const res = d?.result || [];
    return res
      .filter((r) => r.symbol && r.description)
      .slice(0, 8)
      .map((r) => ({ symbol: r.symbol, name: r.description, exchange: r.exchange }));
  });
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}
