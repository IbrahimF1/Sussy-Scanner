// Precomputes pump_anchors.json for the 5 preset events by running the
// full analysis pipeline against each. Commit the result; it only needs
// re-running when the feature set, scoring weights, or preset list
// changes.
//
// Usage (from repo root):
//   node server/scripts/build_anchors.js

import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isCli = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

export const PRESET_EVENTS = [
  { ticker: 'GME', date: '2021-01-27', label: 'GameStop short squeeze' },
  { ticker: 'AMC', date: '2021-06-02', label: 'AMC ape rally' },
  { ticker: 'DWAC', date: '2021-10-22', label: 'Trump SPAC pump' },
  { ticker: 'BBBY', date: '2022-08-16', label: 'Bed Bath meme revival' },
  { ticker: 'SMCI', date: '2024-03-08', label: 'Super Micro AI spike' },
];

async function main() {
  const { config: loadEnv } = await import('dotenv');
  loadEnv({ path: resolve(__dirname, '..', '..', '.env') });
  const { analyze } = await import('../services/explainability.js');
  const { saveAnchors, anchorsPath } = await import('../services/similarityEngine.js');

  const events = [];

  for (const preset of PRESET_EVENTS) {
    const label = `${preset.ticker}-${preset.date}`;
    process.stdout.write(`[${label}] analyzing... `);
    const t0 = Date.now();
    try {
      const result = await analyze(preset.ticker, { date: preset.date });
      const vector = result?.feature_vector || {};
      const finite = Object.values(vector).filter((v) => Number.isFinite(v)).length;
      console.log(`ok (${finite}/${Object.keys(vector).length} features, ${Date.now() - t0}ms, composite=${result?.composite?.composite ?? '?'})`);
      events.push({
        ticker: preset.ticker,
        date: preset.date,
        label: preset.label,
        vector,
        composite: result?.composite?.composite ?? null,
        band: result?.composite?.band ?? null,
        generated_at: result?.generated_at ?? new Date().toISOString(),
      });
    } catch (err) {
      console.error(`failed: ${err?.message || err}`);
    }
  }

  if (!events.length) {
    console.error('No anchors computed — aborting.');
    process.exit(1);
  }

  saveAnchors({
    generated_at: new Date().toISOString(),
    events,
  });
  console.log(`\nsaved ${events.length} anchors to ${anchorsPath()}`);
  process.exit(0);
}

if (isCli) main();
