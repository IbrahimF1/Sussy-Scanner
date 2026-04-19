// Smoke test for the Gemma 4 LLM layer. Loads .env from repo root.
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, '..', '..', '.env') });

const { analyzePosts } = await import('./geminiAnalyzer.js');
const { narrateScore } = await import('./geminiNarrator.js');

const posts = [
  {
    source: 'reddit.com',
    title: 'GME to the moon 🚀🚀🚀 — GUARANTEED 10x by Friday',
    content: 'Everyone load up NOW before it\'s too late, shorts about to get squeezed into oblivion',
  },
  {
    source: 'cnbc.com',
    title: 'GameStop reports Q3 earnings, revenue down 8% year over year',
    content: 'The company reported lower-than-expected revenue but improved gross margins of 23%.',
  },
  {
    source: 'x.com',
    title: 'Diamond hands forever',
    content: '$GME ape together strong. Shorts must cover. Not financial advice but buy and hold.',
  },
];

console.log('--- analyzePosts ---');
const verdicts = await analyzePosts(posts, { symbol: 'GME' });
for (let i = 0; i < verdicts.length; i++) {
  const v = verdicts[i];
  console.log(
    `#${i + 1}  ${posts[i].source.padEnd(14)} narrative=${v.narrative.padEnd(20)} hype=${v.hype_score.toFixed(2)}  sentiment=${v.sentiment.padEnd(8)} promo=${v.is_promotional}  coord=${v.coordination_signal}`,
  );
  console.log(`        source=${v._source}  reason: ${v.reasoning}`);
}

console.log('\n--- narrateScore ---');
const narrative = await narrateScore({
  scoreName: 'Pump Risk',
  score: 91,
  band: 'EXTREME',
  topContributors: [
    { feature: 'volume_zscore_20d', value: 4.2, contribution: 0.34 },
    { feature: 'daily_return_zscore_60d', value: 3.8, contribution: 0.28 },
    { feature: 'roc_acceleration', value: 0.15, contribution: 0.18 },
  ],
});
console.log(narrative);
