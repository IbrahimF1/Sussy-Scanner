import { GoogleGenerativeAI } from '@google/generative-ai';

let _client = null;

export function genAI() {
  if (_client) return _client;
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY missing');
  }
  _client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return _client;
}

export function modelId() {
  return process.env.GEMINI_MODEL || 'gemma-4-it';
}

// Parse a JSON string with a single retry through a repair pass. Gemma's
// JSON adherence is strong but not schema-enforced, so a rare extra code
// fence or trailing text can appear.
export function safeJsonParse(text) {
  if (!text) return null;
  // Fast path
  try {
    return JSON.parse(text);
  } catch {}
  // Strip code fences / leading narration
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1] : text;
  // Grab the first {...} or [...] block
  const objMatch = candidate.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (!objMatch) return null;
  try {
    return JSON.parse(objMatch[1]);
  } catch {
    return null;
  }
}
