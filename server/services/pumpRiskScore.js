import { bandFor, combine, linearSeverity, sigmoidSeverity } from './scoringHelpers.js';

export function pumpRiskScore(features) {
  const entries = [
    {
      feature: 'volume_zscore_20d',
      value: features.volume_zscore_20d,
      weight: 0.18,
      severity: sigmoidSeverity(features.volume_zscore_20d, { mid: 2, steep: 0.9 }),
    },
    {
      feature: 'volume_zscore_50d',
      value: features.volume_zscore_50d,
      weight: 0.08,
      severity: sigmoidSeverity(features.volume_zscore_50d, { mid: 2, steep: 0.8 }),
    },
    {
      feature: 'volume_spike_ratio',
      value: features.volume_spike_ratio,
      weight: 0.14,
      severity: linearSeverity(features.volume_spike_ratio, 1, 8),
    },
    {
      feature: 'daily_return_zscore_60d',
      value: features.daily_return_zscore_60d,
      weight: 0.22,
      severity: sigmoidSeverity(features.daily_return_zscore_60d, { mid: 2, steep: 1.0 }),
    },
    {
      feature: 'price_gap_pct',
      value: features.price_gap_pct,
      weight: 0.08,
      severity: linearSeverity(Math.abs(features.price_gap_pct ?? NaN), 0.02, 0.15),
    },
    {
      feature: 'intraday_volatility',
      value: features.intraday_volatility,
      weight: 0.08,
      severity: linearSeverity(features.intraday_volatility, 0.03, 0.2),
    },
    {
      feature: 'roc_acceleration',
      value: features.roc_acceleration,
      weight: 0.12,
      severity: linearSeverity(Math.abs(features.roc_acceleration ?? NaN), 0.02, 0.2),
    },
    {
      feature: 'dollar_volume_zscore',
      value: features.dollar_volume_zscore,
      weight: 0.10,
      severity: sigmoidSeverity(features.dollar_volume_zscore, { mid: 2, steep: 0.9 }),
    },
  ];

  const combined = combine(entries);
  return { name: 'Pump Risk', band: bandFor(combined.score), ...combined };
}
