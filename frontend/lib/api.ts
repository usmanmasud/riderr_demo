import Cookies from 'js-cookie';

const API = process.env.NEXT_PUBLIC_API_URL;

function getToken() { return Cookies.get('riderr_token'); }

async function req(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────
export const loginUser    = (email: string, password: string) =>
  req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const registerUser = (data: object) =>
  req('/auth/register', { method: 'POST', body: JSON.stringify(data) });
export const fetchMe = (token: string) =>
  fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());

// ── Deliveries ────────────────────────────────────────────────────────
export const fetchDeliveries  = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return req(`/deliveries${qs}`);
};
export const createDelivery   = (data: object) => req('/deliveries', { method: 'POST', body: JSON.stringify(data) });
export const assignRider      = (id: string, riderId: string) =>
  req(`/deliveries/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ riderId }) });
export const updateDeliveryStatus = (id: string, status: string) =>
  req(`/deliveries/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const cancelDelivery   = (id: string) => req(`/deliveries/${id}/cancel`, { method: 'PATCH' });
export const trackDelivery    = (code: string) => fetch(`${API}/deliveries/track/${code}`).then(r => r.json());
export const fetchAnalytics   = () => req('/deliveries/analytics');
export const rateDelivery     = (id: string, score: number, comment: string) =>
  req(`/deliveries/${id}/rate`, { method: 'POST', body: JSON.stringify({ score, comment }) });
export const exportDeliveries = () => {
  const token = getToken();
  return fetch(`${API}/deliveries/export`, { headers: { Authorization: `Bearer ${token}` } });
};

// ── Riders ────────────────────────────────────────────────────────────
export const fetchRiders    = ()             => req('/riders');
export const fetchRiderMe   = ()             => req('/riders/me');
export const fetchRiderJobs = (status?: string) => req(`/riders/me/deliveries${status ? `?status=${status}` : ''}`);
export const createRider    = (data: object) => req('/riders', { method: 'POST', body: JSON.stringify(data) });
export const updateRider    = (id: string, data: object) => req(`/riders/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteRider    = (id: string)   => req(`/riders/${id}`, { method: 'DELETE' });

// ── Users (admin) ─────────────────────────────────────────────────────
export const fetchUsers  = ()             => req('/users');
export const updateUser  = (id: string, data: object) => req(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteUser  = (id: string)   => req(`/users/${id}`, { method: 'DELETE' });
