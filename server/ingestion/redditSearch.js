import axios from 'axios';
import { wrap } from '../services/cache.js';

// Supplements Tavily with Reddit's public search endpoint. For historical
// meme-stock events Reddit's top-all-time results are packed with the
// actual squeeze-day threads (GME Jan 2021 etc.), which Tavily's current
// index indexes poorly. We filter client-side by created_utc since
// Reddit's `t=` time filter doesn't accept arbitrary date ranges.

const client = axios.create({
  baseURL: 'https://www.reddit.com',
  timeout: 8000,
  headers: {
    'User-Agent': 'market-surveillance/0.1 (hackathon prototype)',
    Accept: 'application/json',
  },
});

const DEFAULT_LIMIT = 100;

export async function searchReddit(symbol, { startDate, endDate, limit = DEFAULT_LIMIT } = {}) {
  const key = `reddit-search:${symbol}:${startDate || 'live'}:${endDate || 'live'}:${limit}`;
  const ttl = startDate ? 30 * 86400 : 3600;
  return wrap(key, ttl, async () => {
    const [siteWide, wsb] = await Promise.all([
      fetchListing('/search.json', { q: symbol, sort: 'top', t: 'all', limit }),
      fetchListing('/r/wallstreetbets/search.json', {
        q: symbol,
        restrict_sr: 1,
        sort: 'top',
        t: 'all',
        limit,
      }),
    ]);

    const merged = dedupe([...wsb, ...siteWide]);
    const filtered = filterByDateRange(merged, startDate, endDate);
    return filtered.map(toPost);
  });
}

async function fetchListing(path, params) {
  try {
    const { data } = await client.get(path, { params });
    const children = data?.data?.children || [];
    return children.map((c) => c.data).filter(Boolean);
  } catch (err) {
    console.warn('[redditSearch]', path, 'failed:', err?.message || err);
    return [];
  }
}

function dedupe(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const id = item?.id || item?.name;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}

function filterByDateRange(items, startDate, endDate) {
  if (!startDate && !endDate) return items;
  const start = startDate ? Date.parse(`${startDate}T00:00:00Z`) : -Infinity;
  const end = endDate ? Date.parse(`${endDate}T23:59:59Z`) : Infinity;
  return items.filter((p) => {
    const ms = Number(p.created_utc) * 1000;
    return Number.isFinite(ms) && ms >= start && ms <= end;
  });
}

function toPost(item) {
  const permalink = item.permalink
    ? `https://www.reddit.com${item.permalink}`
    : item.url || null;
  const body = item.selftext || item.title || '';
  return {
    title: item.title || '',
    url: permalink,
    content: body,
    publishedAt: Number.isFinite(item.created_utc)
      ? new Date(Number(item.created_utc) * 1000).toISOString()
      : null,
    source: 'reddit.com',
    engagement: {
      primaryLabel: 'upvotes',
      primaryValue: Number.isFinite(item.ups) ? item.ups : (item.score || null),
      secondaryLabel: Number.isFinite(item.num_comments) ? 'comments' : null,
      secondaryValue: Number.isFinite(item.num_comments) ? item.num_comments : null,
    },
    _date_source: 'reddit',
  };
}
