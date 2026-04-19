import axios from 'axios';
import { wrap } from '../services/cache.js';

const ENRICH_TIMEOUT = 6000;
const TTL = 30 * 86400;

const reddit = axios.create({
  timeout: ENRICH_TIMEOUT,
  headers: {
    'User-Agent': 'market-surveillance/0.1 (hackathon prototype)',
    Accept: 'application/json',
  },
});

// Twitter's public syndication endpoint 403s unknown Node-style UAs the
// same way the Yahoo chart endpoint does, so we pose as a browser.
const twitterCdn = axios.create({
  baseURL: 'https://cdn.syndication.twimg.com',
  timeout: ENRICH_TIMEOUT,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'application/json,text/plain,*/*',
  },
});

const stocktwits = axios.create({
  baseURL: 'https://api.stocktwits.com/api/2',
  timeout: ENRICH_TIMEOUT,
  headers: {
    'User-Agent': 'market-surveillance/0.1 (hackathon prototype)',
    Accept: 'application/json',
  },
});

export async function enrichPostTimestamps(posts) {
  if (!Array.isArray(posts) || !posts.length) return posts;

  return Promise.all(
    posts.map(async (post) => {
      if (!shouldEnrich(post)) return post;
      const resolved = await resolvePostMetadata(post.url).catch(() => null);
      if (!resolved) return post;

      return {
        ...post,
        publishedAt: post.publishedAt || resolved.publishedAt || null,
        engagement: post.engagement || resolved.engagement || null,
        _date_source:
          post.publishedAt || !resolved.publishedAt ? post._date_source : 'enriched',
      };
    }),
  );
}

function shouldEnrich(post) {
  if (!post?.url) return false;
  const url = post.url;
  if (/reddit\.com/i.test(url)) return !post.publishedAt || !post.engagement;
  if (/(?:twitter|x)\.com\/[^/]+\/status\/\d+/i.test(url)) {
    return !post.publishedAt || !post.engagement;
  }
  if (/stocktwits\.com\/[^/]+\/message\/\d+/i.test(url)) {
    return !post.publishedAt || !post.engagement;
  }
  return !post.publishedAt;
}

async function resolvePostMetadata(url) {
  if (!url) return null;
  if (/reddit\.com/i.test(url)) return resolveReddit(url);
  if (/(?:twitter|x)\.com/i.test(url)) return resolveTwitter(url);
  if (/stocktwits\.com/i.test(url)) return resolveStockTwits(url);
  return null;
}

async function resolveReddit(url) {
  let target;
  try {
    const parsed = new URL(url);
    parsed.search = '';
    parsed.hash = '';
    target = parsed.toString().replace(/\/$/, '') + '.json';
  } catch {
    return null;
  }

  return wrap(`reddit:meta:${target}`, TTL, async () => {
    const { data } = await reddit.get(target);
    const node = Array.isArray(data) ? data[0] : data;
    const child = node?.data?.children?.[0]?.data;
    const createdUtc = child?.created_utc;
    const upvotes = child?.ups;
    const score = child?.score;
    const comments = child?.num_comments;
    const primaryValue =
      Number.isFinite(upvotes) ? upvotes : Number.isFinite(score) ? score : null;

    return {
      publishedAt: Number.isFinite(createdUtc)
        ? new Date(createdUtc * 1000).toISOString()
        : null,
      engagement:
        primaryValue == null && !Number.isFinite(comments)
          ? null
          : {
              primaryLabel: Number.isFinite(upvotes) ? 'upvotes' : 'score',
              primaryValue,
              secondaryLabel: Number.isFinite(comments) ? 'comments' : null,
              secondaryValue: Number.isFinite(comments) ? comments : null,
            },
    };
  });
}

// Public tweet syndication endpoint (same one the react-tweet library and
// iframely use for embedded tweets). Token is a deterministic hash of the
// snowflake id; no auth required. Returns favorite_count (likes) and
// conversation_count (total replies in the thread).
async function resolveTwitter(url) {
  const id = extractTweetId(url);
  if (!id) return null;

  return wrap(`twitter:meta:${id}`, TTL, async () => {
    const { data } = await twitterCdn.get('/tweet-result', {
      params: { id, token: tweetToken(id), lang: 'en' },
    });
    const likes = numeric(data?.favorite_count);
    const replies = numeric(data?.conversation_count);
    const createdAt = data?.created_at;

    return {
      publishedAt: createdAt ? new Date(createdAt).toISOString() : null,
      engagement:
        likes == null && replies == null
          ? null
          : {
              primaryLabel: likes != null ? 'likes' : 'replies',
              primaryValue: likes != null ? likes : replies,
              secondaryLabel: likes != null && replies != null ? 'replies' : null,
              secondaryValue: likes != null && replies != null ? replies : null,
            },
    };
  });
}

async function resolveStockTwits(url) {
  const id = extractStockTwitsId(url);
  if (!id) return null;

  return wrap(`stocktwits:meta:${id}`, TTL, async () => {
    const { data } = await stocktwits.get(`/messages/show/${id}.json`);
    const m = data?.message;
    if (!m) return null;

    const likes = numeric(m.likes?.total);
    const reshares = numeric(m.reshares?.total);
    const replies = numeric(m.conversation?.replies);
    const secondary =
      replies != null
        ? { label: 'replies', value: replies }
        : reshares != null
          ? { label: 'reshares', value: reshares }
          : null;

    return {
      publishedAt: m.created_at ? new Date(m.created_at).toISOString() : null,
      engagement:
        likes == null && !secondary
          ? null
          : {
              primaryLabel: likes != null ? 'likes' : secondary.label,
              primaryValue: likes != null ? likes : secondary.value,
              secondaryLabel: likes != null && secondary ? secondary.label : null,
              secondaryValue: likes != null && secondary ? secondary.value : null,
            },
    };
  });
}

function extractTweetId(url) {
  const m = String(url).match(/(?:twitter|x)\.com\/[^/]+\/status\/(\d{10,20})/i);
  return m ? m[1] : null;
}

function extractStockTwitsId(url) {
  const m = String(url).match(/stocktwits\.com\/[^/]+(?:\/[^/]+)*\/message\/(\d+)/i);
  return m ? m[1] : null;
}

function tweetToken(id) {
  return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
}

function numeric(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
