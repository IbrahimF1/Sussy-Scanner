// Enforces the plan's feature-ownership rule: each raw feature belongs to
// exactly one sub-score. Sub-score services read from their owning slice
// only; composite then uses the correlation cap.

export const FEATURE_OWNERS = Object.freeze({
  // Pump Risk
  volume_zscore_20d: 'pump_risk',
  volume_zscore_50d: 'pump_risk',
  volume_spike_ratio: 'pump_risk',
  daily_return_zscore_60d: 'pump_risk',
  price_gap_pct: 'pump_risk',
  intraday_volatility: 'pump_risk',
  roc_acceleration: 'pump_risk',
  dollar_volume_zscore: 'pump_risk',

  // Liquidity
  market_cap_over_adv: 'liquidity',
  average_dollar_volume_30d: 'liquidity',
  float_shares: 'liquidity',
  institutional_ownership_pct: 'liquidity',

  // Social Hype
  mention_velocity: 'social_hype',
  mean_hype_score: 'social_hype',
  bullish_fraction: 'social_hype',
  sentiment_divergence: 'social_hype',
  hype_acceleration: 'social_hype',
  influencer_concentration_gini: 'social_hype',
  spam_repetition_fraction: 'social_hype',

  // Squeeze Pressure
  short_pct_of_float: 'squeeze',
  days_to_cover: 'squeeze',
  put_call_oi_ratio: 'squeeze',
  call_volume_zscore: 'squeeze',

  // Technical Fragility
  rsi_14: 'tech_fragility',
  distance_sma_20: 'tech_fragility',
  distance_sma_50: 'tech_fragility',
  distance_sma_200: 'tech_fragility',
  bb_width_20_2: 'tech_fragility',
  bb_breaches_last_5: 'tech_fragility',
  consolidation_breakout: 'tech_fragility',
  gap_and_run: 'tech_fragility',
  atr_regime_shift: 'tech_fragility',
});

export const FEATURE_ORDER = Object.freeze(Object.keys(FEATURE_OWNERS));

function stripContext(obj) {
  const { _context, ...rest } = obj;
  return rest;
}

export function assembleFeatureVector({ priceVolume, technical, liquidity, squeeze, social }) {
  const flat = {
    ...(priceVolume || {}),
    ...(technical || {}),
    ...(liquidity || {}),
    ...(squeeze || {}),
    ...stripContext(social || {}),
  };

  // Assert: every key in the flat blob must be owned. Catches drift at dev time.
  for (const k of Object.keys(flat)) {
    if (!(k in FEATURE_OWNERS)) {
      throw new Error(`feature ${k} has no owner in FEATURE_OWNERS`);
    }
  }

  const vector = {};
  const missing = [];
  for (const k of FEATURE_ORDER) {
    const v = flat[k];
    if (v === undefined || v === null || Number.isNaN(v)) {
      vector[k] = null;
      missing.push(k);
    } else {
      vector[k] = Number(v);
    }
  }

  return { vector, missing };
}

export function featuresByOwner(vector) {
  const out = { pump_risk: {}, liquidity: {}, social_hype: {}, squeeze: {}, tech_fragility: {} };
  for (const [k, owner] of Object.entries(FEATURE_OWNERS)) {
    out[owner][k] = vector[k];
  }
  return out;
}

export function cosineSimilarity(a, b) {
  const keys = FEATURE_ORDER.filter(
    (k) => Number.isFinite(a[k]) && Number.isFinite(b[k]),
  );
  if (!keys.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const k of keys) {
    dot += a[k] * b[k];
    na += a[k] * a[k];
    nb += b[k] * b[k];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Normalize a raw vector against a baseline of median values from a basket
// of "normal" tickers, computed once and shipped as static JSON. Missing
// baseline entries fall through unchanged.
export function normalize(vector, baseline) {
  if (!baseline) return vector;
  const out = {};
  for (const k of FEATURE_ORDER) {
    const v = vector[k];
    const ref = baseline[k];
    if (v == null) {
      out[k] = null;
    } else if (ref && Number.isFinite(ref.median) && Number.isFinite(ref.mad) && ref.mad > 0) {
      out[k] = (v - ref.median) / ref.mad;
    } else {
      out[k] = v;
    }
  }
  return out;
}
