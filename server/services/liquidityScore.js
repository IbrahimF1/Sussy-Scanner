import { bandFor, combine, invLinearSeverity } from './scoringHelpers.js';

export function liquidityScore(features) {
  const entries = [
    {
      feature: 'market_cap_over_adv',
      value: features.market_cap_over_adv,
      weight: 0.3,
      // Lower mcap/ADV = thinner stock = higher liquidity stress.
      severity: invLinearSeverity(features.market_cap_over_adv, 20, 500),
    },
    {
      feature: 'average_dollar_volume_30d',
      value: features.average_dollar_volume_30d,
      weight: 0.2,
      // Below $10M daily = thin, above $500M = deep liquidity.
      severity: invLinearSeverity(features.average_dollar_volume_30d, 10e6, 500e6),
    },
    {
      feature: 'float_shares',
      value: features.float_shares,
      weight: 0.35,
      // Small float = easier to pump. <20M extreme, >200M low stress.
      severity: invLinearSeverity(features.float_shares, 20e6, 200e6),
    },
    {
      feature: 'institutional_ownership_pct',
      value: features.institutional_ownership_pct,
      weight: 0.15,
      // Low institutional ownership = retail-dominated = more volatile.
      severity: invLinearSeverity(features.institutional_ownership_pct, 0.3, 0.7),
    },
  ];

  const combined = combine(entries);
  return { name: 'Liquidity Stress', band: bandFor(combined.score), ...combined };
}
