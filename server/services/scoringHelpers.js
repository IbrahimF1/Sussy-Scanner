// Shared primitives for turning raw feature values into 0-100 severity
// scores with per-feature contributions. The plan mandates explicit
// contribution values so explainability panels can rank them.

export const BANDS = Object.freeze({ LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', EXTREME: 'EXTREME' });

export function bandFor(score) {
  if (!Number.isFinite(score)) return BANDS.LOW;
  if (score >= 75) return BANDS.EXTREME;
  if (score >= 50) return BANDS.HIGH;
  if (score >= 25) return BANDS.MEDIUM;
  return BANDS.LOW;
}

// Sigmoid centered at `mid` with slope `steep`. Returns 0-100.
// A z-score of `mid` maps to 50, |z|=mid+1/steep maps to ~73.
export function sigmoidSeverity(value, { mid = 2, steep = 1 } = {}) {
  if (!Number.isFinite(value)) return null;
  const x = steep * (Math.abs(value) - mid);
  const s = 1 / (1 + Math.exp(-x));
  return s * 100;
}

// Piecewise linear mapping: values below `lo` → 0, above `hi` → 100.
export function linearSeverity(value, lo, hi) {
  if (!Number.isFinite(value)) return null;
  if (value <= lo) return 0;
  if (value >= hi) return 100;
  return ((value - lo) / (hi - lo)) * 100;
}

// Inverse linear: values below `lo` → 100, above `hi` → 0. Useful for
// "lower is worse" features like market_cap_over_adv.
export function invLinearSeverity(value, lo, hi) {
  if (!Number.isFinite(value)) return null;
  if (value <= lo) return 100;
  if (value >= hi) return 0;
  return 100 - ((value - lo) / (hi - lo)) * 100;
}

// Combine per-feature severities into a single 0-100 score with a
// weighted average, returning the top-K contributors by
// weighted_severity. Missing severities are excluded from both the
// numerator and the denominator.
export function combine(entries, { topK = 3 } = {}) {
  const present = entries.filter((e) => Number.isFinite(e.severity));
  if (!present.length) {
    return { score: null, top_contributors: [], per_score_confidence: 0 };
  }
  const totalWeight = present.reduce((a, e) => a + (e.weight || 0), 0);
  const score =
    totalWeight > 0
      ? present.reduce((a, e) => a + e.severity * e.weight, 0) / totalWeight
      : null;

  const contributions = present.map((e) => ({
    feature: e.feature,
    value: e.value,
    severity: round(e.severity),
    contribution: round((e.severity * e.weight) / (totalWeight || 1) / 100),
  }));
  contributions.sort((a, b) => b.contribution - a.contribution);

  const per_score_confidence = entries.length ? present.length / entries.length : 0;

  return {
    score: score === null ? null : round(score),
    top_contributors: contributions.slice(0, topK),
    per_score_confidence: round(per_score_confidence),
  };
}

function round(n) {
  if (!Number.isFinite(n)) return n;
  return Math.round(n * 1000) / 1000;
}
