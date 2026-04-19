import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const COLORS = {
  meme_hype: '#ff6b7a',
  fundamental_thesis: '#6ee7b7',
  short_squeeze: '#ffc266',
  ai_crypto_buzz: '#d6a5ff',
  coordination_signal: '#ff9b9e',
  skeptic: '#a5c8ff',
  other: '#7b8189',
};

const RISK = {
  meme_hype: 'high',
  coordination_signal: 'high',
  short_squeeze: 'medium',
  ai_crypto_buzz: 'medium',
  fundamental_thesis: 'low',
  skeptic: 'low',
  other: 'neutral',
};

function labelFor(k) {
  return (k || 'other').replace(/_/g, ' ');
}

export default function NarrativeMixChart({ analysis }) {
  const posts = analysis?.posts || [];
  const buckets = aggregate(posts);
  const data = buckets.map((b) => ({ ...b, color: COLORS[b.name] || '#7b8189' }));
  const [active, setActive] = useState(data[0]?.name || null);

  if (!data.length) return <div className="news-panel__empty">No narrative data.</div>;

  const total = data.reduce((a, b) => a + b.value, 0);
  const hhi = data.reduce((a, b) => a + Math.pow(b.value / total, 2), 0);
  const dominant = data[0];
  const diversity = describe(hhi);
  const activeBucket = data.find((d) => d.name === active) || dominant;
  const centerLabelLines = splitCenterLabel(activeBucket.label);

  return (
    <div className="narrative-mix">
      <div className="narrative-mix__stats">
        <div className="narrative-mix__stat">
          <span className="narrative-mix__stat-val">{total}</span>
          <span className="narrative-mix__stat-lbl">posts analyzed</span>
        </div>
        <div className="narrative-mix__stat">
          <span className="narrative-mix__stat-val">
            {Math.round((dominant.value / total) * 100)}%
          </span>
          <span className="narrative-mix__stat-lbl">{dominant.label}</span>
        </div>
        <div
          className="narrative-mix__stat"
          title="HHI ranges 0-1; higher values mean one narrative is dominating the conversation."
        >
          <span className="narrative-mix__stat-val">{hhi.toFixed(2)}</span>
          <span className="narrative-mix__stat-lbl">{diversity}</span>
        </div>
      </div>

      <div className="narrative-mix__viz">
        <div className="narrative-mix__donut-wrap">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius={62}
                outerRadius={102}
                paddingAngle={3}
                stroke="#0b0d10"
                strokeWidth={2}
                onMouseEnter={(d) => setActive(d.name)}
                isAnimationActive={false}
              >
                {data.map((d) => (
                  <Cell
                    key={d.name}
                    fill={d.color}
                    fillOpacity={active && active !== d.name ? 0.35 : 1}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="narrative-mix__donut-center" aria-hidden>
            <div className="narrative-mix__donut-pct">
              {Math.round((activeBucket.value / total) * 100)}%
            </div>
            <div className="narrative-mix__donut-label">
              {centerLabelLines.map((line) => (
                <span key={line} className="narrative-mix__donut-label-line">
                  {line}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="narrative-mix__legend" role="list">
          {data.map((d) => {
            const pct = (d.value / total) * 100;
            const isActive = active === d.name;
            return (
              <button
                key={d.name}
                type="button"
                role="listitem"
                onMouseEnter={() => setActive(d.name)}
                onFocus={() => setActive(d.name)}
                className={`narrative-row ${isActive ? 'narrative-row--active' : ''}`}
              >
                <span className="narrative-row__top">
                  <span
                    className="narrative-row__dot"
                    style={{ background: d.color }}
                    aria-hidden
                  />
                  <span className="narrative-row__label">{d.label}</span>
                  <span className={`narrative-row__risk narrative-row__risk--${RISK[d.name] || 'neutral'}`}>
                    {RISK[d.name] || 'neutral'}
                  </span>
                  <span className="narrative-row__count mono">{d.value}</span>
                </span>
                <span className="narrative-row__bar">
                  <span
                    className="narrative-row__bar-fill"
                    style={{ width: `${pct}%`, background: d.color }}
                  />
                </span>
                <span className="narrative-row__bottom">
                  <span className="narrative-row__metric">
                    <span className="narrative-row__metric-lbl">avg hype</span>
                    <span className="narrative-row__metric-val mono">{d.avgHype.toFixed(2)}</span>
                  </span>
                  <span className="narrative-row__metric">
                    <span className="narrative-row__metric-lbl">bullish</span>
                    <span className="narrative-row__metric-val mono">{Math.round(d.bullishFrac * 100)}%</span>
                  </span>
                  <span className="narrative-row__metric narrative-row__metric--sources">
                    {d.sources.slice(0, 3).join(' / ')}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeBucket?.example && (
        <div className="narrative-mix__example">
          <div className="narrative-mix__example-head">
            <span className="narrative-mix__example-label">
              representative post / {activeBucket.label}
            </span>
            <a
              href={activeBucket.example.url}
              target="_blank"
              rel="noreferrer"
              className="narrative-mix__example-source"
            >
              {activeBucket.example.source} -&gt;
            </a>
          </div>
          <div className="narrative-mix__example-body">
            "{(activeBucket.example.title || activeBucket.example.content || '').slice(0, 220)}"
          </div>
          {activeBucket.example.reasoning && (
            <div className="narrative-mix__example-reason">
              <span className="narrative-mix__example-reason-lbl">why classified this way:</span>{' '}
              {activeBucket.example.reasoning}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function aggregate(posts) {
  const buckets = new Map();
  for (const p of posts) {
    const v = p.verdict || {};
    const name = v.narrative || 'other';
    if (!buckets.has(name)) {
      buckets.set(name, {
        name,
        label: labelFor(name),
        value: 0,
        hypeSum: 0,
        hypeCount: 0,
        bullish: 0,
        sources: new Set(),
        topPost: null,
        topHype: -1,
      });
    }
    const b = buckets.get(name);
    b.value++;
    if (Number.isFinite(v.hype_score)) {
      b.hypeSum += v.hype_score;
      b.hypeCount++;
    }
    if (v.sentiment === 'bullish') b.bullish++;
    if (p.source) b.sources.add(p.source);
    const h = Number.isFinite(v.hype_score) ? v.hype_score : 0;
    if (h > b.topHype) {
      b.topHype = h;
      b.topPost = {
        title: p.title,
        content: p.content,
        url: p.url,
        source: p.source,
        reasoning: v.reasoning,
      };
    }
  }

  return [...buckets.values()]
    .map((b) => ({
      name: b.name,
      label: b.label,
      value: b.value,
      avgHype: b.hypeCount ? b.hypeSum / b.hypeCount : 0,
      bullishFrac: b.value ? b.bullish / b.value : 0,
      sources: [...b.sources],
      example: b.topPost,
    }))
    .sort((a, b) => b.value - a.value);
}

function describe(hhi) {
  if (hhi >= 0.6) return 'narrative dominated';
  if (hhi >= 0.35) return 'narrative concentrated';
  if (hhi >= 0.2) return 'mixed narratives';
  return 'highly diverse';
}

function splitCenterLabel(label) {
  const text = String(label || '').trim();
  if (!text) return ['other'];

  const words = text.split(/\s+/);
  if (words.length === 1 || text.length <= 10) return [text];

  let bestSplit = [text];
  let bestDiff = Number.POSITIVE_INFINITY;

  for (let i = 1; i < words.length; i += 1) {
    const first = words.slice(0, i).join(' ');
    const second = words.slice(i).join(' ');
    const diff = Math.abs(first.length - second.length);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestSplit = [first, second];
    }
  }

  return bestSplit;
}
