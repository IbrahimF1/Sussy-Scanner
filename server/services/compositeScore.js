import { BANDS } from './scoringHelpers.js';

const WEIGHTS = { pump_risk: 0.3, liquidity: 0.2, social_hype: 0.25, squeeze: 0.1, tech_fragility: 0.15 };

// Confidence coverage — weighted-additive with a missing_inputs list.
// short_interest and options_chain only feed the squeeze sub-score and come
// from the flakiest upstreams (Finnhub free-tier 403s, Yahoo 429s), so we
// keep their weight small — their absence shouldn't drop a well-documented
// historical event from HIGH to MEDIUM.
const CONFIDENCE_WEIGHTS = {
  posts_analyzed: 0.3,
  credible_news: 0.2,
  ohlcv_history: 0.25,
  short_interest: 0.05,
  options_chain: 0.05,
  intraday_data: 0.15,
};

export function compositeScore(subs) {
  const present = Object.entries(subs).filter(([, s]) => Number.isFinite(s?.score));
  if (!present.length) {
    return { composite: null, band: BANDS.LOW, correlation_cap_applied: false };
  }

  let weightedSum = 0;
  let weightTotal = 0;
  const sanitized = {};
  for (const [key, sub] of present) {
    const w = WEIGHTS[key] ?? 0;
    sanitized[key] = sub.score;
    weightedSum += sub.score * w;
    weightTotal += w;
  }
  const raw = weightTotal > 0 ? weightedSum / weightTotal : null;
  const sortedScores = Object.values(sanitized).sort((a, b) => b - a);
  const maxSub = sortedScores[0];

  // Floor: when two or more sub-scores are both in the HIGH band, that's
  // real convergence (independent signals pointing the same way) — the
  // weighted average shouldn't sit below the mean of the top two just
  // because a sparse or low-weighted sub-score pulls it down.
  const highScores = sortedScores.filter((s) => s >= 50);
  const stackingFloor = highScores.length >= 2
    ? (highScores[0] + highScores[1]) / 2
    : null;

  // Cap: a single outlier score can't drag the whole composite above
  // maxSub + 15 either.
  const ceiling = maxSub + 15;

  let composite = raw;
  const stacking_floor_applied = stackingFloor != null && composite < stackingFloor;
  if (stacking_floor_applied) composite = stackingFloor;
  const correlation_cap_applied = composite > ceiling;
  if (correlation_cap_applied) composite = ceiling;

  return {
    composite: round(composite),
    raw_composite: round(raw),
    max_sub_score: round(maxSub),
    correlation_cap_applied,
    stacking_floor_applied,
    band: bandForComposite(composite),
    weights: WEIGHTS,
  };
}

function bandForComposite(s) {
  if (!Number.isFinite(s)) return BANDS.LOW;
  if (s >= 70) return 'RED';
  if (s >= 40) return 'YELLOW';
  return 'GREEN';
}

export function computeConfidence({
  postsAnalyzed = 0,
  credibleNewsSources = 0,
  ohlcvDaysAvailable = 0,
  hasShortInterest = false,
  hasOptionsChain = false,
  hasIntraday = false,
}) {
  const coverage = {
    posts_analyzed: Math.min(1, postsAnalyzed / 20),
    credible_news: Math.min(1, credibleNewsSources / 3),
    ohlcv_history: Math.min(1, ohlcvDaysAvailable / 60),
    short_interest: hasShortInterest ? 1 : 0,
    options_chain: hasOptionsChain ? 1 : 0,
    intraday_data: hasIntraday ? 1 : 0,
  };
  const confidence = Object.entries(coverage).reduce(
    (acc, [k, v]) => acc + v * (CONFIDENCE_WEIGHTS[k] || 0),
    0,
  );
  const missing_inputs = Object.entries(coverage)
    .filter(([, v]) => v === 0)
    .map(([k]) => k);

  return {
    confidence: round(confidence),
    band: confidence >= 0.75 ? 'HIGH' : confidence >= 0.5 ? 'MEDIUM' : 'LOW',
    missing_inputs,
    coverage,
  };
}

function round(n) {
  if (!Number.isFinite(n)) return n;
  return Math.round(n * 1000) / 1000;
}
