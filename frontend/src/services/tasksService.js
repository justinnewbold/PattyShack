import api from '../utils/api';

export const tasksService = {
  // Get all tasks with optional filters
  async getTasks(filters = {}) {
    const response = await api.get('/tasks', { params: filters });
    return response.data;
  },

  // Get task by ID
  async getTaskById(id) {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },

  // Create new task
  async createTask(taskData) {
    const response = await api.post('/tasks', taskData);
    return response.data;
  },

  // Update task
  async updateTask(id, taskData) {
    const response = await api.put(`/tasks/${id}`, taskData);
    return response.data;
  },

  // Complete task
  async completeTask(id, completionData = {}) {
    const response = await api.post(`/tasks/${id}/complete`, completionData);
    return response.data;
  },

  // Delete task
  async deleteTask(id) {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  },
};

export default tasksService;
