import { mean } from 'simple-statistics';
import { takeTrailing } from './stats.js';

// Note (per plan's FEATURE_OWNERS): short interest + days-to-cover live in
// squeezeFeatures. Liquidity owns: mcap/ADV, ADV, float, institutional %.

export function computeLiquidityFeatures({ history, stats }) {
  const summary = stats?.summaryDetail || {};
  const keyStats = stats?.defaultKeyStatistics || {};
  const holders = stats?.majorHoldersBreakdown || {};

  const marketCap = numberOf(summary.marketCap);
  const floatShares = numberOf(keyStats.floatShares) || numberOf(keyStats.sharesOutstanding);

  const closes = history?.map((b) => b.close).filter(Number.isFinite) || [];
  const volumes = history?.map((b) => b.volume).filter(Number.isFinite) || [];
  const dollarVolSeries = closes
    .slice(-30)
    .map((c, i) => c * volumes.slice(-30)[i])
    .filter(Number.isFinite);
  const adv30d = dollarVolSeries.length ? mean(dollarVolSeries) : null;

  const mcapOverAdv = marketCap && adv30d ? marketCap / adv30d : null;

  return {
    market_cap_over_adv: mcapOverAdv,
    average_dollar_volume_30d: adv30d,
    float_shares: floatShares,
    institutional_ownership_pct: numberOf(holders.institutionsPercentHeld),
  };
}

function numberOf(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && 'raw' in v) return v.raw;
  return null;
}
