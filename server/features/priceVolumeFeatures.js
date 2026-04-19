import { mean } from 'simple-statistics';
import { dailyReturns, pct, takeTrailing, zscore } from './stats.js';

export function computePriceVolumeFeatures({ history }) {
  if (!history || history.length < 20) return empty();

  const closes = history.map((b) => b.close).filter(Number.isFinite);
  const volumes = history.map((b) => b.volume).filter(Number.isFinite);
  const opens = history.map((b) => b.open);
  const highs = history.map((b) => b.high);
  const lows = history.map((b) => b.low);

  const last = history.length - 1;
  const prevClose = closes[last - 1];
  const todayClose = closes[last];
  const todayOpen = opens[last];
  const todayHigh = highs[last];
  const todayLow = lows[last];
  const todayVol = volumes[last];

  const vol20 = takeTrailing(volumes.slice(0, last), 20);
  const vol50 = takeTrailing(volumes.slice(0, last), 50);
  const ret60 = takeTrailing(dailyReturns(closes.slice(0, last + 1)), 60);

  const todayReturn = pct(todayClose, prevClose);
  const volSpikeRatio = todayVol && vol20.length ? todayVol / mean(vol20) : null;
  const intradayVol =
    Number.isFinite(todayHigh) && Number.isFinite(todayLow) && todayClose
      ? (todayHigh - todayLow) / todayClose
      : null;
  const dollarVol = Number.isFinite(todayClose) && Number.isFinite(todayVol) ? todayClose * todayVol : null;
  const dollarVolSeries = volumes
    .slice(-21, -1)
    .map((v, i) => v * closes.slice(-21, -1)[i])
    .filter(Number.isFinite);

  // Rate of change acceleration — 1st and 2nd derivative of 5-day ROC.
  const roc = rollingROC(closes, 5);
  const rocLast = roc[roc.length - 1];
  const rocPrev = roc[roc.length - 2];
  const rocAccel =
    Number.isFinite(rocLast) && Number.isFinite(rocPrev) ? rocLast - rocPrev : null;

  return {
    volume_zscore_20d: zscore(todayVol, vol20),
    volume_zscore_50d: zscore(todayVol, vol50),
    volume_spike_ratio: volSpikeRatio,
    daily_return_zscore_60d: zscore(todayReturn, ret60),
    price_gap_pct: pct(todayOpen, prevClose),
    intraday_volatility: intradayVol,
    roc_acceleration: rocAccel,
    dollar_volume_zscore: zscore(dollarVol, dollarVolSeries),
  };
}

function rollingROC(closes, n) {
  const out = [];
  for (let i = n; i < closes.length; i++) {
    const base = closes[i - n];
    if (base > 0) out.push((closes[i] - base) / base);
  }
  return out;
}

function empty() {
  return {
    volume_zscore_20d: null,
    volume_zscore_50d: null,
    volume_spike_ratio: null,
    daily_return_zscore_60d: null,
    price_gap_pct: null,
    intraday_volatility: null,
    roc_acceleration: null,
    dollar_volume_zscore: null,
  };
}
