import { useState } from 'react';

export default function ScoreCard({ name, sub, variant = 'default' }) {
  const [open, setOpen] = useState(false);
  const score = sub?.score;
  const band = (sub?.band || 'LOW').toLowerCase();
  const top = sub?.top_contributors || [];
  const hasData = score != null && Number.isFinite(score);

  return (
    <div className={`scorecard scorecard--${band} scorecard--${variant} ${!hasData ? 'scorecard--empty' : ''}`}>
      <button
        type="button"
        className="scorecard__head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="scorecard__identity">
          <span className="scorecard__dot" aria-hidden />
          <div className="scorecard__name-wrap">
            <div className="scorecard__name">{name}</div>
            <div className="scorecard__prompt">{open ? 'Hide detail' : 'Show detail'}</div>
          </div>
        </div>
        <div className="scorecard__value">
          {hasData ? (
            <>
              <span className="scorecard__score">{Math.round(score)}</span>
              <span className="scorecard__band">{sub.band}</span>
            </>
          ) : (
            <span className="scorecard__na">Data unavailable</span>
          )}
        </div>
      </button>

      {hasData && (
        <div className="scorecard__meter" aria-hidden>
          <span className="scorecard__meter-fill" style={{ width: `${Math.min(100, score)}%` }} />
        </div>
      )}

      {hasData && sub?.narrative && <p className="scorecard__narrative">{sub.narrative}</p>}

      {hasData && top.length
        ? variant === 'ledger'
          ? (
            <div className="scorecard__ledger">
              {top.slice(0, open ? top.length : 3).map((c) => (
                <div key={c.feature} className="scorecard__ledger-row">
                  <span className="scorecard__ledger-key">{prettyFeature(c.feature)}</span>
                  <span className="scorecard__ledger-value mono">{fmt(c.value)}</span>
                </div>
              ))}
            </div>
            )
          : (
            <div className={`scorecard__highlights ${variant === 'featured' ? 'scorecard__highlights--grid' : ''}`}>
              {top.slice(0, open ? top.length : variant === 'featured' ? 4 : 2).map((c) => (
                <div key={c.feature} className="scorecard__highlight">
                  <span className="scorecard__highlight-key">{prettyFeature(c.feature)}</span>
                  <span className="scorecard__highlight-value mono">{fmt(c.value)}</span>
                </div>
              ))}
              {!open && top.length > (variant === 'featured' ? 4 : 2) ? (
                <div className="scorecard__highlight scorecard__highlight--more">
                  <span className="scorecard__highlight-key">More signals</span>
                  <span className="scorecard__highlight-value mono">
                    +{top.length - (variant === 'featured' ? 4 : 2)}
                  </span>
                </div>
              ) : null}
            </div>
            )
        : null}

      {open && hasData && top.length ? (
        <div className="scorecard__detail">
          <table className="scorecard__table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Value</th>
                <th>Severity</th>
                <th>Contribution</th>
              </tr>
            </thead>
            <tbody>
              {top.map((c) => (
                <tr key={c.feature}>
                  <td>{prettyFeature(c.feature)}</td>
                  <td className="mono">{fmt(c.value)}</td>
                  <td className="mono">{c.severity}</td>
                  <td className="mono">{(c.contribution * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function prettyFeature(k) {
  return (k || '').replace(/_/g, ' ');
}

function fmt(v) {
  if (v == null) return 'n/a';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1000).toFixed(1)}k`;
  return n.toFixed(2);
}
