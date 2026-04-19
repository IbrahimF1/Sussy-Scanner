import { useMemo, useState } from 'react';
import Icon from './Icon.jsx';
import { SkeletonSocial } from './Skeleton.jsx';

const SORTS = {
  hype: (a, b) => (b.verdict?.hype_score ?? 0) - (a.verdict?.hype_score ?? 0),
  recency: (a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')),
  source: (a, b) => String(a.source || '').localeCompare(String(b.source || '')),
};

export default function SocialPanel({ analysis, loading }) {
  const [sort, setSort] = useState('hype');
  const [expanded, setExpanded] = useState(new Set());

  const posts = useMemo(() => {
    const list = (analysis?.posts || []).slice();
    list.sort(SORTS[sort]);
    return list;
  }, [analysis, sort]);

  const toggle = (i) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  const anchorDate = analysis?.date;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <aside className="social-panel">
      <div className="social-panel__head">
        <span className="social-panel__title">
          Social feed <span className="social-panel__count">{loading ? '...' : `${posts.length} posts`}</span>
        </span>
        <label className="social-panel__sort">
          <Icon name="arrow" size={11} />
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="hype">hype</option>
            <option value="recency">recency</option>
            <option value="source">source</option>
          </select>
        </label>
      </div>
      <div className="social-panel__list">
        {loading ? (
          <SkeletonSocial />
        ) : posts.length === 0 ? (
          <div className="social-panel__empty">No posts in this window.</div>
        ) : (
          posts.map((p, i) => {
            const v = p.verdict || {};
            const hype = Number.isFinite(v.hype_score) ? v.hype_score : null;
            const narrativeClass = `narrative narrative--${v.narrative || 'other'}`;
            const exact = fmtDateTime(p.publishedAt);
            const fallback = anchorDate || today;
            const showFallback = !exact;
            const engagement = formatEngagement(p.engagement);

            return (
              <article key={`${p.url}-${i}`} className="post">
                <div className="post__meta">
                  <span className="post__source">{p.source || 'unknown'}</span>
                  <span className="post__dot"> / </span>
                  <span
                    className={`post__date ${showFallback ? 'post__date--approx' : ''}`}
                    title={exact ? p.publishedAt : `Source did not provide a timestamp; using analysis date (${fallback})`}
                  >
                    <Icon name="clock" size={10} />
                    <span>{exact || fmtDateOnly(fallback)}</span>
                  </span>
                </div>

                <a href={p.url} target="_blank" rel="noreferrer" className="post__title">
                  {p.title || p.content?.slice(0, 120) || '(untitled)'}
                </a>

                {engagement.length > 0 && (
                  <div className="post__engagement" aria-label="Engagement">
                    {engagement.map((item, index) => (
                      <span key={`${item.label}-${index}`} className="post__engagement-item">
                        <span className="post__engagement-value mono">{item.value}</span>
                        <span className="post__engagement-label">{item.label}</span>
                      </span>
                    ))}
                  </div>
                )}

                <div className="post__tags">
                  {v.narrative && (
                    <span className={narrativeClass}>{v.narrative.replace(/_/g, ' ')}</span>
                  )}
                  {hype != null && (
                    <span className={`post__hype post__hype--${bucket(hype)}`}>
                      hype {hype.toFixed(2)}
                    </span>
                  )}
                </div>

                {v.reasoning && (
                  <button type="button" className="post__info" onClick={() => toggle(i)}>
                    <Icon name="info" size={11} />
                    <span>why this was flagged</span>
                  </button>
                )}

                {expanded.has(i) && v.reasoning && (
                  <div className="post__reason">{v.reasoning}</div>
                )}
              </article>
            );
          })
        )}
      </div>
    </aside>
  );
}

function fmtDateTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function fmtDateOnly(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function bucket(h) {
  if (h >= 0.8) return 'extreme';
  if (h >= 0.6) return 'high';
  if (h >= 0.3) return 'med';
  return 'low';
}

function formatEngagement(engagement) {
  if (!engagement) return [];
  const items = [];

  if (Number.isFinite(engagement.primaryValue) && engagement.primaryLabel) {
    items.push({
      label: engagement.primaryLabel,
      value: compactNumber(engagement.primaryValue),
    });
  }

  if (Number.isFinite(engagement.secondaryValue) && engagement.secondaryLabel) {
    items.push({
      label: engagement.secondaryLabel,
      value: compactNumber(engagement.secondaryValue),
    });
  }

  return items;
}

function compactNumber(value) {
  return new Intl.NumberFormat('en-US', {
    notation: value >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}
