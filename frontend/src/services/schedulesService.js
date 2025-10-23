import api from '../utils/api';

export const schedulesService = {
  // Get schedules with optional filters
  async getSchedules(filters = {}) {
    const response = await api.get('/schedules', { params: filters });
    return response.data;
  },

  // Create new schedule
  async createSchedule(scheduleData) {
    const response = await api.post('/schedules', scheduleData);
    return response.data;
  },

  // Clock in
  async clockIn(clockInData) {
    const response = await api.post('/schedules/clock-in', clockInData);
    return response.data;
  },

  // Clock out
  async clockOut(clockOutData) {
    const response = await api.post('/schedules/clock-out', clockOutData);
    return response.data;
  },

  // Get labor forecast
  async getForecast(filters = {}) {
    const response = await api.get('/schedules/forecast', { params: filters });
    return response.data;
  },
};

export default schedulesService;
