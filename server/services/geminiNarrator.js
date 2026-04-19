import crypto from 'node:crypto';
import { genAI, modelId } from './geminiClient.js';
import { get, set } from './cache.js';

const WEEK = 7 * 86400;

export async function narrateScore({ scoreName, score, band, topContributors }) {
  const payload = { scoreName, score, band, topContributors };
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex')
    .slice(0, 32);

  const cached = get(`gemini:narrate:${hash}`);
  if (cached) return cached;

  const prompt = buildPrompt(payload);
  const model = genAI().getGenerativeModel({
    model: modelId(),
    generationConfig: { temperature: 0.2, maxOutputTokens: 120 },
  });

  try {
    const res = await model.generateContent(prompt);
    const text = (res?.response?.text?.() || '').trim().replace(/^["']|["']$/g, '');
    const line = text.split(/\n/).map((s) => s.trim()).filter(Boolean)[0] || '';
    const narrative = line.slice(0, 220);
    if (narrative) {
      set(`gemini:narrate:${hash}`, narrative, WEEK);
      return narrative;
    }
  } catch (err) {
    console.warn('[geminiNarrator] failed:', err?.message || err);
  }

  // Fallback: deterministic template from the top contributor.
  const tc = Array.isArray(topContributors) && topContributors[0];
  return tc
    ? `${scoreName} is ${band.toLowerCase()} — driven by ${tc.feature} at ${formatValue(tc.value)}.`
    : `${scoreName} is ${band.toLowerCase()}.`;
}

function buildPrompt({ scoreName, score, band, topContributors }) {
  const tc = (topContributors || []).slice(0, 3).map(
    (c) => `${c.feature}=${formatValue(c.value)}`,
  );
  return `Score: ${scoreName} ${score}/100 ${band}
Top features: ${tc.join(', ')}

Task: Write exactly one plain-English sentence (max 25 words) explaining the score. Describe what the features show about the ticker's behavior. Do not start with "The score" or "${scoreName}". Do not use bullet points. Do not repeat the task. Do not claim illegal manipulation — describe anomalous patterns.

Output format: one sentence only.

Sentence:`;
}

function formatValue(v) {
  if (v == null) return 'n/a';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (Math.abs(n) >= 1000) return n.toExponential(2);
  return n.toFixed(2);
}
