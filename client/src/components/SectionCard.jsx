// Quiver-style titled card: icon + title + description + content.
// All panels on the scrollable left column use this for visual consistency.

export default function SectionCard({ icon, title, description, right, children, className = '' }) {
  return (
    <section className={`section-card ${className}`}>
      <header className="section-card__head">
        <div className="section-card__headline">
          {icon ? <span className="section-card__icon" aria-hidden>{icon}</span> : null}
          <h2 className="section-card__title">{title}</h2>
        </div>
        {right ? <div className="section-card__right">{right}</div> : null}
      </header>
      {description ? <p className="section-card__desc">{description}</p> : null}
      <div className="section-card__body">{children}</div>
    </section>
  );
}
