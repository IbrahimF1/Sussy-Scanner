import axios from 'axios';
import { wrap } from '../services/cache.js';

const TAVILY_URL = 'https://api.tavily.com/search';

const SOCIAL_DOMAINS = [
  'reddit.com',
  'twitter.com',
  'x.com',
  'stocktwits.com',
];

const CREDIBLE_NEWS_DOMAINS = [
  'reuters.com',
  'bloomberg.com',
  'wsj.com',
  'sec.gov',
  'cnbc.com',
  'nytimes.com',
  'ft.com',
  'marketwatch.com',
];

async function tavily({ query, includeDomains, startDate, endDate, maxResults = 25 }) {
  const body = {
    api_key: process.env.TAVILY_API_KEY,
    query,
    search_depth: 'basic',
    include_answer: false,
    include_raw_content: false,
    max_results: maxResults,
  };
  if (includeDomains && includeDomains.length) body.include_domains = includeDomains;
  if (startDate) body.start_date = startDate;
  if (endDate) body.end_date = endDate;

  const { data } = await axios.post(TAVILY_URL, body, { timeout: 15000 });
  return (data.results || []).map((r) => ({
    title: r.title,
    url: r.url,
    content: r.content,
    // Tavily often omits dates for social posts; fall back to URL parsing
    // (Twitter/X snowflake IDs and t.me/Reddit comment IDs encode them).
    publishedAt: r.published_date || dateFromUrl(r.url),
    score: r.score,
    source: domainOf(r.url),
  }));
}

const TWITTER_EPOCH = 1288834974657n;

function dateFromUrl(url) {
  if (!url) return null;
  // Twitter / X status URLs: /USER/status/SNOWFLAKE_ID
  const xm = url.match(/(?:twitter|x)\.com\/[^/]+\/status\/(\d{10,20})/i);
  if (xm) {
    try {
      const ms = Number((BigInt(xm[1]) >> 22n) + TWITTER_EPOCH);
      if (Number.isFinite(ms) && ms > 1262304000000) return new Date(ms).toISOString();
    } catch {}
  }
  return null;
}

export async function searchSocial(symbol, { startDate, endDate, maxResults = 40 } = {}) {
  const key = `tavily-social:${symbol}:${startDate || 'live'}:${endDate || 'live'}:${maxResults}`;
  const ttl = startDate ? 30 * 86400 : 3600;
  return wrap(key, ttl, () =>
    tavily({
      query: `${symbol} stock`,
      includeDomains: SOCIAL_DOMAINS,
      startDate,
      endDate,
      maxResults,
    }),
  );
}

export async function searchCredibleNews(
  symbol,
  { startDate, endDate, maxResults = 15 } = {},
) {
  const key = `tavily-news:${symbol}:${startDate || 'live'}:${endDate || 'live'}:${maxResults}`;
  const ttl = startDate ? 30 * 86400 : 3600;
  return wrap(key, ttl, () =>
    tavily({
      query: `${symbol} stock news`,
      includeDomains: CREDIBLE_NEWS_DOMAINS,
      startDate,
      endDate,
      maxResults,
    }),
  );
}

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
