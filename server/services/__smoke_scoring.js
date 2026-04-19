// Runs the 5 sub-scores + composite against the fabricated feature set
// from features/__smoke.js, independent of any network. Proves the
// scoring layer end-to-end when Yahoo is throttled.

import { computePriceVolumeFeatures } from '../features/priceVolumeFeatures.js';
import { computeTechnicalFeatures } from '../features/technicalFeatures.js';
import { computeLiquidityFeatures } from '../features/liquidityFeatures.js';
import { computeSqueezeFeatures } from '../features/squeezeFeatures.js';
import { computeSocialFeatures } from '../features/socialFeatures.js';
import { assembleFeatureVector, featuresByOwner } from '../features/featureVector.js';
import { pumpRiskScore } from './pumpRiskScore.js';
import { liquidityScore } from './liquidityScore.js';
import { socialHypeScore } from './socialHypeScore.js';
import { squeezeScore } from './squeezeScore.js';
import { techFragilityScore } from './techFragilityScore.js';
import { compositeScore, computeConfidence } from './compositeScore.js';

// Same fabricated spike scenario as features/__smoke.js
const history = [];
let price = 100;
for (let i = 0; i < 119; i++) {
  price += (Math.random() - 0.5) * 0.5;
  history.push({
    date: new Date(Date.now() - (120 - i) * 86400000),
    open: price,
    high: price + 0.3,
    low: price - 0.3,
    close: price,
    volume: 2_000_000 + Math.random() * 200_000,
  });
}
history.push({
  date: new Date(),
  open: price,
  high: price * 1.16,
  low: price * 0.99,
  close: price * 1.15,
  volume: 16_000_000,
});

const stats = {
  summaryDetail: { marketCap: 5e9, averageVolume: 2e6, averageVolume10days: 3e6 },
  defaultKeyStatistics: {
    floatShares: 68_000_000,
    sharesShort: 95_000_000,
    shortPercentOfFloat: 1.4,
    shortRatio: 5.1,
  },
  majorHoldersBreakdown: { institutionsPercentHeld: 0.28 },
};

const options = {
  options: [
    {
      calls: Array.from({ length: 20 }, (_, i) => ({ openInterest: 1000 + i * 50, volume: 500 + i * 30 })),
      puts: Array.from({ length: 20 }, (_, i) => ({ openInterest: 800 + i * 20, volume: 200 + i * 10 })),
    },
  ],
};

const pv = computePriceVolumeFeatures({ history });
const tech = computeTechnicalFeatures({ history });
const liq = computeLiquidityFeatures({ history, stats });
const sqz = computeSqueezeFeatures({ stats, options });
const socRaw = computeSocialFeatures({ posts: [], windowDays: 7 });

// Simulate Gemini aggregation on a "pumpy" batch.
const social = {
  ...socRaw,
  mean_hype_score: 0.85,
  bullish_fraction: 0.88,
  sentiment_divergence: 0.35,
  hype_acceleration: 0.72,
  mention_velocity: 1.2,
  influencer_concentration_gini: 0.65,
  spam_repetition_fraction: 0.25,
};

const { vector } = assembleFeatureVector({
  priceVolume: pv,
  technical: tech,
  liquidity: liq,
  squeeze: sqz,
  social,
});
const owned = featuresByOwner(vector);

const subs = {
  pump_risk: pumpRiskScore(owned.pump_risk),
  liquidity: liquidityScore(owned.liquidity),
  social_hype: socialHypeScore(owned.social_hype),
  squeeze: squeezeScore(owned.squeeze),
  tech_fragility: techFragilityScore(owned.tech_fragility),
};

console.log('=== sub-scores ===');
for (const [k, s] of Object.entries(subs)) {
  const top = (s.top_contributors || []).slice(0, 3).map((c) => `${c.feature}(${c.severity})`).join(', ');
  console.log(`  ${k.padEnd(16)} ${String(s.score).padEnd(6)} ${s.band.padEnd(8)} conf=${s.per_score_confidence}  top: ${top}`);
}

const composite = compositeScore(subs);
console.log('\n=== composite ===');
console.log('  score:       ', composite.composite, composite.band);
console.log('  raw_composite:', composite.raw_composite);
console.log('  max_sub:      ', composite.max_sub_score);
console.log('  cap_applied:  ', composite.correlation_cap_applied);

const confidence = computeConfidence({
  postsAnalyzed: 12,
  credibleNewsSources: 4,
  ohlcvDaysAvailable: 120,
  hasShortInterest: true,
  hasOptionsChain: true,
  hasIntraday: true,
});
console.log('\n=== confidence ===');
console.log('  ', confidence.confidence, confidence.band, 'missing:', confidence.missing_inputs);

// Sanity asserts
const fails = [];
if (!(subs.pump_risk.score > 60)) fails.push('pump risk should be HIGH+ on an 8x vol +15% day');
if (!(subs.social_hype.score > 50)) fails.push('social hype should be HIGH+ with mean hype 0.85');
if (!(subs.squeeze.score > 60)) fails.push('squeeze should be HIGH+ with SI 140%');
if (!(subs.tech_fragility.score > 50)) fails.push('tech fragility should be HIGH+ with RSI 90+');
if (!(composite.composite > 50)) fails.push('composite should be > 50 with this many flares');
// Correlation cap must bind: composite must not exceed max_sub + 15
if (composite.composite > composite.max_sub_score + 15 + 0.01) {
  fails.push('composite exceeds correlation cap');
}

if (fails.length) {
  console.error('\nFAIL:');
  for (const f of fails) console.error(' - ' + f);
  process.exit(1);
}
console.log('\nall scoring asserts pass');
