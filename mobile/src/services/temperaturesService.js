import api from '../config/api';

const temperaturesService = {
  async getTemperatureLogs(params = {}) {
    const response = await api.get('/temperatures', { params });
    return response.data;
  },

  async logTemperature(tempData) {
    const response = await api.post('/temperatures', tempData);
    return response.data;
  },

  async getAlerts(params = {}) {
    const response = await api.get('/temperatures/alerts', { params });
    return response.data;
  },

  async acknowledgeAlert(alertId) {
    const response = await api.post(`/temperatures/alerts/${alertId}/acknowledge`);
    return response.data;
  },

  async resolveAlert(alertId, resolutionData) {
    const response = await api.post(`/temperatures/alerts/${alertId}/resolve`, resolutionData);
    return response.data;
  },

  async getEquipmentHistory(equipmentId, params = {}) {
    const response = await api.get(`/temperatures/equipment/${equipmentId}`, { params });
    return response.data;
  },
};

export default temperaturesService;
