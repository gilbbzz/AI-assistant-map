// src/services/api.js – Semua pemanggilan API ke backend RouteAI
// FIX: Ditambahkan publicApi untuk endpoint publik (live share) yang tidak butuh auth.
//      Sebelumnya getLiveShare bisa gagal karena token tidak ada di header.
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ── Axios instance dengan auth ────────────────────────────────────────
const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

// ── Axios instance TANPA auth (untuk endpoint publik) ─────────────────
const publicApi = axios.create({ baseURL: BASE_URL, timeout: 15000 });

// ── Request interceptor: inject JWT token ────────────────────────────
api.interceptors.request.use(config => {
  const token = localStorage.getItem('routeai_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor: auto-refresh token on 401 ─────────────────
api.interceptors.response.use(
  res => res,
  async err => {
    const originalRequest = err.config;
    if (
      err.response?.status === 401 &&
      err.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        const refresh = localStorage.getItem('routeai_refresh');
        if (!refresh) throw new Error('No refresh token');
        const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: refresh });
        const { token: newToken, refreshToken: newRefresh } = res.data.data;
        localStorage.setItem('routeai_token', newToken);
        if (newRefresh) localStorage.setItem('routeai_refresh', newRefresh);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        localStorage.clear();
        window.location.href = '/auth';
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────
export const authAPI = {
  register:    (data) => api.post('/auth/register', data),
  login:       (identifier, password) => api.post('/auth/login', { identifier, password }),
  logout:      (refreshToken) => api.post('/auth/logout', { refreshToken }),
  refresh:     (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  googleLogin: (data) => api.post('/auth/google', data),
  me:          () => api.get('/auth/me'),
};

// ── Route & Geocoding ─────────────────────────────────────────────────
export const routeAPI = {
  search:       (query, limit = 8, lat, lng, city, locationType) => api.get('/route/search', { params: { q: query, limit, lat, lng, city, locationType } }),
  reverse:      (lat, lng) => api.get('/route/reverse', { params: { lat, lng } }),
  calculate:    (origin, destination, options = {}) =>
    api.post('/route/calculate', { origin, destination, ...options }),
  optimizeStops:(origin, stops, vehicle = 'car') =>
    api.post('/route/optimize-stops', { origin, stops, vehicle }),
  shareTrip:    (tripId) => api.post(`/route/share/${tripId}`),
  // FIX: Live share menggunakan publicApi (tidak butuh token auth)
  getLiveShare: (token) => publicApi.get(`/route/live/${token}`),
};

// ── AI ────────────────────────────────────────────────────────────────
export const aiAPI = {
  chat:               (message, history, context) =>
    api.post('/ai/chat', { message, history, context }),
  analyzeRoute:       (route, origin, destination, vehicle) =>
    api.post('/ai/analyze-route', { route, origin, destination, vehicle }),
  bestRoute:          (data) => api.post('/ai/best-route', data),
  predictTraffic:     (area, timeRange) =>
    api.post('/ai/predict-traffic', { area, timeRange }),
  driverRecommendation:(data) => api.post('/ai/driver-recommendation', data),
  ecoScore:           (distance, routeType, vehicle) =>
    api.post('/ai/eco-score', { distance, routeType, vehicle }),
  health:             () => api.get('/ai/health'),
};

// ── Weather ───────────────────────────────────────────────────────────
export const weatherAPI = {
  get: (lat, lng, city) => publicApi.get('/weather', { params: { lat, lng, city } }),
};

// ── Traffic ───────────────────────────────────────────────────────────
export const trafficAPI = {
  get: (lat, lng) => publicApi.get('/traffic', { params: { lat, lng } }),
};

// ── Driver ────────────────────────────────────────────────────────────
export const driverAPI = {
  updateStatus: (isOnline, lat, lng) =>
    api.patch('/driver/status', { isOnline, lat, lng }),
  getDemand:    () => api.get('/driver/demand'),
  getEarnings:  () => api.get('/driver/earnings'),
};

// ── Trip / History ────────────────────────────────────────────────────
export const tripAPI = {
  getHistory:   (page = 1, limit = 20) =>
    api.get('/trip/history', { params: { page, limit } }),
  getById:      (id) => api.get(`/trip/${id}`),
  startTrip:    (id) => api.patch(`/trip/${id}/start`),
  completeTrip: (id, stats) => api.patch(`/trip/${id}/complete`, stats),
  rateTrip:     (id, score, comment) => api.post(`/trip/${id}/rate`, { score, comment }),
};

// ── User / Profile ────────────────────────────────────────────────────
export const userAPI = {
  getProfile:     () => api.get('/user/profile'),
  updateProfile:  (data) => api.put('/user/profile', data),
  addLocation:    (data) => api.post('/user/saved-locations', data),
  updateLocation: (id, data) => api.put(`/user/saved-locations/${id}`, data),
  deleteLocation: (id) => api.delete(`/user/saved-locations/${id}`),
};

// ── SOS ───────────────────────────────────────────────────────────────
export const sosAPI = {
  trigger:        (lat, lng, tripId, message) =>
    api.post('/sos/trigger', { lat, lng, tripId, message }),
  getContacts:    () => api.get('/sos/contacts'),
  updateContacts: (contacts) => api.put('/sos/contacts', { contacts }),
};

export default api;
