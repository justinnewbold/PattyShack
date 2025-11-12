import api from '../config/api';

const inventoryService = {
  async getInventory(params = {}) {
    const response = await api.get('/inventory', { params });
    return response.data;
  },

  async getItem(id) {
    const response = await api.get(`/inventory/${id}`);
    return response.data;
  },

  async performCount(countData) {
    const response = await api.post('/inventory/count', countData);
    return response.data;
  },

  async logWaste(wasteData) {
    const response = await api.post('/inventory/waste', wasteData);
    return response.data;
  },

  async getVarianceReport(params = {}) {
    const response = await api.get('/inventory/variance', { params });
    return response.data;
  },

  async updateItem(id, itemData) {
    const response = await api.put(`/inventory/${id}`, itemData);
    return response.data;
  },

  async scanBarcode(barcode) {
    const response = await api.get(`/inventory/barcode/${barcode}`);
    return response.data;
  },
};

export default inventoryService;
