export function SkeletonLine({ width = '100%', height = 12, className = '' }) {
  return <span className={`skel ${className}`} style={{ width, height, display: 'inline-block' }} />;
}

export function SkeletonSignals() {
  return (
    <div className="signals">
      <div className="signals__summary signals__summary--skel">
        <div className="signals__summary-main">
          <div className="signals__summary-block">
            <SkeletonLine width="90px" height={10} />
            <div style={{ height: 10 }} />
            <SkeletonLine width="120px" height={36} />
            <div style={{ height: 6 }} />
            <SkeletonLine width="66px" height={12} />
          </div>

          <div className="signals__summary-meta">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="signals__meta-card">
                <SkeletonLine width="70px" height={10} />
                <div style={{ height: 8 }} />
                <SkeletonLine width="90px" height={18} />
                <div style={{ height: 8 }} />
                <SkeletonLine width="100%" height={10} />
                <div style={{ height: 4 }} />
                <SkeletonLine width="80%" height={10} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="signals__cards">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="scorecard scorecard--skel">
            <div className="scorecard__head">
              <SkeletonLine width="58%" height={14} />
              <SkeletonLine width="44px" height={22} />
            </div>
            <SkeletonLine width="100%" height={4} />
            <div style={{ height: 10 }} />
            <SkeletonLine width="96%" height={10} />
            <div style={{ height: 10 }} />
            <div className="scorecard__highlights">
              <SkeletonLine width="48%" height={18} />
              <SkeletonLine width="40%" height={18} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonDonut() {
  return (
    <div className="narrative-mix">
      <div className="narrative-mix__stats">
        <div className="narrative-mix__stat">
          <SkeletonLine width="40px" height={22} />
          <div style={{ height: 4 }} />
          <SkeletonLine width="80px" height={10} />
        </div>
        <div className="narrative-mix__stat">
          <SkeletonLine width="40px" height={22} />
          <div style={{ height: 4 }} />
          <SkeletonLine width="120px" height={10} />
        </div>
        <div className="narrative-mix__stat">
          <SkeletonLine width="40px" height={22} />
          <div style={{ height: 4 }} />
          <SkeletonLine width="100px" height={10} />
        </div>
      </div>
      <div className="skel-donut" />
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="key-stats">
      {Array.from({ length: 4 }).map((_, g) => (
        <div key={g}>
          <div className="stat-group__head">
            <SkeletonLine width="120px" height={12} />
          </div>
          <div className="stat-group__grid">
            {Array.from({ length: 4 }).map((_, t) => (
              <div key={t} className="stat-tile">
                <SkeletonLine width="60%" height={10} />
                <div style={{ height: 6 }} />
                <SkeletonLine width="70%" height={18} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonNews() {
  return (
    <ul className="news-panel__list">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="news-panel__item">
          <div className="news-panel__meta">
            <SkeletonLine width="50px" height={10} />
            <SkeletonLine width="80px" height={10} />
          </div>
          <SkeletonLine width={`${60 + ((i * 13) % 35)}%`} height={14} />
        </li>
      ))}
    </ul>
  );
}

export function SkeletonSocial() {
  return (
    <div className="social-panel__list">
      {Array.from({ length: 6 }).map((_, i) => (
        <article key={i} className="post">
          <div className="post__meta">
            <SkeletonLine width="70px" height={10} />
            <SkeletonLine width="90px" height={10} />
          </div>
          <SkeletonLine width="92%" height={13} />
          <SkeletonLine width={`${70 + ((i * 11) % 25)}%`} height={13} />
          <div className="post__tags">
            <SkeletonLine width="70px" height={18} />
            <SkeletonLine width="64px" height={18} />
          </div>
        </article>
      ))}
    </div>
  );
}
