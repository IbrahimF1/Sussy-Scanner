import crypto from 'node:crypto';
import { genAI, modelId, safeJsonParse } from './geminiClient.js';
import { get, set } from './cache.js';

const WEEK = 7 * 86400;
const BATCH_SIZE = 5;

const NARRATIVE_BUCKETS = [
  'meme_hype',
  'fundamental_thesis',
  'short_squeeze',
  'ai_crypto_buzz',
  'coordination_signal',
  'skeptic',
  'other',
];

const BENIGN_KEYWORDS_RE = /\b(earnings|revenue|guidance|margin|eps|balance sheet|10-k|10-q|sec filing|analyst|upgrade|downgrade)\b/i;
const PUMPY_KEYWORDS_RE = /(moon|🚀|10x|100x|guaranteed|pump|squeeze|diamond hands|buy now|to the moon|yolo|next (gme|amc))/i;

// Per-post pre-filter: skip the LLM for clearly benign, non-pumpy posts.
// Anything with any pump-y marker OR absent of neutral finance terms gets
// sent. This keeps the token spend manageable.
function prefilter(post) {
  const text = `${post.title || ''} ${post.content || ''}`;
  if (PUMPY_KEYWORDS_RE.test(text)) return 'send';
  if (BENIGN_KEYWORDS_RE.test(text)) return 'skip_benign';
  return 'send';
}

function skippedVerdict(post) {
  return {
    is_promotional: false,
    hype_score: 0.05,
    urgency_signal: false,
    sentiment: 'neutral',
    narrative: 'fundamental_thesis',
    coordination_signal: false,
    reasoning: 'pre-filtered as neutral finance content',
  };
}

function postHash(post) {
  const canon = `${post.title || ''}\n${post.content || ''}`.slice(0, 4000);
  return crypto.createHash('sha256').update(canon).digest('hex').slice(0, 32);
}

export async function analyzePosts(posts, { symbol } = {}) {
  if (!Array.isArray(posts) || !posts.length) return [];

  const verdicts = new Array(posts.length);
  const toSend = [];

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const hash = postHash(post);
    const cached = get(`gemini:post:${hash}`);
    if (cached) {
      verdicts[i] = { ...cached, _source: 'cache' };
      continue;
    }
    if (prefilter(post) === 'skip_benign') {
      const v = skippedVerdict(post);
      set(`gemini:post:${hash}`, v, WEEK);
      verdicts[i] = { ...v, _source: 'prefilter' };
      continue;
    }
    toSend.push({ i, hash, post });
  }

  for (let start = 0; start < toSend.length; start += BATCH_SIZE) {
    const batch = toSend.slice(start, start + BATCH_SIZE);
    const results = await analyzeBatch(
      batch.map((b) => b.post),
      { symbol },
    );
    for (let k = 0; k < batch.length; k++) {
      const item = batch[k];
      const v = sanitizeVerdict(results[k]);
      // Do NOT cache transient failures — they should be retried next call.
      const isFailure = v.reasoning?.startsWith('verdict unavailable');
      if (!isFailure) set(`gemini:post:${item.hash}`, v, WEEK);
      verdicts[item.i] = { ...v, _source: isFailure ? 'llm_failed' : 'llm' };
    }
  }

  return verdicts;
}

async function analyzeBatch(posts, { symbol }) {
  const prompt = buildBatchPrompt(posts, symbol);
  // NOTE: Gemma models don't support responseMimeType:application/json
  // (the API returns 400 "JSON mode is not enabled"). We rely on the
  // prompt + safeJsonParse to handle code fences / minor drift.
  const model = genAI().getGenerativeModel({
    model: modelId(),
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2048,
    },
  });

  let parsed = null;
  for (let attempt = 0; attempt < 2 && parsed === null; attempt++) {
    try {
      const res = await model.generateContent(prompt);
      const text = res?.response?.text?.() || '';
      parsed = safeJsonParse(text);
      if (Array.isArray(parsed) && parsed.length === posts.length) break;
      parsed = null;
    } catch (err) {
      console.warn('[geminiAnalyzer] attempt', attempt + 1, 'failed:', err?.message || err);
    }
  }

  if (!Array.isArray(parsed) || parsed.length !== posts.length) {
    // Graceful degrade: return a neutral verdict for each post rather
    // than failing the whole analysis.
    return posts.map(() => neutralVerdict('llm_failed'));
  }
  return parsed;
}

function buildBatchPrompt(posts, symbol) {
  const items = posts
    .map(
      (p, i) =>
        `#${i + 1} (${p.source || 'unknown'}):\nTITLE: ${truncate(p.title || '', 200)}\nBODY: ${truncate(
          p.content || '',
          800,
        )}`,
    )
    .join('\n\n---\n\n');

  return `You are classifying social media posts about stock ticker ${symbol || 'unknown'}.
For each post, return a JSON object with these fields:
- is_promotional: boolean (is this a pump/hype attempt to move the price?)
- hype_score: number 0.0-1.0 (how hype-y is the post; 0 = sober thesis, 1 = guaranteed 10x moon)
- urgency_signal: boolean (language pressuring immediate action: "NOW", "BEFORE IT'S TOO LATE", "LAST CHANCE")
- sentiment: "bullish" | "bearish" | "neutral"
- narrative: one of ${NARRATIVE_BUCKETS.map((n) => `"${n}"`).join(' | ')}
- coordination_signal: boolean (near-duplicate phrasing, brigading language, "everyone buy X at 10am")
- reasoning: one concise sentence (<=25 words) justifying your classification

Return a JSON ARRAY with exactly ${posts.length} objects, in the same order as the posts below.
Do not wrap in code fences. Do not add prose before or after the array.

POSTS:

${items}`;
}

function sanitizeVerdict(raw) {
  if (!raw || typeof raw !== 'object') return neutralVerdict('sanitize_failed');
  return {
    is_promotional: !!raw.is_promotional,
    hype_score: clamp01(raw.hype_score),
    urgency_signal: !!raw.urgency_signal,
    sentiment: ['bullish', 'bearish', 'neutral'].includes(raw.sentiment) ? raw.sentiment : 'neutral',
    narrative: NARRATIVE_BUCKETS.includes(raw.narrative) ? raw.narrative : 'other',
    coordination_signal: !!raw.coordination_signal,
    reasoning: typeof raw.reasoning === 'string' ? raw.reasoning.slice(0, 300) : '',
  };
}

function neutralVerdict(reason) {
  return {
    is_promotional: false,
    hype_score: 0.0,
    urgency_signal: false,
    sentiment: 'neutral',
    narrative: 'other',
    coordination_signal: false,
    reasoning: `verdict unavailable (${reason})`,
  };
}

function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}
