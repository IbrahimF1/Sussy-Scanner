import TradingViewChart from './TradingViewChart.jsx';
import SignalsPanel from './SignalsPanel.jsx';
import NarrativeMixChart from './NarrativeMixChart.jsx';
import NewsPanel from './NewsPanel.jsx';
import KeyStatsPanel from './KeyStatsPanel.jsx';
import SocialPanel from './SocialPanel.jsx';
import SectionCard from './SectionCard.jsx';
import Icon from './Icon.jsx';
import {
  SkeletonSignals,
  SkeletonDonut,
  SkeletonStats,
  SkeletonNews,
} from './Skeleton.jsx';

export default function DashboardGrid({ symbol, date, analysis, loading }) {
  return (
    <div className="dashboard-grid">
      <section className="dashboard-grid__left">
        <div className="dashboard-grid__scroll">
          <div className="dashboard-grid__chart">
            <TradingViewChart symbol={symbol} date={date} />
          </div>

          <SectionCard
            icon={<Icon name="activity" size={18} />}
            title="Risk Signals"
            description={`Multi-score analysis for ${symbol}${date ? ` on ${date}` : ''}. Expand any score to inspect the contributing features.`}
          >
            {loading && !analysis ? <SkeletonSignals /> : <SignalsPanel analysis={analysis} />}
          </SectionCard>

          <SectionCard
            icon={<Icon name="tag" size={18} />}
            title="Post Narratives"
            description="Narrative concentration across the social posts in the selected window."
          >
            {loading && !analysis ? <SkeletonDonut /> : <NarrativeMixChart analysis={analysis} />}
          </SectionCard>

          <SectionCard
            icon={<Icon name="stats" size={18} />}
            title="Key Stats"
            description="Feature inputs computed from market, options, and social activity."
          >
            {loading && !analysis ? <SkeletonStats /> : <KeyStatsPanel analysis={analysis} />}
          </SectionCard>

          <SectionCard
            icon={<Icon name="news" size={18} />}
            title="Credible News"
            description="Filings and major-outlet coverage around the analysis date."
          >
            {loading && !analysis ? <SkeletonNews /> : <NewsPanel analysis={analysis} />}
          </SectionCard>
        </div>
      </section>

      <aside className="dashboard-grid__right">
        <SocialPanel analysis={analysis} loading={loading && !analysis} />
      </aside>
    </div>
  );
}
