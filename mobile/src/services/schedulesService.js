import api from '../config/api';

const schedulesService = {
  async getSchedules(params = {}) {
    const response = await api.get('/schedules', { params });
    return response.data;
  },

  async clockIn(scheduleId, location) {
    const response = await api.post(`/schedules/${scheduleId}/clock-in`, {
      location,
      timestamp: new Date().toISOString(),
    });
    return response.data;
  },

  async clockOut(scheduleId) {
    const response = await api.post(`/schedules/${scheduleId}/clock-out`, {
      timestamp: new Date().toISOString(),
    });
    return response.data;
  },

  async getForecast(params = {}) {
    const response = await api.get('/schedules/forecast', { params });
    return response.data;
  },

  async createSchedule(scheduleData) {
    const response = await api.post('/schedules', scheduleData);
    return response.data;
  },

  async updateSchedule(id, scheduleData) {
    const response = await api.put(`/schedules/${id}`, scheduleData);
    return response.data;
  },
};

export default schedulesService;
