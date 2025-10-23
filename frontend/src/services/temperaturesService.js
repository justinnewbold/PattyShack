import api from '../utils/api';

export const temperaturesService = {
  // Get temperature logs with optional filters
  async getLogs(filters = {}) {
    const response = await api.get('/temperatures', { params: filters });
    return response.data;
  },

  // Create temperature log
  async createLog(logData) {
    const response = await api.post('/temperatures', logData);
    return response.data;
  },

  // Get temperature alerts
  async getAlerts(filters = {}) {
    const response = await api.get('/temperatures/alerts', { params: filters });
    return response.data;
  },

  // Acknowledge alert
  async acknowledgeAlert(id) {
    const response = await api.patch(`/temperatures/alerts/${id}/acknowledge`);
    return response.data;
  },

  // Resolve alert
  async resolveAlert(id, resolutionData) {
    const response = await api.patch(`/temperatures/alerts/${id}/resolve`, resolutionData);
    return response.data;
  },

  // Get equipment temperature history
  async getEquipmentHistory(equipmentId, filters = {}) {
    const response = await api.get(`/temperatures/equipment/${equipmentId}`, { params: filters });
    return response.data;
  },
};

export default temperaturesService;
