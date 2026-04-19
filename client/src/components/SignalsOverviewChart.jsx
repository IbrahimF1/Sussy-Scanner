import {
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

const ORDER = [
  ['pump_risk', 'Pump'],
  ['liquidity', 'Liquidity'],
  ['social_hype', 'Social'],
  ['squeeze', 'Squeeze'],
  ['tech_fragility', 'Tech'],
];

const COLORS = {
  low: '#739883',
  medium: '#bb9464',
  high: '#bb9464',
  extreme: '#b06d72',
};

export default function SignalsOverviewChart({ subscores }) {
  const data = ORDER
    .map(([key, short]) => {
      const score = subscores?.[key]?.score;
      const band = (subscores?.[key]?.band || 'low').toLowerCase();
      return Number.isFinite(score)
        ? { key, short, score: Math.round(score), band }
        : null;
    })
    .filter(Boolean);

  if (!data.length) return null;

  return (
    <div className="signals-overview">
      <div className="signals-overview__label">Sub-score spread</div>
      <div className="signals-overview__chart">
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="short"
              tick={{ fill: '#8d95a1', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#6c7481', fontSize: 10 }}
              width={26}
              axisLine={false}
              tickLine={false}
              ticks={[0, 50, 100]}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              contentStyle={{
                background: '#101318',
                border: '1px solid #21262e',
                borderRadius: 4,
                color: '#eceef2',
                fontSize: 12,
                padding: '8px 10px',
              }}
              labelStyle={{ color: '#eceef2', marginBottom: 2, fontWeight: 600 }}
              itemStyle={{ color: '#eceef2' }}
              formatter={(value, _name, item) => [`${value}/100`, item?.payload?.band?.toUpperCase() || '']}
            />
            <Bar dataKey="score" radius={[2, 2, 0, 0]} isAnimationActive={false}>
              {data.map((entry) => (
                <Cell key={entry.key} fill={COLORS[entry.band] || '#90a5b7'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
