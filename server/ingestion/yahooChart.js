import axios from 'axios';
import { wrap } from '../services/cache.js';

// Raw Yahoo Finance chart endpoint. This is the public endpoint the
// TradingView-style widgets use; unlike /v7/finance/quote (which needs a
// cookie crumb and is aggressively rate-limited) this one accepts a
// plain User-Agent header and has been stable and generous in practice.
//
// Fields returned: chart.result[0].timestamp[], indicators.quote[0].{open,high,low,close,volume}
//
// We keep a separate axios instance with a browser UA because Yahoo's
// default 403s on "unknown" Node-style clients.

const client = axios.create({
  baseURL: 'https://query1.finance.yahoo.com',
  timeout: 15000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'application/json,text/plain,*/*',
  },
});

const DAY = 24 * 60 * 60;

export async function getHistory(symbol, { period1, period2, interval = '1d' } = {}) {
  const p1 = toEpoch(period1) || Math.floor((Date.now() - 210 * 86400000) / 1000);
  const p2 = toEpoch(period2) || Math.floor(Date.now() / 1000);
  const key = `yc:hist:${symbol}:${p1}:${p2}:${interval}`;
  return wrap(key, DAY, async () => {
    const { data } = await client.get(`/v8/finance/chart/${encodeURIComponent(symbol)}`, {
      params: { period1: p1, period2: p2, interval, includePrePost: false, events: 'div,split' },
    });
    return parseChart(data);
  });
}

export async function getQuote(symbol) {
  return wrap(`yc:quote:${symbol}`, 30, async () => {
    const p2 = Math.floor(Date.now() / 1000);
    const p1 = p2 - 5 * 86400;
    const { data } = await client.get(`/v8/finance/chart/${encodeURIComponent(symbol)}`, {
      params: { period1: p1, period2: p2, interval: '1d', includePrePost: false },
    });
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    return {
      symbol: meta.symbol,
      regularMarketPrice: meta.regularMarketPrice,
      regularMarketDayHigh: meta.regularMarketDayHigh,
      regularMarketDayLow: meta.regularMarketDayLow,
      regularMarketPreviousClose: meta.chartPreviousClose ?? meta.previousClose,
      regularMarketVolume: meta.regularMarketVolume,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
      currency: meta.currency,
      exchangeName: meta.exchangeName,
      asOf: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : null,
    };
  });
}

function parseChart(data) {
  const result = data?.chart?.result?.[0];
  if (!result) return [];
  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const out = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = quote.close?.[i];
    if (!Number.isFinite(close)) continue;
    out.push({
      date: new Date(timestamps[i] * 1000),
      open: quote.open?.[i] ?? null,
      high: quote.high?.[i] ?? null,
      low: quote.low?.[i] ?? null,
      close,
      volume: quote.volume?.[i] ?? null,
    });
  }
  return out;
}

function toEpoch(d) {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  return Math.floor(dt.getTime() / 1000);
}
