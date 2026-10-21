import { createRequest } from '@md/auth-client';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const request = createRequest(API_BASE);

export const api = {
  // Daily totals → [{ date: 'YYYY-MM-DD', seconds, source }]
  getCodingLogs: (from, to) => request(`/coding/logs?from=${from}&to=${to}`),

  // WakaTime connection
  getWakaTimeStatus: () => request('/coding/wakatime/status'),          // { connected, username, lastSyncedAt }
  getWakaTimeConnectUrl: () => request('/coding/wakatime/connect-url'), // { url }
  syncWakaTime: () => request('/coding/wakatime/sync', { method: 'POST' }),
  // Poll until { status: 'done', imported }
  importWakaTimeHistory: () => request('/coding/wakatime/import-history', { method: 'POST' }),
  disconnectWakaTime: () => request('/coding/wakatime', { method: 'DELETE' }),

  // Analytics
  getOverview: (today) => request(`/coding/overview?today=${today}`),
  // kind: 'project' | 'language' | 'editor' | 'category' → { total, items: [{ name, seconds }] }
  getBreakdown: (kind, from, to) => request(`/coding/breakdown?kind=${kind}&from=${from}&to=${to}`),
  setGoal: (dailyMinutes) => request('/coding/goal', { method: 'PUT', body: JSON.stringify({ dailyMinutes }) }),
};

// Login lives in the hub; AuthProvider only needs these if someone calls login() here.
export const authApi = {
  login: () => Promise.reject(new Error('Log in from the Master Dashboard')),
  register: () => Promise.reject(new Error('Register from the Master Dashboard')),
};
