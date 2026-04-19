import ScoreCard from './ScoreCard.jsx';
import SimilarityCallout from './SimilarityCallout.jsx';
import SignalsOverviewChart from './SignalsOverviewChart.jsx';

const ORDER = [
  ['pump_risk', 'Pump Risk'],
  ['social_hype', 'Social Hype'],
  ['liquidity', 'Liquidity Stress'],
  ['squeeze', 'Squeeze Pressure'],
  ['tech_fragility', 'Tech Fragility'],
];

const VARIANTS = {
  pump_risk: 'featured',
  liquidity: 'ledger',
  social_hype: 'featured',
  squeeze: 'ledger',
  tech_fragility: 'compact',
};

const MISSING_LABELS = {
  posts_analyzed: 'posts',
  credible_news: 'news',
  ohlcv_history: 'price history',
  short_interest: 'short interest',
  options_chain: 'options',
  intraday_data: 'intraday',
};

export default function SignalsPanel({ analysis }) {
  if (!analysis) {
    return (
      <div className="signals signals--loading">
        <div className="signals__placeholder">Waiting for analysis...</div>
      </div>
    );
  }

  const subs = analysis.subscores || {};
  const composite = analysis.composite || {};
  const confidence = analysis.confidence || {};
  const similarity = analysis.similarity;
  const band = (composite.band || 'GREEN').toLowerCase();
  const confidenceBand = (confidence.band || 'LOW').toLowerCase();

  return (
    <div className="signals">
      <div className={`signals__summary signals__summary--${band}`}>
        <div className="signals__summary-main">
          <div className="signals__summary-block">
            <div className="signals__summary-label">Composite risk</div>
            <div className="signals__summary-number">
              {composite.composite ?? '-'}
              <span className="signals__summary-denom">/100</span>
            </div>
            <div className="signals__summary-band">{composite.band || 'unknown'}</div>
            <SignalsOverviewChart subscores={subs} />
          </div>

          <div className="signals__summary-meta">
            <div className="signals__meta-card signals__meta-card--confidence">
              <div className="signals__meta-label">Confidence</div>
              <div className={`signals__meta-value signals__meta-value--${confidenceBand}`}>
                {confidence.band || 'LOW'}
              </div>
              {confidence.missing_inputs?.length ? (
                <div
                  className="signals__meta-missing"
                  title={`Missing: ${confidence.missing_inputs.join(', ')}`}
                >
                  <span className="signals__meta-missing-label">Missing</span>
                  {confidence.missing_inputs.map((input) => (
                    <span key={input} className="signals__meta-missing-chip">
                      {MISSING_LABELS[input] || input.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="signals__meta-subtle">All primary inputs available</div>
              )}
            </div>

            <div className="signals__meta-card signals__meta-card--similarity">
              <SimilarityCallout similarity={similarity} />
            </div>

            <div className="signals__meta-card signals__meta-card--language">
              <div className="signals__meta-label">Language</div>
              <div className="signals__meta-copy">
                We surface anomalous coordination patterns and elevated pump risk, not a
                declarative claim of manipulation.
              </div>
            </div>

            {composite.correlation_cap_applied && (
              <div className="signals__meta-card signals__meta-card--cap">
                <div className="signals__meta-label">Composite cap</div>
                <div className="signals__meta-copy">
                  Correlation cap applied to avoid overstating stacked signals.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="signals__cards">
        {ORDER.map(([key, label]) => (
          <ScoreCard key={key} name={label} sub={subs[key]} variant={VARIANTS[key]} />
        ))}
      </div>
    </div>
  );
}
