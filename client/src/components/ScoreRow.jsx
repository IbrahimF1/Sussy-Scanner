import { useState } from 'react';

export default function ScoreRow({ name, sub }) {
  const [open, setOpen] = useState(false);
  const score = sub?.score;
  const band = sub?.band || 'LOW';
  const top = sub?.top_contributors || [];

  const inline = top
    .slice(0, 2)
    .map((c) => `${shortenFeature(c.feature)} ${fmt(c.value)}`)
    .join(' · ');

  return (
    <div className={`score-row score-row--${band.toLowerCase()}`}>
      <button
        type="button"
        className="score-row__main"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="score-row__dot" aria-hidden />
        <span className="score-row__name">{name}</span>
        <span className="score-row__score">{score == null ? '—' : score}</span>
        <span className="score-row__band">{band}</span>
        <span className="score-row__top">{inline}</span>
      </button>
      {open && (
        <div className="score-row__why">
          {sub?.narrative ? <p className="score-row__narrative">{sub.narrative}</p> : null}
          {top.length ? (
            <table className="score-row__contributors">
              <thead>
                <tr>
                  <th>feature</th>
                  <th>value</th>
                  <th>severity</th>
                  <th>contribution</th>
                </tr>
              </thead>
              <tbody>
                {top.map((c) => (
                  <tr key={c.feature}>
                    <td>{c.feature}</td>
                    <td className="mono">{fmt(c.value)}</td>
                    <td className="mono">{c.severity}</td>
                    <td className="mono">{(c.contribution * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      )}
    </div>
  );
}

function shortenFeature(k) {
  return (k || '').replace(/_/g, ' ').replace(/\s+/g, ' ');
}

function fmt(v) {
  if (v == null) return 'n/a';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1000).toFixed(1) + 'k';
  return n.toFixed(2);
}
