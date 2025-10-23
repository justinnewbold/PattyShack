import api from '../utils/api';

export const inventoryService = {
  // Get inventory items with optional filters
  async getItems(filters = {}) {
    const response = await api.get('/inventory', { params: filters });
    return response.data;
  },

  // Record inventory count
  async recordCount(countData) {
    const response = await api.post('/inventory/count', countData);
    return response.data;
  },

  // Log waste
  async logWaste(wasteData) {
    const response = await api.post('/inventory/waste', wasteData);
    return response.data;
  },

  // Get variance report
  async getVariance(filters = {}) {
    const response = await api.get('/inventory/variance', { params: filters });
    return response.data;
  },
};

export default inventoryService;
