import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchPresets } from '../services/api.js';
import Icon from '../components/Icon.jsx';
import Logo from '../components/Logo.jsx';

const FALLBACK_PRESETS = [
  { ticker: 'GME', date: '2021-01-27', label: 'GameStop short squeeze' },
  { ticker: 'AMC', date: '2021-06-02', label: 'AMC ape rally' },
  { ticker: 'DWAC', date: '2021-10-22', label: 'Trump SPAC pump' },
  { ticker: 'BBBY', date: '2022-08-16', label: 'Bed Bath meme revival' },
  { ticker: 'SMCI', date: '2024-03-08', label: 'Super Micro AI spike' },
];

export default function Landing() {
  const [ticker, setTicker] = useState('');
  const [presets, setPresets] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPresets()
      .then((data) => setPresets(Array.isArray(data) && data.length ? data : FALLBACK_PRESETS))
      .catch(() => setPresets(FALLBACK_PRESETS));
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const t = ticker.trim().toUpperCase();
    if (t) navigate(`/t/${t}`);
  };

  const visiblePresets = presets.slice(0, 4);

  return (
    <div className="landing">
      <div className="landing__frame">
        <header className="landing__header">
          <span className="wordmark">
            <Logo size={28} className="wordmark__logo" />
            Sussy Scanner
          </span>
          <nav className="landing__meta">
            <span>investor protection</span>
            <span>suspicious behavior screening</span>
          </nav>
        </header>

        <main className="landing__main">
          <section className="landing__panel">
            <div className="landing__copy">
              <h1 className="landing__prompt">What ticker do you want to investigate?</h1>
              <p className="landing__lede">
                Scan a ticker for unusual market and social behavior that may you at risk.
              </p>
            </div>

            <form onSubmit={submit} className="landing__form">
              <input
                autoFocus
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="GME"
                className="landing__input"
                aria-label="Stock ticker"
              />
              <button type="submit" className="landing__submit">
                scan ticker
              </button>
            </form>

            <section className="landing__presets">
              <div className="landing__presets-head">
                <span className="landing__presets-icon">
                  <Icon name="trendingUp" size={13} />
                </span>
                <div className="landing__presets-label">Historical case studies</div>
              </div>
              <p className="landing__presets-copy">
                Review known spikes to see how the scanner flags unusual behavior that can put investors at risk.
              </p>
              <div className="landing__presets-grid">
                {visiblePresets.map((p) => (
                  <Link key={`${p.ticker}-${p.date}`} to={`/t/${p.ticker}/${p.date}`}>
                    <span className="landing__preset-main">
                      <strong>{p.ticker}</strong>
                      <span className="landing__preset-text">{p.label || 'Historical replay'}</span>
                    </span>
                    <span className="date">{formatPresetDate(p.date)}</span>
                  </Link>
                ))}
              </div>
            </section>
          </section>
        </main>
      </div>
    </div>
  );
}

function formatPresetDate(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
