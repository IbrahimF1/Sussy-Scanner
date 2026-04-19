import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  createSeriesMarkers,
} from 'lightweight-charts';
import { fetchHistory } from '../services/api.js';

// Candle chart using TradingView's open-source lightweight-charts engine.
// Unlike the embed widget's `range` param (always relative to "now"), this
// lets us anchor the visible window on an arbitrary historical date.

const WINDOW_PAST_DAYS = 150;
const WINDOW_FUTURE_DAYS = 45;

export default function TradingViewChart({ symbol, date }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!containerRef.current || !symbol) return;
    let cancelled = false;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#0B0D10' },
        textColor: '#8d95a1',
        fontFamily:
          'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(36,41,50,0.45)' },
        horzLines: { color: 'rgba(36,41,50,0.45)' },
      },
      rightPriceScale: { borderColor: '#21262e' },
      timeScale: { borderColor: '#21262e', rightOffset: 8 },
      crosshair: { mode: 1 },
      autoSize: true,
    });
    chartRef.current = chart;

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: '#739883',
      downColor: '#b06d72',
      wickUpColor: '#739883',
      wickDownColor: '#b06d72',
      borderVisible: false,
    });

    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
      color: 'rgba(141,149,161,0.4)',
    });
    chart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    const anchor = date ? new Date(`${date}T00:00:00Z`) : new Date();
    const period1 = new Date(anchor.getTime() - WINDOW_PAST_DAYS * 86400000);
    const period2 = new Date(anchor.getTime() + WINDOW_FUTURE_DAYS * 86400000);

    fetchHistory(symbol, { period1, period2, interval: '1d' })
      .then((bars) => {
        if (cancelled) return;
        if (!Array.isArray(bars) || !bars.length) {
          setError('No price history available.');
          return;
        }

        const candleData = [];
        const volumeData = [];
        for (const b of bars) {
          const t = isoDay(b.date);
          if (!t || !Number.isFinite(b.close)) continue;
          candleData.push({
            time: t,
            open: Number.isFinite(b.open) ? b.open : b.close,
            high: Number.isFinite(b.high) ? b.high : b.close,
            low: Number.isFinite(b.low) ? b.low : b.close,
            close: b.close,
          });
          if (Number.isFinite(b.volume)) {
            volumeData.push({
              time: t,
              value: b.volume,
              color:
                b.close >= (b.open ?? b.close)
                  ? 'rgba(115,152,131,0.45)'
                  : 'rgba(176,109,114,0.45)',
            });
          }
        }

        if (!candleData.length) {
          setError('No price history available.');
          return;
        }

        candles.setData(candleData);
        volume.setData(volumeData);

        if (date) {
          const anchorIso = date;
          const match = candleData.find((c) => c.time >= anchorIso) || candleData[candleData.length - 1];
          createSeriesMarkers(candles, [
            {
              time: match.time,
              position: 'aboveBar',
              color: '#e6b980',
              shape: 'arrowDown',
              text: date,
            },
          ]);

          // Zoom: ~60 bars centered on the anchor.
          const idx = candleData.findIndex((c) => c.time >= anchorIso);
          const centerIdx = idx < 0 ? candleData.length - 1 : idx;
          const half = 30;
          const from = Math.max(0, centerIdx - half);
          const to = Math.min(candleData.length - 1, centerIdx + half);
          chart.timeScale().setVisibleRange({
            from: candleData[from].time,
            to: candleData[to].time,
          });
        } else {
          chart.timeScale().fitContent();
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || String(e));
      });

    return () => {
      cancelled = true;
      chart.remove();
      chartRef.current = null;
    };
  }, [symbol, date]);

  return (
    <div className="tv-chart">
      {error && <div className="tv-chart__error">{error}</div>}
      <div
        ref={containerRef}
        className="tradingview-widget-container"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

function isoDay(d) {
  if (!d) return null;
  if (d instanceof Date) {
    return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : null;
  }
  const parsed = new Date(d);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : null;
}
