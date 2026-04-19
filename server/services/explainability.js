import { getHistory, getStats, getOptions, getNews } from '../ingestion/marketData.js';
import { searchSocial } from '../ingestion/tavilySearch.js';
import { searchReddit } from '../ingestion/redditSearch.js';
import { enrichPostTimestamps } from '../ingestion/timestampEnricher.js';
import { computePriceVolumeFeatures } from '../features/priceVolumeFeatures.js';
import { computeTechnicalFeatures } from '../features/technicalFeatures.js';
import { computeLiquidityFeatures } from '../features/liquidityFeatures.js';
import { computeSqueezeFeatures } from '../features/squeezeFeatures.js';
import { computeSocialFeatures } from '../features/socialFeatures.js';
import { assembleFeatureVector, featuresByOwner } from '../features/featureVector.js';
import { analyzePosts } from './geminiAnalyzer.js';
import { narrateScore } from './geminiNarrator.js';
import { pumpRiskScore } from './pumpRiskScore.js';
import { liquidityScore } from './liquidityScore.js';
import { socialHypeScore } from './socialHypeScore.js';
import { squeezeScore } from './squeezeScore.js';
import { techFragilityScore } from './techFragilityScore.js';
import { compositeScore, computeConfidence } from './compositeScore.js';
import { computeSimilarity } from './similarityEngine.js';
import { wrap } from './cache.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRESET_SQUEEZE = loadPresetSqueeze();

function loadPresetSqueeze() {
  try {
    const raw = readFileSync(resolve(__dirname, '..', 'data', 'preset_squeeze.json'), 'utf8');
    return JSON.parse(raw).presets || {};
  } catch (err) {
    console.warn('[analyze] preset_squeeze.json load failed:', err?.message || err);
    return {};
  }
}

export async function analyze(symbol, { date } = {}) {
  const key = `analysis:${symbol}:${date || 'live'}`;
  const ttl = date ? 30 * 86400 : 5 * 60;
  return wrap(key, ttl, () => runAnalysis(symbol, { date }));
}

async function runAnalysis(symbol, { date }) {
  const windowDays = 7;
  const dateCenter = date ? new Date(`${date}T00:00:00Z`) : new Date();

  // Fetch a wide window so the timeline view can show context on both
  // sides, but features are computed only through the analysis date.
  const historyEnd = new Date(dateCenter.getTime() + 5 * 86400000);
  const historyStart = new Date(dateCenter.getTime() - 210 * 86400000);

  const socialRange = date ? dateWindow(date, windowDays) : {};
  const [history, stats, options, tavilyPosts, redditPosts, news] = await Promise.all([
    safe(() => getHistory(symbol, { period1: historyStart, period2: historyEnd })),
    safe(() => getStats(symbol)),
    safe(() => getOptions(symbol)),
    safe(() => searchSocial(symbol, socialRange)),
    safe(() => searchReddit(symbol, socialRange)),
    safe(() => getNews(symbol, { date, windowDays })),
  ]);
  const posts = dedupePostsByUrl([
    ...(Array.isArray(redditPosts) ? redditPosts : []),
    ...(Array.isArray(tavilyPosts) ? tavilyPosts : []),
  ]);

  // Clip history at the analysis date — the feature modules treat the
  // last bar as "today", so including days past `date` would score a
  // future state instead of the requested one.
  const featureHistory = clipHistory(history, dateCenter);

  // Backfill missing timestamps (Reddit JSON, X snowflake, etc.) so the
  // social feed shows real dates instead of falling back to the anchor.
  const rawPosts = Array.isArray(posts) ? posts : [];
  const postsArray = await safe(() => enrichPostTimestamps(rawPosts), rawPosts);
  const verdicts = await safe(() => analyzePosts(postsArray, { symbol }), []);

  const llmFeatures = aggregateVerdicts(verdicts, featureHistory);
  const socialRaw = computeSocialFeatures({ posts: postsArray, windowDays });
  const social = { ...socialRaw, ...llmFeatures };

  const priceVolume = computePriceVolumeFeatures({ history: featureHistory });
  const technical = computeTechnicalFeatures({ history: featureHistory });
  const liquidity = computeLiquidityFeatures({ history: featureHistory, stats });
  const squeeze = mergePresetSqueeze(
    computeSqueezeFeatures({ stats, options }),
    symbol,
    date,
  );

  const { vector, missing } = assembleFeatureVector({
    priceVolume,
    technical,
    liquidity,
    squeeze,
    social,
  });

  const owned = featuresByOwner(vector);

  const subs = {
    pump_risk: pumpRiskScore(owned.pump_risk),
    liquidity: liquidityScore(owned.liquidity),
    social_hype: socialHypeScore({ ...owned.social_hype, _post_count: postsArray.length }),
    squeeze: squeezeScore(owned.squeeze),
    tech_fragility: techFragilityScore(owned.tech_fragility),
  };

  // Fire narrator calls in parallel, one per sub-score.
  const narratedSubs = Object.fromEntries(
    await Promise.all(
      Object.entries(subs).map(async ([k, sub]) => {
        const narrative = sub.score == null
          ? null
          : await safe(() =>
              narrateScore({
                scoreName: sub.name,
                score: sub.score,
                band: sub.band,
                topContributors: sub.top_contributors,
              }),
            );
        return [k, { ...sub, narrative }];
      }),
    ),
  );

  const composite = compositeScore(subs);

  const hasShortInterest = Number.isFinite(owned.squeeze.short_pct_of_float);
  const hasOptionsChain = Number.isFinite(owned.squeeze.put_call_oi_ratio);
  const confidence = computeConfidence({
    postsAnalyzed: postsArray.length,
    credibleNewsSources: Array.isArray(news) ? news.length : 0,
    ohlcvDaysAvailable: Array.isArray(history) ? history.length : 0,
    hasShortInterest,
    hasOptionsChain,
    hasIntraday: !!history && history.length > 0,
  });

  const similarity = computeSimilarity(vector);

  return {
    symbol,
    date: date || null,
    generated_at: new Date().toISOString(),
    composite,
    subscores: narratedSubs,
    confidence,
    similarity,
    feature_vector: vector,
    missing_features: missing,
    posts: postsArray.map((p, i) => ({
      title: p.title,
      url: p.url,
      source: p.source,
      content: p.content?.slice(0, 500),
      publishedAt: p.publishedAt,
      engagement: p.engagement || null,
      verdict: verdicts?.[i] || null,
    })),
    news: Array.isArray(news) ? news.slice(0, 20) : [],
  };
}

