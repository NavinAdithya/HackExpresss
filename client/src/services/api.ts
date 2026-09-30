/**
 * API Service — Axios client with JWT interceptors
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Add JWT token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('popo_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('popo_token');
      localStorage.removeItem('popo_user');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

// === Auth ===
export const authAPI = {
  sendOTP: (phone: string, name?: string) =>
    api.post('/auth/send-otp', { phone, name }),
  verifyOTP: (phone: string, otp: string) =>
    api.post('/auth/verify-otp', { phone, otp }),
  quickLogin: (phone: string, name?: string) =>
    api.post('/auth/quick-login', { phone, name }),
  getMe: () => api.get('/auth/me'),
  getTrustScore: (userId?: string) =>
    api.get(userId ? `/auth/trust-score/${userId}` : '/auth/trust-score'),
  updateProfile: (data: Record<string, unknown>) =>
    api.put('/auth/profile', data),
  verifyTraveller: (data: Record<string, unknown>) =>
    api.post('/auth/traveller-verify', data),
  submitSupport: (data: Record<string, unknown>) =>
    api.post('/auth/support', data),
};

// === Trips ===
export const tripAPI = {
  create: (data: Record<string, unknown>) => api.post('/trips', data),
  list: (params?: Record<string, string>) => api.get('/trips', { params }),
  get: (id: string) => api.get(`/trips/${id}`),
  updateStatus: (id: string, status: string) =>
    api.put(`/trips/${id}/status`, { status }),
  verifyFace: (id: string, imageData?: string) =>
    api.put(`/trips/${id}/verify-face`, { imageData }),
  generateStartOtp: (id: string, coords?: { passengerLat?: number; passengerLng?: number; travellerLat?: number; travellerLng?: number }) =>
    api.post(`/trips/${id}/start-otp/generate`, coords || {}),
  verifyStartOtp: (id: string, enteredOtp: string) =>
    api.post(`/trips/${id}/start-otp/verify`, { enteredOtp }),
  cancel: (id: string) => api.delete(`/trips/${id}`),
  getDailyQuota: () => api.get('/trips/daily-quota'),
};

// === Matches ===
export const matchAPI = {
  find: (tripId: string) => api.post(`/matches/find/${tripId}`),
  accept: (matchId: string) => api.put(`/matches/${matchId}/accept`),
  decline: (matchId: string) => api.put(`/matches/${matchId}/decline`),
  getForTrip: (tripId: string) => api.get(`/matches/trip/${tripId}`),
};

// === Ratings ===
export type TrustScores = {
  reliability: number;
  safety: number;
  respect: number;
  routeCommitment: number;
  communication: number;
};

export const ratingAPI = {
  submit: (tripId: string, scores: TrustScores, comment?: string) =>
    api.post('/ratings', { tripId, ...scores, comment }),
  eligibility: (tripId: string) => api.get(`/ratings/eligibility/${tripId}`),
  getForUser: (userId: string) => api.get(`/ratings/user/${userId}`),
};

// === Trust & public profiles ===
export const trustAPI = {
  profile: (userId: string) => api.get(`/trust/user/${userId}`),
};

// === Daily Commute ===
export const commuteAPI = {
  list: () => api.get('/commutes'),
  create: (data: Record<string, unknown>) => api.post('/commutes', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/commutes/${id}`, data),
  remove: (id: string) => api.delete(`/commutes/${id}`),
  today: () => api.get('/commutes/today'),
  matches: (id: string) => api.get(`/commutes/${id}/matches`),
  requests: () => api.get('/commutes/requests'),
  request: (id: string, data: { targetKind: string; targetId: string; targetUserId: string; asRole: string }) =>
    api.post(`/commutes/${id}/request`, data),
};

// === Communities ===
export const communityAPI = {
  list: () => api.get('/communities'),
  get: (id: string) => api.get(`/communities/${id}`),
  join: (id: string) => api.post(`/communities/${id}/join`),
  leave: (id: string) => api.delete(`/communities/${id}/leave`),
  create: (data: { name: string; category: string; description?: string }) => api.post('/communities', data),
};

// === SOS ===
export const sosAPI = {
  activate: (tripId: string, lat: number, lng: number) =>
    api.post('/sos/activate', { tripId, lat, lng }),
  getStatus: (tripId: string) => api.get(`/sos/trip/${tripId}`),
  resolve: (id: string, falseAlarm?: boolean) =>
    api.put(`/sos/${id}/resolve`, { falseAlarm }),
};

// === Plans ===
export const planAPI = {
  getAll: () => api.get('/plans'),
  subscribe: (plan: string) => api.post('/plans/subscribe', { plan }),
  verify: (data: Record<string, unknown>) => api.post('/plans/verify', data),
  cancel: () => api.put('/plans/cancel'),
  getEntitlements: () => api.get('/plans/entitlements'),
};

// === Contacts ===
export const contactAPI = {
  get: () => api.get('/contacts'),
  update: (contacts: Array<{ name: string; phone: string; circle?: string }>) =>
    api.put('/contacts', { contacts }),
  share: (tripId: string) => api.post(`/contacts/share/${tripId}`),
};

// === Tracking (public) ===
export const trackingAPI = {
  get: (token: string) => api.get(`/contacts/tracking/${token}`),
};

// === Analytics ===
export const analyticsAPI = {
  basic: () => api.get('/analytics/basic'),
  commute: () => api.get('/analytics/commute'),
  advanced: () => api.get('/analytics/advanced'),
};

// === Routes & Dijkstra Navigation ===
export const routesAPI = {
  getNodes: () => api.get('/routes/nodes'),
  calculateDijkstra: (origin: [number, number], destination: [number, number]) =>
    api.post('/routes/dijkstra', { origin, destination }),
  calculate: (origin: [number, number], destination: [number, number], algorithm?: string) =>
    api.post('/routes/calculate', { origin, destination, algorithm }),
};

export default api;
