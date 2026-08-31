import axios from 'axios';

/**
 * Backend is mounted under /api, while all application routes are versioned
 * as /v1/....  Keep EXPO_PUBLIC_API_URL as the Render origin (or a URL that
 * already ends in /api) and normalize it here so the app never calls /v1
 * directly on the web-service root.
 */
function normalizeApiBaseUrl(value?: string) {
  let base = (value || 'https://chit-management-app.onrender.com').trim().replace(/\/+$/, '');
  if (base.endsWith('/api/v1')) base = base.slice(0, -3); // -> /api
  if (!base.endsWith('/api')) base += '/api';
  return base;
}

export const API_BASE_URL = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_URL);

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export function setAccessToken(token: string) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

api.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  config.headers['X-Request-Id'] = `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  config.headers['X-Client-Version'] = '1.0.1';
  return config;
});
