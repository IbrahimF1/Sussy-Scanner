import Icon from './Icon.jsx';

export default function NewsPanel({ analysis }) {
  const news = analysis?.news || [];
  if (!news.length) return <div className="news-panel__empty">No credible news in this window.</div>;

  const anchorDate = analysis?.date;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <ul className="news-panel__list">
      {news.map((n, i) => {
        const exact = fmtDateTime(n.publishedAt);
        const fallback = anchorDate || today;
        const showFallback = !exact;

        return (
          <li key={i} className="news-panel__item">
            <div className="news-panel__meta">
              <span className="news-panel__source">{n.source || n.outlet || 'news'}</span>
              <span className="news-panel__dot"> / </span>
              <span
                className={`news-panel__date ${showFallback ? 'news-panel__date--approx' : ''}`}
                title={exact ? n.publishedAt : `Source did not provide a timestamp; using analysis date (${fallback})`}
              >
                <Icon name="clock" size={10} />
                <span>{exact || fmtDateOnly(fallback)}</span>
              </span>
            </div>
            <a href={n.url} target="_blank" rel="noreferrer" className="news-panel__title">
              {n.title || n.url}
            </a>
          </li>
        );
      })}
    </ul>
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
