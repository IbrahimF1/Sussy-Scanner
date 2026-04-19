import { useEffect, useState } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { fetchTimeline } from '../services/api.js';

export default function TimelineChart({ symbol, date }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!symbol) return;
    setErr(null);
    setData(null);
    fetchTimeline(symbol, date, 60)
      .then((d) => setData(d?.series || []))
      .catch((e) => setErr(String(e?.message || e)));
  }, [symbol, date]);

  if (err) return <div className="panel panel--empty">Timeline unavailable: {err}</div>;
  if (!data) return <div className="panel panel--empty">Loading timeline...</div>;
  if (!data.length) return <div className="panel panel--empty">No timeline data.</div>;

  const withSocial = data.some((d) => d.social_velocity > 0);

  return (
    <div className="timeline-chart panel">
      <div className="panel__title">60-day timeline / {symbol}</div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#262a32" strokeDasharray="2 3" />
          <XAxis dataKey="date" tick={{ fill: '#8e95a3', fontSize: 11 }} minTickGap={32} />
          <YAxis
            yAxisId="price"
            tick={{ fill: '#8e95a3', fontSize: 11 }}
            width={52}
          />
          <YAxis
            yAxisId="vol"
            orientation="right"
            tick={{ fill: '#6e7684', fontSize: 11 }}
            width={52}
          />
          <Tooltip contentStyle={{ background: '#121418', border: '1px solid #262a32', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#8e95a3' }} />
          <Bar yAxisId="vol" dataKey="volume" fill="#262a32" name="volume" isAnimationActive={false} />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="close"
            stroke="#6f84a6"
            strokeWidth={2}
            dot={false}
            name="close"
            isAnimationActive={false}
          />
          {withSocial && (
            <Line
              yAxisId="vol"
              type="monotone"
              dataKey="social_velocity"
              stroke="#b69a5f"
              strokeWidth={1.5}
              dot={false}
              name="social velocity"
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
