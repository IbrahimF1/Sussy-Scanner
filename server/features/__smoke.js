// Synthetic smoke test for the feature engine. Run with `node features/__smoke.js`.
// Not part of the production server; lives here so Yahoo rate-limits don't
// block math verification.

import { computePriceVolumeFeatures } from './priceVolumeFeatures.js';
import { computeTechnicalFeatures } from './technicalFeatures.js';
import { computeLiquidityFeatures } from './liquidityFeatures.js';
import { computeSqueezeFeatures } from './squeezeFeatures.js';
import { computeSocialFeatures } from './socialFeatures.js';
import { assembleFeatureVector, FEATURE_ORDER } from './featureVector.js';

// --- Fabricated history: 120 days, steady then spike on last day ---
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
// Spike day: +15% move, 8x volume
const spikeOpen = price;
const spikeClose = price * 1.15;
history.push({
  date: new Date(),
  open: spikeOpen,
  high: spikeClose * 1.01,
  low: spikeOpen * 0.99,
  close: spikeClose,
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
      calls: Array.from({ length: 20 }, (_, i) => ({
        openInterest: 1000 + i * 50,
        volume: 500 + i * 30,
      })),
      puts: Array.from({ length: 20 }, (_, i) => ({
        openInterest: 800 + i * 20,
        volume: 200 + i * 10,
      })),
    },
  ],
};

const posts = [
  { source: 'reddit.com', url: 'https://reddit.com/r/wsb/1', title: 'GME to the moon', content: 'guaranteed 10x buy now' },
  { source: 'reddit.com', url: 'https://reddit.com/r/wsb/2', title: 'GME to the moon!!!', content: 'guaranteed 10x buy now' },
  { source: 'x.com', url: 'https://x.com/a/1', title: 'GME squeeze incoming', content: 'shorts getting rekt' },
  { source: 'stocktwits.com', url: 'https://stocktwits.com/x/1', title: 'ape together strong', content: 'hold the line' },
];

const pv = computePriceVolumeFeatures({ history });
const tech = computeTechnicalFeatures({ history });
const liq = computeLiquidityFeatures({ history, stats });
const sqz = computeSqueezeFeatures({ stats, options });
const soc = computeSocialFeatures({ posts, windowDays: 1 });

const { vector, missing } = assembleFeatureVector({
  priceVolume: pv,
  technical: tech,
  liquidity: liq,
  squeeze: sqz,
  social: soc,
});

console.log('=== price/volume ===');
console.log(pv);
console.log('=== technical ===');
console.log(tech);
console.log('=== liquidity ===');
console.log(liq);
console.log('=== squeeze ===');
console.log(sqz);
console.log('=== social ===');
console.log(soc);
console.log('=== flat vector (' + FEATURE_ORDER.length + ' dims, ' + missing.length + ' missing) ===');
for (const k of FEATURE_ORDER) {
  const v = vector[k];
  console.log('  ' + k.padEnd(36) + (v === null ? 'null' : v.toFixed(4)));
}

// Sanity assertions
const fails = [];
if (!(pv.volume_spike_ratio > 5)) fails.push('volume spike should be large on the spike day');
if (!(pv.daily_return_zscore_60d > 3)) fails.push('daily return z should be high on +15% day');
if (!(tech.rsi_14 > 60)) fails.push('RSI should elevate after a strong up day');
if (!(liq.market_cap_over_adv > 0)) fails.push('mcap/adv should compute');
if (!(sqz.short_pct_of_float === 1.4)) fails.push('shortPercentOfFloat passthrough failed');
if (!(soc.mention_velocity > 0)) fails.push('mention velocity should be > 0');
if (!(soc.spam_repetition_fraction > 0)) fails.push('expect at least 1 near-duplicate pair');

if (fails.length) {
  console.error('\nFAIL:');
  for (const f of fails) console.error(' - ' + f);
  process.exit(1);
}
console.log('\nall sanity checks pass');
