import { mean, standardDeviation } from 'simple-statistics';
import { sma, takeTrailing } from './stats.js';

export function computeTechnicalFeatures({ history }) {
  if (!history || history.length < 20) return empty();

  const closes = history.map((b) => b.close).filter(Number.isFinite);
  const highs = history.map((b) => b.high);
  const lows = history.map((b) => b.low);
  const opens = history.map((b) => b.open);
  const last = closes.length - 1;
  const todayClose = closes[last];

  const rsi14 = rsi(closes, 14);

  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const sd20 = closes.length >= 20 ? standardDeviation(takeTrailing(closes, 20)) : null;
  const distSma20 = sma20 && sd20 ? (todayClose - sma20) / sd20 : null;
  const distSma50 =
    sma50 && closes.length >= 50 ? (todayClose - sma50) / standardDeviation(takeTrailing(closes, 50)) : null;
  const distSma200 =
    sma200 && closes.length >= 200
      ? (todayClose - sma200) / standardDeviation(takeTrailing(closes, 200))
      : null;

  const bb = bollinger(closes, 20, 2);
  const bbWidth = bb ? (bb.upper - bb.lower) / bb.mid : null;
  const bbBreachCount5 = bb
    ? countBreaches(closes.slice(-5), bollinger(closes.slice(0, -1), 20, 2))
    : null;

  const consolidationBreakout = breakoutFromRange(closes, 20);
  const gapAndRun = detectGapAndRun(opens, closes, highs, lows);
  const atr = atrRegime(highs, lows, closes, 14);

  return {
    rsi_14: rsi14,
    distance_sma_20: distSma20,
    distance_sma_50: distSma50,
    distance_sma_200: distSma200,
    bb_width_20_2: bbWidth,
    bb_breaches_last_5: bbBreachCount5,
    consolidation_breakout: consolidationBreakout,
    gap_and_run: gapAndRun,
    atr_regime_shift: atr,
  };
}

function rsi(closes, n) {
  if (closes.length <= n) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - n; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / n;
  const avgLoss = losses / n;
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function bollinger(closes, n, k) {
  if (closes.length < n) return null;
  const slice = takeTrailing(closes, n);
  const mid = mean(slice);
  const sd = standardDeviation(slice);
  return { mid, upper: mid + k * sd, lower: mid - k * sd };
}

function countBreaches(slice, bb) {
  if (!bb) return null;
  return slice.filter((c) => c > bb.upper || c < bb.lower).length;
}

function breakoutFromRange(closes, n) {
  if (closes.length < n + 1) return null;
  const last = closes[closes.length - 1];
  const window = closes.slice(-(n + 1), -1);
  const max = Math.max(...window);
  const min = Math.min(...window);
  if (max === min) return 0;
  if (last > max) return (last - max) / (max - min);
  if (last < min) return (last - min) / (max - min);
  return 0;
}

function detectGapAndRun(opens, closes, highs, lows) {
  const i = closes.length - 1;
  if (i < 1) return null;
  const prevClose = closes[i - 1];
  if (!prevClose) return null;
  const gap = (opens[i] - prevClose) / prevClose;
  if (!Number.isFinite(gap) || gap < 0.03) return 0;
  const rangeTop = highs[i];
  const rangeBot = lows[i];
  const close = closes[i];
  if (rangeTop === rangeBot) return 0;
  const topPos = (close - rangeBot) / (rangeTop - rangeBot);
  return topPos >= 0.8 ? gap : 0;
}

function atrRegime(highs, lows, closes, n) {
  if (closes.length < n + 1) return null;
  const trs = [];
  for (let i = 1; i < closes.length; i++) {
    trs.push(
      Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1]),
      ),
    );
  }
  const recent = mean(takeTrailing(trs, n));
  const baseline = mean(takeTrailing(trs.slice(0, -n), n));
  if (!baseline) return null;
  return (recent - baseline) / baseline;
}

function empty() {
  return {
    rsi_14: null,
    distance_sma_20: null,
    distance_sma_50: null,
    distance_sma_200: null,
    bb_width_20_2: null,
    bb_breaches_last_5: null,
    consolidation_breakout: null,
    gap_and_run: null,
    atr_regime_shift: null,
  };
}
