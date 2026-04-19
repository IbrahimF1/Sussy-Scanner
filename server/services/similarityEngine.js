import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { FEATURE_ORDER } from '../features/featureVector.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ANCHORS_PATH = resolve(__dirname, '..', 'data', 'pump_anchors.json');

let _anchors = null;

export function anchorsPath() {
  return ANCHORS_PATH;
}

export function loadAnchors() {
  if (_anchors) return _anchors;
  try {
    if (!fs.existsSync(ANCHORS_PATH)) return null;
    const raw = fs.readFileSync(ANCHORS_PATH, 'utf-8');
    _anchors = JSON.parse(raw);
    return _anchors;
  } catch (err) {
    console.warn('[similarity] failed to load anchors:', err?.message || err);
    return null;
  }
}

export function saveAnchors(anchors) {
  const dir = dirname(ANCHORS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ANCHORS_PATH, JSON.stringify(anchors, null, 2));
  _anchors = anchors;
}

export function computeSimilarity(vector) {
  const anchors = loadAnchors();
  if (!anchors || !anchors.events?.length) {
    return {
      best_match: null,
      second_match: null,
      all_matches: [],
      anchors_available: false,
    };
  }

  const matches = anchors.events.map((ev) => {
    const { similarity, shared_keys, contributions } = similarityBreakdown(vector, ev.vector);
    return {
      label: ev.label,
      ticker: ev.ticker,
      date: ev.date,
      similarity_raw: Math.round(similarity * 100000) / 100000,
      // Two decimals so near-identical vectors still rank: 100.00 vs 99.75.
      similarity_pct: Math.round(similarity * 10000) / 100,
      shared_features: shared_keys.length,
      top_shared_features: contributions.slice(0, 3),
    };
  });

  matches.sort((a, b) => b.similarity_raw - a.similarity_raw);

  return {
    anchors_available: true,
    best_match: matches[0] || null,
    second_match: matches[1] || null,
    all_matches: matches,
  };
}

// Returns cosine similarity plus per-feature signed contributions. We
// restrict to features that are finite in both vectors so a missing
// squeeze score on the query doesn't zero out the result.
function similarityBreakdown(a, b) {
  const shared = FEATURE_ORDER.filter(
    (k) => Number.isFinite(a[k]) && Number.isFinite(b[k]),
  );
  if (!shared.length) return { similarity: 0, shared_keys: [], contributions: [] };

  let dot = 0;
  let na = 0;
  let nb = 0;
  const terms = [];
  for (const k of shared) {
    const ai = a[k];
    const bi = b[k];
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
    terms.push({ feature: k, product: ai * bi, a: ai, b: bi });
  }
  if (na === 0 || nb === 0) {
    return { similarity: 0, shared_keys: shared, contributions: [] };
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  const similarity = dot / denom;

  const contributions = terms
    .map((t) => ({
      feature: t.feature,
      a: round(t.a),
      b: round(t.b),
      contribution: round(t.product / denom),
    }))
    .sort((x, y) => Math.abs(y.contribution) - Math.abs(x.contribution));

  return { similarity, shared_keys: shared, contributions };
}

function round(n) {
  if (!Number.isFinite(n)) return n;
  return Math.round(n * 1000) / 1000;
}
