import { bandFor, combine, linearSeverity, sigmoidSeverity } from './scoringHelpers.js';

function rsiSeverity(rsi) {
  if (!Number.isFinite(rsi)) return null;
  // U-shaped: extreme on either end.
  const dist = Math.max(0, Math.abs(rsi - 50) - 15); // 35-65 is "normal"
  // dist 0 → 0, dist 35 (RSI 15 or 85) → 100
  return Math.min(100, (dist / 35) * 100);
}

export function techFragilityScore(features) {
  const entries = [
    {
      feature: 'rsi_14',
      value: features.rsi_14,
      weight: 0.15,
      severity: rsiSeverity(features.rsi_14),
    },
    {
      feature: 'distance_sma_20',
      value: features.distance_sma_20,
      weight: 0.17,
      severity: sigmoidSeverity(features.distance_sma_20, { mid: 2, steep: 0.9 }),
    },
    {
      feature: 'distance_sma_50',
      value: features.distance_sma_50,
      weight: 0.17,
      severity: sigmoidSeverity(features.distance_sma_50, { mid: 2.5, steep: 0.8 }),
    },
    {
      feature: 'distance_sma_200',
      value: features.distance_sma_200,
      weight: 0.08,
      severity: sigmoidSeverity(features.distance_sma_200, { mid: 3, steep: 0.6 }),
    },
    {
      feature: 'bb_width_20_2',
      value: features.bb_width_20_2,
      weight: 0.08,
      severity: linearSeverity(features.bb_width_20_2, 0.05, 0.25),
    },
    {
      feature: 'bb_breaches_last_5',
      value: features.bb_breaches_last_5,
      weight: 0.1,
      severity:
        features.bb_breaches_last_5 == null ? null : Math.min(100, features.bb_breaches_last_5 * 30),
    },
    {
      feature: 'consolidation_breakout',
      value: features.consolidation_breakout,
      weight: 0.1,
      severity: linearSeverity(Math.abs(features.consolidation_breakout ?? NaN), 0.5, 5),
    },
    {
      feature: 'gap_and_run',
      value: features.gap_and_run,
      weight: 0.08,
      severity: linearSeverity(features.gap_and_run, 0.03, 0.15),
    },
    {
      feature: 'atr_regime_shift',
      value: features.atr_regime_shift,
      weight: 0.07,
      severity: linearSeverity(features.atr_regime_shift, 0.3, 2.0),
    },
  ];

  const combined = combine(entries);
  return { name: 'Technical Fragility', band: bandFor(combined.score), ...combined };
}
