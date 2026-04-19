export default function TabsBar({ tabs, active, onChange }) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`tabs__tab ${active === t.id ? 'tabs__tab--active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
