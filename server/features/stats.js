import { mean, standardDeviation } from 'simple-statistics';

export function zscore(value, series) {
  if (!Number.isFinite(value) || !series || series.length < 2) return null;
  const sd = standardDeviation(series);
  if (sd === 0) return 0;
  return (value - mean(series)) / sd;
}

export function sma(series, n) {
  if (!series || series.length < n) return null;
  return mean(series.slice(-n));
}

export function pct(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return (a - b) / b;
}

export function finite(...vals) {
  for (const v of vals) if (Number.isFinite(v)) return v;
  return null;
}

export function dailyReturns(closes) {
  const out = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1];
    if (prev > 0 && Number.isFinite(closes[i])) out.push((closes[i] - prev) / prev);
  }
  return out;
}

export function takeTrailing(arr, n) {
  if (!arr) return [];
  return arr.slice(-n);
}
