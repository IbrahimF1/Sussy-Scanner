import { useState } from 'react';

export default function SimilarityCallout({ similarity }) {
  const [open, setOpen] = useState(false);
  if (!similarity) return null;
  if (!similarity.anchors_available) {
    return (
      <div className="similarity similarity--unavailable">
        <div className="similarity__label">historical match</div>
        <div className="similarity__value">anchors unavailable</div>
      </div>
    );
  }
  const best = similarity.best_match;
  if (!best) return null;
  const others = (similarity.all_matches || []).slice(1);

  return (
    <div className="similarity">
      <div className="similarity__label">Most similar past event</div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="similarity__primary"
      >
        <span className="similarity__name">{best.label}</span>
        <span className="similarity__pct">{best.similarity_pct}%</span>
        <span className="similarity__hint">{open ? 'hide' : 'see all'}</span>
      </button>
      {open && (
        <div className="similarity__list">
          {others.map((m) => (
            <div key={`${m.ticker}-${m.date}`} className="similarity__row">
              <span className="similarity__row-label">{m.label}</span>
              <span className="similarity__row-pct mono">{m.similarity_pct}%</span>
            </div>
          ))}
          {best.top_shared_features?.length ? (
            <div className="similarity__features">
              <div className="similarity__features-head">top shared features with {best.ticker}</div>
              {best.top_shared_features.slice(0, 3).map((f) => (
                <div key={f.feature} className="similarity__feature">
                  <span>{f.feature.replace(/_/g, ' ')}</span>
                  <span className="mono">{f.contribution}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
