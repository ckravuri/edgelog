import { API_URL } from '../config';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'edgelog_session_token';

export async function getToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function authHeaders() {
  const token = await getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function apiFetch(endpoint, options = {}) {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  return res;
}

export async function apiGet(endpoint) {
  const res = await apiFetch(endpoint);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function apiPost(endpoint, body) {
  const res = await apiFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res;
}

export async function apiPut(endpoint, body) {
  const res = await apiFetch(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function apiDelete(endpoint) {
  const res = await apiFetch(endpoint, { method: 'DELETE' });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// Auth
export async function getMe() {
  return apiGet('/auth/me');
}

export async function createSession(sessionId) {
  const res = await fetch(`${API_URL}/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) throw new Error('Auth failed');
  return res.json();
}

export async function storeNativeToken(authRequestId, sessionToken) {
  return fetch(`${API_URL}/auth/native/store`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ auth_request_id: authRequestId, session_token: sessionToken }),
  });
}

export async function retrieveNativeToken(authRequestId) {
  return fetch(`${API_URL}/auth/native/retrieve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ auth_request_id: authRequestId }),
  });
}

export async function logout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch {}
  await removeToken();
}

// Trades
export async function getTrades() { return apiGet('/trades'); }
export async function getTodayTrades() { return apiGet('/trades/today'); }
export async function createTrade(data) {
  const res = await apiPost('/trades', data);
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Failed'); }
  return res.json();
}
export async function updateTrade(tradeId, data) { return apiPut(`/trades/${tradeId}`, data); }
export async function deleteTrade(tradeId) { return apiDelete(`/trades/${tradeId}`); }

// Analytics
export async function getAnalyticsSummary() { return apiGet('/analytics/summary'); }
export async function getDailyAnalytics() { return apiGet('/analytics/daily'); }

// Reports
export async function generateReport(period = 'weekly') {
  const res = await apiPost(`/reports/generate?period=${period}`, {});
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Failed'); }
  return res.json();
}
export async function getReports() { return apiGet('/reports'); }

// Subscription
export async function getSubscriptionStatus() { return apiGet('/subscription/status'); }

// Settings
export async function updateDiscipline(maxTrades) {
  return apiPut('/settings/discipline', { max_trades_per_day: maxTrades });
}
