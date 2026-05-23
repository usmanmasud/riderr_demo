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
export const fetchDeliveries  = ()           => req('/deliveries');
export const createDelivery   = (data: object) => req('/deliveries', { method: 'POST', body: JSON.stringify(data) });
export const assignRider      = (id: string, riderId: string) =>
  req(`/deliveries/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ riderId }) });
export const cancelDelivery   = (id: string) => req(`/deliveries/${id}/cancel`, { method: 'PATCH' });
export const trackDelivery    = (code: string) => fetch(`${API}/deliveries/track/${code}`).then(r => r.json());
export const fetchAnalytics   = ()           => req('/deliveries/analytics');

// ── Riders ────────────────────────────────────────────────────────────
export const fetchRiders  = ()             => req('/riders');
export const createRider  = (data: object) => req('/riders', { method: 'POST', body: JSON.stringify(data) });
export const updateRider  = (id: string, data: object) => req(`/riders/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteRider  = (id: string)   => req(`/riders/${id}`, { method: 'DELETE' });
