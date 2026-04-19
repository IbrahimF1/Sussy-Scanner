import { bandFor, combine, linearSeverity, sigmoidSeverity } from './scoringHelpers.js';

// Below this, the window returned so few posts that mention_velocity /
// concentration / repetition are noise, not signal. We return a null score
// so the composite re-normalizes over the remaining sub-scores instead of
// letting a thin sample drag a real pump day down to YELLOW.
const MIN_POSTS_FOR_SIGNAL = 15;

export function socialHypeScore(features) {
  if (Number.isFinite(features?._post_count) && features._post_count < MIN_POSTS_FOR_SIGNAL) {
    return {
      name: 'Social Hype',
      score: null,
      band: 'LOW',
      top_contributors: [],
      per_score_confidence: 0,
      insufficient_data: true,
      post_count: features._post_count,
    };
  }

  const entries = [
    {
      feature: 'mention_velocity',
      value: features.mention_velocity,
      weight: 0.14,
      // posts/hour — 0.5 is noticeable, 5 is extreme chatter.
      severity: linearSeverity(features.mention_velocity, 0.1, 5),
    },
    {
      feature: 'mean_hype_score',
      value: features.mean_hype_score,
      weight: 0.22,
      // already 0-1
      severity: features.mean_hype_score == null ? null : features.mean_hype_score * 100,
    },
    {
      feature: 'bullish_fraction',
      value: features.bullish_fraction,
      weight: 0.10,
      // 0.5 neutral, 0.9 wildly bullish
      severity:
        features.bullish_fraction == null
          ? null
          : Math.max(0, features.bullish_fraction - 0.5) * 200,
    },
    {
      feature: 'sentiment_divergence',
      value: features.sentiment_divergence,
      weight: 0.14,
      severity:
        features.sentiment_divergence == null ? null : features.sentiment_divergence * 100,
    },
    {
      feature: 'hype_acceleration',
      value: features.hype_acceleration,
      weight: 0.14,
      severity: features.hype_acceleration == null ? null : features.hype_acceleration * 100,
    },
    {
      feature: 'influencer_concentration_gini',
      value: features.influencer_concentration_gini,
      weight: 0.12,
      severity:
        features.influencer_concentration_gini == null
          ? null
          : features.influencer_concentration_gini * 100,
    },
    {
      feature: 'spam_repetition_fraction',
      value: features.spam_repetition_fraction,
      weight: 0.14,
      severity:
        features.spam_repetition_fraction == null
          ? null
          : features.spam_repetition_fraction * 100,
    },
  ];

  const combined = combine(entries);
  return { name: 'Social Hype', band: bandFor(combined.score), ...combined };
}
