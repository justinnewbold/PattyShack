import api from '../utils/api';

export const analyticsService = {
  // Get dashboard data
  async getDashboard(filters = {}) {
    const response = await api.get('/analytics/dashboard', { params: filters });
    return response.data;
  },

  // Get location comparison data
  async getLocationComparison(filters = {}) {
    const response = await api.get('/analytics/location-comparison', { params: filters });
    return response.data;
  },

  // Get report
  async getReport(reportType, filters = {}) {
    const response = await api.get(`/analytics/reports/${reportType}`, { params: filters });
    return response.data;
  },

  // Get analytics alerts
  async getAlerts(filters = {}) {
    const response = await api.get('/analytics/alerts', { params: filters });
    return response.data;
  },
};

export default analyticsService;
