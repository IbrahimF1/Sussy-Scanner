import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AnalysisHeader from '../components/AnalysisHeader.jsx';
import DashboardGrid from '../components/DashboardGrid.jsx';
import { fetchAnalysis } from '../services/api.js';

export default function Analysis() {
  const { symbol, date } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    setAnalysis(null);
    setErr(null);
    setLoading(true);
    fetchAnalysis(symbol.toUpperCase(), date || null)
      .then((d) => {
        if (!cancelled) setAnalysis(d);
      })
      .catch((e) => {
        if (!cancelled) setErr(e?.message || String(e));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [symbol, date]);

  const shareUrl = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).catch(() => {});
  };

  return (
    <div className="analysis-page">
      <AnalysisHeader
        symbol={(symbol || '').toUpperCase()}
        date={date || null}
        analysis={analysis}
        onShare={shareUrl}
      />
      {err && <div className="banner banner--error">{err}</div>}
      <DashboardGrid
        symbol={(symbol || '').toUpperCase()}
        date={date || null}
        analysis={analysis}
        loading={loading}
      />
    </div>
  );
}
