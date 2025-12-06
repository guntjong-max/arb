// API service for backend communication
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Accounts API
export const accountsAPI = {
  getAll: () => api.get('/accounts'),
  getById: (id) => api.get(`/accounts/${id}`),
  create: (data) => api.post('/accounts', data),
  update: (id, data) => api.put(`/accounts/${id}`, data),
  delete: (id) => api.delete(`/accounts/${id}`),
  updateBalance: (id, balance) => api.post(`/accounts/${id}/update-balance`, { balance }),
  updateStatus: (id, status) => api.post(`/accounts/${id}/update-status`, { status })
};

// Configuration API
export const configAPI = {
  get: () => api.get('/config'),
  update: (data) => api.put('/config', data),
  toggleEmergencyStop: (enabled) => api.post('/config/emergency-stop', { enabled }),
  toggleAutoTrading: (enabled) => api.post('/config/auto-trading', { enabled })
};

// Scanner API
export const scannerAPI = {
  getOpportunities: (status = 'detected', limit = 50) => 
    api.get('/scanner/opportunities', { params: { status, limit } }),
  getLiveFeed: () => api.get('/scanner/live-feed'),
  getStats: () => api.get('/scanner/stats')
};

// History API
export const historyAPI = {
  getBets: (params = {}) => api.get('/history/bets', { params }),
  getLogs: (params = {}) => api.get('/history/logs', { params }),
  getProfitSummary: (period = 'today') => api.get('/history/profit-summary', { params: { period } }),
  getPerformance: () => api.get('/history/performance')
};

// Health API
export const healthAPI = {
  check: () => axios.get('/health'),
  detailed: () => axios.get('/health/detailed')
};

export default api;
