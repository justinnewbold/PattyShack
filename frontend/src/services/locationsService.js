import api from '../utils/api';

export const locationsService = {
  // Get all locations with optional filters
  async getLocations(filters = {}) {
    const response = await api.get('/locations', { params: filters });
    return response.data;
  },

  // Get location by ID
  async getLocationById(id) {
    const response = await api.get(`/locations/${id}`);
    return response.data;
  },

  // Create new location
  async createLocation(locationData) {
    const response = await api.post('/locations', locationData);
    return response.data;
  },

  // Update location
  async updateLocation(id, locationData) {
    const response = await api.put(`/locations/${id}`, locationData);
    return response.data;
  },

  // Delete location
  async deleteLocation(id) {
    const response = await api.delete(`/locations/${id}`);
    return response.data;
  },

  // Get location scorecard
  async getScorecard(id, filters = {}) {
    const response = await api.get(`/locations/${id}/scorecard`, { params: filters });
    return response.data;
  },

  // Get location hierarchy
  async getHierarchy() {
    const response = await api.get('/locations/hierarchy');
    return response.data;
  },
};

export default locationsService;
