import api from '../config/api';

const analyticsService = {
  async getDashboard(params = {}) {
    const response = await api.get('/analytics/dashboard', { params });
    return response.data;
  },

  async getLocationComparison(params = {}) {
    const response = await api.get('/analytics/locations', { params });
    return response.data;
  },

  async generateReport(type, params = {}) {
    const response = await api.get(`/analytics/reports/${type}`, { params });
    return response.data;
  },

  async getAlerts(params = {}) {
    const response = await api.get('/analytics/alerts', { params });
    return response.data;
  },
};

export default analyticsService;
