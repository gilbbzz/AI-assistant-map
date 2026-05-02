// api.js – Panggilan API konsisten, tambah fungsi route dari backend
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('routeai_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(res => res, async err => {
  if (err.response?.status === 401 && err.response?.data?.code === 'TOKEN_EXPIRED') {
    try {
      const refresh = localStorage.getItem('routeai_refresh');
      const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: refresh });
      localStorage.setItem('routeai_token', res.data.data.token);
      err.config.headers.Authorization = `Bearer ${res.data.data.token}`;
      return api(err.config);
    } catch { localStorage.clear(); window.location.href = '/login'; }
  }
  return Promise.reject(err);
});

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (identifier, password) => api.post('/auth/login', { identifier, password }),
  logout: () => api.post('/auth/logout'),
};

export const routeAPI = {
  search: (query) => api.get('/route/search', { params: { q: query, limit: 8 } }),
  calculate: (origin, destination, options = {}) => api.post('/route/calculate', { origin, destination, ...options }),
  getLiveShare: (token) => api.get(`/route/live/${token}`),
  shareTrip: (tripId) => api.post(`/route/share/${tripId}`),
};

export const aiAPI = {
  chat: (message, history, context) => api.post('/ai/chat', { message, history, context }),
  analyzeRoute: (route, origin, destination, vehicle) => api.post('/ai/analyze-route', { route, origin, destination, vehicle }),
  bestRoute: (data) => api.post('/ai/best-route', data)
};

export const weatherAPI = { get: (lat, lng) => api.get('/weather', { params: { lat, lng } }) };
export const trafficAPI = {
  get: (lat, lng) => api.get('/traffic', { params: { lat, lng } }),
};
export const driverAPI = {
  updateStatus: (isOnline, lat, lng) => api.patch('/driver/status', { isOnline, lat, lng }),
  getDemand: () => api.get('/driver/demand'),
};
export const tripAPI = {
  getHistory: (page) => api.get('/trip/history', { params: { page } }),
  startTrip: (id) => api.patch(`/trip/${id}/start`),
  completeTrip: (id, stats) => api.patch(`/trip/${id}/complete`, stats),
};

export const userAPI = {
  addLocation: (data) => api.post('/user/saved-locations', data),
  updateLocation: (id, data) => api.put(`/user/saved-locations/${id}`, data),
  deleteLocation: (id) => api.delete(`/user/saved-locations/${id}`),
};

export default api;