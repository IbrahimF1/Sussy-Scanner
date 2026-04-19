import Icon from './Icon.jsx';

const GROUPS = [
  {
    icon: 'trendingUp',
    title: 'Price & Volume',
    features: [
      ['volume_zscore_20d', 'Volume z-score (20d)', 'sigma'],
      ['volume_spike_ratio', 'Volume spike', 'mult'],
      ['daily_return_zscore_60d', 'Return z-score (60d)', 'sigma'],
      ['price_gap_pct', 'Price gap', 'pct'],
      ['intraday_volatility', 'Intraday vol.', 'pct'],
      ['roc_acceleration', 'ROC acceleration', 'num'],
    ],
  },
  {
    icon: 'droplet',
    title: 'Liquidity',
    features: [
      ['market_cap_over_adv', 'Mcap / ADV', 'num'],
      ['average_dollar_volume_30d', 'Avg $ volume (30d)', 'money'],
      ['float_shares', 'Float', 'shares'],
      ['institutional_ownership_pct', 'Inst. ownership', 'pct'],
    ],
  },
  {
    icon: 'flame',
    title: 'Squeeze',
    features: [
      ['short_pct_of_float', 'Short % of float', 'pct'],
      ['days_to_cover', 'Days to cover', 'num'],
      ['put_call_oi_ratio', 'Put/Call OI', 'num'],
      ['call_volume_zscore', 'Call volume z', 'sigma'],
    ],
  },
  {
    icon: 'compass',
    title: 'Technicals',
    features: [
      ['rsi_14', 'RSI (14)', 'num'],
      ['distance_sma_20', 'From 20d SMA', 'sigma'],
      ['distance_sma_50', 'From 50d SMA', 'sigma'],
      ['distance_sma_200', 'From 200d SMA', 'sigma'],
      ['bb_width_20_2', 'BB width', 'pct'],
      ['consolidation_breakout', 'Breakout magnitude', 'num'],
    ],
  },
];

export default function KeyStatsPanel({ analysis }) {
  const vec = analysis?.feature_vector || {};

  return (
    <div className="key-stats">
      {GROUPS.map((g) => {
        const allMissing = g.features.every(
          ([k]) => vec[k] == null || !Number.isFinite(vec[k]),
        );

        return (
          <div key={g.title} className="stat-group">
            <div className="stat-group__head">
              <Icon name={g.icon} size={14} className="stat-group__icon" />
              <span className="stat-group__title">{g.title}</span>
              {allMissing && (
                <span
                  className="stat-group__notice"
                  title="The current data source did not expose these fields for this ticker."
                >
                  source unavailable
                </span>
              )}
            </div>
            <div className="stat-group__grid">
              {g.features.map(([k, label, fmt]) => {
                const v = vec[k];
                const available = v != null && Number.isFinite(v);

                return (
                  <div key={k} className={`stat-tile ${!available ? 'stat-tile--empty' : ''}`}>
                    <div className="stat-tile__label">{label}</div>
                    <div className="stat-tile__value">
                      {available ? fmtValue(v, fmt) : <span className="stat-tile__na">-</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function fmtValue(v, fmt) {
  if (fmt === 'pct') return `${(v * 100).toFixed(1)}%`;
  if (fmt === 'sigma') return `${v.toFixed(2)} sd`;
  if (fmt === 'mult') return `${v.toFixed(2)}x`;
  if (fmt === 'money' || fmt === 'shares') {
    const abs = Math.abs(v);
    if (abs >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${(v / 1e3).toFixed(1)}k`;
    return v.toFixed(0);
  }
  return v.toFixed(2);
}
