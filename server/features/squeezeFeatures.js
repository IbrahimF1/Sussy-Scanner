import { mean, standardDeviation } from 'simple-statistics';

// Per FEATURE_OWNERS: Squeeze owns short interest %, DTC, put/call OI,
// call volume Z-score. Short interest is displayed by Liquidity as
// context but does NOT contribute to its score.

export function computeSqueezeFeatures({ stats, options }) {
  const keyStats = stats?.defaultKeyStatistics || {};

  const shortPctFloat = numberOf(keyStats.shortPercentOfFloat);
  const sharesShort = numberOf(keyStats.sharesShort);
  const avgVol10d = numberOf(stats?.summaryDetail?.averageVolume10days);
  const avgVol = numberOf(stats?.summaryDetail?.averageVolume);
  const daysToCover = sharesShort && (avgVol10d || avgVol)
    ? sharesShort / (avgVol10d || avgVol)
    : numberOf(keyStats.shortRatio);

  const { putCallOiRatio, callVolumeZ } = computeOptionsFeatures(options);

  return {
    short_pct_of_float: shortPctFloat,
    days_to_cover: daysToCover,
    put_call_oi_ratio: putCallOiRatio,
    call_volume_zscore: callVolumeZ,
  };
}

function computeOptionsFeatures(options) {
  if (!options?.options?.length) return { putCallOiRatio: null, callVolumeZ: null };

  // Nearest expiry chain
  const chain = options.options[0];
  const calls = chain?.calls || [];
  const puts = chain?.puts || [];

  const sumOI = (arr) =>
    arr.reduce((acc, c) => acc + (numberOf(c.openInterest) || 0), 0);
  const sumVol = (arr) =>
    arr.reduce((acc, c) => acc + (numberOf(c.volume) || 0), 0);

  const callOI = sumOI(calls);
  const putOI = sumOI(puts);
  const putCallOiRatio = callOI > 0 ? putOI / callOI : null;

  const callVol = sumVol(calls);
  const callVols = calls.map((c) => numberOf(c.volume) || 0).filter(Number.isFinite);
  const callVolumeZ =
    callVols.length > 1 && standardDeviation(callVols) > 0
      ? (callVol / calls.length - mean(callVols)) / standardDeviation(callVols)
      : null;

  return { putCallOiRatio, callVolumeZ };
}

function numberOf(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && 'raw' in v) return v.raw;
  return null;
}
