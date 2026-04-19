import { mean, standardDeviation } from 'simple-statistics';

// Features that don't need the LLM — counting + statistical patterns over
// the Tavily-returned posts. Gemini-derived features (hype_score,
// sentiment polarity, narrative concentration) are merged in by the
// scoring layer after geminiAnalyzer runs.

export function computeSocialFeatures({ posts, windowDays = 7, priceTrend5d = null }) {
  if (!posts || !posts.length) return empty();

  const windowHours = Math.max(windowDays * 24, 1);
  const mentionVelocity = posts.length / windowHours; // posts per hour

  // Concentration: Gini over post counts per inferred author/domain.
  const authors = posts.map((p) => p.source || domainOf(p.url) || 'unknown');
  const authorCounts = countBy(authors);
  const concentrationGini = gini(Object.values(authorCounts));

  // Repetition: fraction of post pairs with Jaccard similarity >= 0.7.
  // O(n^2) but n is small (≤40).
  const repetition = repetitionFraction(posts);

  return {
    mention_velocity: mentionVelocity,
    influencer_concentration_gini: concentrationGini,
    spam_repetition_fraction: repetition,
    // Divergence and the Gemini-derived keys are filled in by the scoring
    // layer after the LLM runs. Exposed here as null so featureVector.js
    // has a stable key shape.
    sentiment_divergence: null,
    mean_hype_score: null,
    hype_acceleration: null,
    bullish_fraction: null,
    // priceTrend5d is intentionally kept out of the vector — it's used
    // downstream to compute sentiment_divergence but isn't itself a feature.
    _context: { price_trend_5d: priceTrend5d },
  };
}

function countBy(arr) {
  const out = {};
  for (const k of arr) out[k] = (out[k] || 0) + 1;
  return out;
}

function gini(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  if (sum === 0) return 0;
  let cum = 0;
  for (let i = 0; i < n; i++) cum += (i + 1) * sorted[i];
  return (2 * cum) / (n * sum) - (n + 1) / n;
}

function repetitionFraction(posts) {
  const toks = posts.map((p) => tokenSet((p.content || '') + ' ' + (p.title || '')));
  if (toks.length < 2) return 0;
  let pairs = 0;
  let hits = 0;
  for (let i = 0; i < toks.length; i++) {
    for (let j = i + 1; j < toks.length; j++) {
      pairs++;
      if (jaccard(toks[i], toks[j]) >= 0.7) hits++;
    }
  }
  return pairs === 0 ? 0 : hits / pairs;
}

function tokenSet(text) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3),
  );
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const uni = a.size + b.size - inter;
  return uni === 0 ? 0 : inter / uni;
}

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function empty() {
  return {
    mention_velocity: null,
    influencer_concentration_gini: null,
    spam_repetition_fraction: null,
    sentiment_divergence: null,
    mean_hype_score: null,
    hype_acceleration: null,
    bullish_fraction: null,
    _context: { price_trend_5d: null },
  };
}

export { mean as _mean, standardDeviation as _stddev };