function aggregateVerdicts(verdicts, history) {
  if (!Array.isArray(verdicts) || !verdicts.length) {
    return { mean_hype_score: null, bullish_fraction: null, sentiment_divergence: null, hype_acceleration: null };
  }
  const hypes = verdicts.map((v) => v?.hype_score).filter(Number.isFinite);
  const bullish = verdicts.filter((v) => v?.sentiment === 'bullish').length;
  const meanHype = hypes.length ? hypes.reduce((a, b) => a + b, 0) / hypes.length : null;
  const bullishFraction = verdicts.length ? bullish / verdicts.length : null;

  // Hype acceleration — split verdicts in half, compare mean hype.
  let hypeAccel = null;
  if (hypes.length >= 4) {
    const half = Math.floor(hypes.length / 2);
    const early = hypes.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const late = hypes.slice(half).reduce((a, b) => a + b, 0) / (hypes.length - half);
    hypeAccel = Math.max(0, Math.min(1, late - early + 0.5));
  }

  // Sentiment divergence — bullishness vs recent price trend.
  let priceTrend5d = null;
  if (Array.isArray(history) && history.length >= 6) {
    const closes = history.map((b) => b.close).filter(Number.isFinite);
    if (closes.length >= 6) {
      const last = closes[closes.length - 1];
      const prev5 = closes[closes.length - 6];
      priceTrend5d = prev5 > 0 ? (last - prev5) / prev5 : null;
    }
  }
  let divergence = null;
  if (bullishFraction != null && Number.isFinite(priceTrend5d)) {
    // High bullish sentiment on a flat or down ticker = divergence.
    // normalize priceTrend5d to 0-1 where 0 = down 20%, 1 = up 20%.
    const normPrice = Math.max(0, Math.min(1, (priceTrend5d + 0.2) / 0.4));
    divergence = Math.max(0, bullishFraction - normPrice);
  }

  return {
    mean_hype_score: meanHype,
    bullish_fraction: bullishFraction,
    sentiment_divergence: divergence,
    hype_acceleration: hypeAccel,
  };
}

function dateWindow(date, days) {
  const center = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(center.getTime())) return {};
  const start = new Date(center.getTime() - days * 86400000);
  const end = new Date(center.getTime() + days * 86400000);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function clipHistory(history, cutoff) {
  if (!Array.isArray(history) || !history.length) return [];
  // Accept rows where date <= cutoff (inclusive, end of day).
  const cutoffMs = cutoff.getTime() + 86400000 - 1;
  return history.filter((b) => {
    const t = b?.date instanceof Date ? b.date.getTime() : Date.parse(b?.date);
    return Number.isFinite(t) && t <= cutoffMs;
  });
}

async function safe(fn, fallback = null) {
  try {
    const v = await fn();
    return v ?? fallback;
  } catch (err) {
    console.warn('[analyze] step failed:', err?.message || err);
    return fallback;
  }
}

// Fall back to the preset seed (FINRA/CBOE public record, checked-in JSON)
// only for the specific fields we couldn't fetch live. Live data always
// wins; the seed just fills the holes that Finnhub free-tier and Yahoo
// rate-limiting leave behind.
function dedupePostsByUrl(posts) {
  const seen = new Set();
  const out = [];
  for (const p of posts) {
    if (!p?.url) continue;
    const k = p.url.toLowerCase().split('?')[0].replace(/\/$/, '');
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

function mergePresetSqueeze(squeeze, symbol, date) {
  if (!date) return squeeze;
  const seed = PRESET_SQUEEZE[`${symbol}|${date}`];
  if (!seed) return squeeze;
  const out = { ...squeeze };
  for (const k of ['short_pct_of_float', 'days_to_cover', 'put_call_oi_ratio', 'call_volume_zscore']) {
    if (out[k] == null && Number.isFinite(seed[k])) out[k] = seed[k];
  }
  return out;
}
