import { bandFor, combine, invLinearSeverity, linearSeverity, sigmoidSeverity } from './scoringHelpers.js';

export function squeezeScore(features) {
  const entries = [
    {
      feature: 'short_pct_of_float',
      value: features.short_pct_of_float,
      weight: 0.35,
      // 0-1+ range; 0.3 elevated, 1.0+ extreme.
      severity: linearSeverity(features.short_pct_of_float, 0.1, 1.0),
    },
    {
      feature: 'days_to_cover',
      value: features.days_to_cover,
      weight: 0.25,
      // <2 easy to cover, >10 stuck.
      severity: linearSeverity(features.days_to_cover, 2, 10),
    },
    {
      feature: 'put_call_oi_ratio',
      value: features.put_call_oi_ratio,
      weight: 0.2,
      // <0.4 = heavy call OI = gamma risk; >1.0 = put-heavy (less squeezy).
      severity: invLinearSeverity(features.put_call_oi_ratio, 0.3, 1.0),
    },
    {
      feature: 'call_volume_zscore',
      value: features.call_volume_zscore,
      weight: 0.2,
      severity: sigmoidSeverity(features.call_volume_zscore, { mid: 1.5, steep: 1.0 }),
    },
  ];

  const combined = combine(entries);
  return { name: 'Squeeze Pressure', band: bandFor(combined.score), ...combined };
}
