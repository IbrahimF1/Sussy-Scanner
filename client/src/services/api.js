import axios from 'axios';

// The single translation point between the frontend's path-param routes
// (/t/:symbol/:date) and the backend's query-param convention (?date=).
// The rest of the client imports from here.

const api = axios.create({ baseURL: '/api', timeout: 180000 });

export async function fetchPresets() {
  const { data } = await api.get('/presets');
  return data;
}

export async function fetchAnalysis(symbol, date) {
  const { data } = await api.get(`/analysis/${symbol}`, {
    params: date ? { date } : {},
  });
  return data;
}

export async function fetchSimilarity(symbol, date) {
  const { data } = await api.get(`/similarity/${symbol}`, {
    params: date ? { date } : {},
  });
  return data;
}

export async function fetchTimeline(symbol, date, windowDays = 60) {
  const { data } = await api.get(`/timeline/${symbol}`, {
    params: { ...(date ? { date } : {}), window: windowDays },
  });
  return data;
}

export async function fetchNews(symbol, date, windowDays = 7) {
  const { data } = await api.get(`/news/${symbol}`, {
    params: { ...(date ? { date } : {}), window: windowDays },
  });
  return data;
}

export async function searchTicker(q) {
  const { data } = await api.get('/stock/search', { params: { q } });
  return data;
}

export async function fetchHistory(symbol, { period1, period2, interval = '1d' } = {}) {
  const { data } = await api.get(`/stock/history/${symbol}`, {
    params: {
      ...(period1 ? { period1: toIso(period1) } : {}),
      ...(period2 ? { period2: toIso(period2) } : {}),
      interval,
    },
  });
  return data;
}

function toIso(d) {
  if (d instanceof Date) return d.toISOString();
  return String(d);
}
