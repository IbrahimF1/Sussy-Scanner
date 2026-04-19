import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import Logo from './Logo.jsx';

export default function AnalysisHeader({ symbol, date, onShare }) {
  const navigate = useNavigate();
  const isLive = !date;
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(symbol);
  const inputRef = useRef(null);

  useEffect(() => {
    setSearchValue(symbol);
  }, [symbol]);

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [searchOpen]);

  const submit = (e) => {
    e.preventDefault();
    const t = (searchValue || '').trim().toUpperCase();
    if (!t) return;
    if (t === symbol) {
      setSearchOpen(false);
      return;
    }
    if (date) navigate(`/t/${t}/${date}`);
    else navigate(`/t/${t}`);
    setSearchOpen(false);
  };

  const cancel = () => {
    setSearchValue(symbol);
    setSearchOpen(false);
  };

  const setLive = () => {
    if (!isLive) navigate(`/t/${symbol}`);
  };

  const setHistorical = () => {
    if (isLive) navigate(`/t/${symbol}/2021-01-27`);
  };

  const changeDate = (newDate) => {
    if (newDate) navigate(`/t/${symbol}/${newDate}`);
  };

  return (
    <header className="analysis-topbar">
      <div className="analysis-topbar__left">
        <Link to="/" className="analysis-topbar__home" title="Back to landing">
          <Logo size={22} />
        </Link>

        <div className="analysis-topbar__ticker-block">
          <span className="analysis-topbar__label">Ticker</span>
          {searchOpen ? (
            <form onSubmit={submit} className="ticker-search">
              <Icon name="search" size={13} className="ticker-search__icon" />
              <input
                ref={inputRef}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') cancel();
                }}
                onBlur={cancel}
                placeholder="Ticker"
                className="ticker-search__input"
                aria-label="Search ticker"
                maxLength={8}
              />
            </form>
          ) : (
            <button
              type="button"
              className="analysis-topbar__ticker"
              onClick={() => setSearchOpen(true)}
              title="Switch ticker"
            >
              <span className="analysis-topbar__ticker-text">{symbol}</span>
              <Icon name="search" size={12} className="analysis-topbar__ticker-icon" />
            </button>
          )}
        </div>

        <div className="analysis-topbar__status">
          <span className="analysis-topbar__label">Mode</span>
          <span className="analysis-topbar__status-value">
            {isLive ? 'Live analysis' : 'Historical replay'}
          </span>
        </div>
      </div>

      <div className="analysis-topbar__right">
        <div className="segmented" role="group" aria-label="Analysis mode">
          <button
            type="button"
            className={`segmented__btn ${isLive ? 'segmented__btn--active' : ''}`}
            onClick={setLive}
            aria-pressed={isLive}
          >
            Live
          </button>
          <button
            type="button"
            className={`segmented__btn ${!isLive ? 'segmented__btn--active' : ''}`}
            onClick={setHistorical}
            aria-pressed={!isLive}
          >
            Historical
          </button>
        </div>

        {date && (
          <label className="analysis-topbar__date-wrap">
            <span className="analysis-topbar__label">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => changeDate(e.target.value)}
              className="analysis-topbar__date"
              aria-label="Analysis date"
            />
          </label>
        )}

        <button
          type="button"
          className="analysis-topbar__share"
          onClick={onShare}
          title="Copy shareable URL"
        >
          <span>share</span>
          <Icon name="share" size={13} />
        </button>
      </div>
    </header>
  );
}
