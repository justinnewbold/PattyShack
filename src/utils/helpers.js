/**
 * Helper Utilities
 * Common helper functions used across the application
 */

const helpers = {
  // Format date for display
  formatDate(date, format = 'short') {
    const d = new Date(date);
    
    if (format === 'short') {
      return d.toLocaleDateString();
    } else if (format === 'long') {
      return d.toLocaleString();
    } else if (format === 'iso') {
      return d.toISOString();
    }
    
    return d.toString();
  },

  // Calculate percentage
  calculatePercentage(value, total) {
    if (total === 0) return 0;
    return Math.round((value / total) * 100 * 100) / 100;
  },

  // Calculate variance
  calculateVariance(actual, theoretical) {
    if (theoretical === 0) return 0;
    return actual - theoretical;
  },

  // Calculate variance percentage
  calculateVariancePercent(actual, theoretical) {
    if (theoretical === 0) return 0;
    return this.calculatePercentage(actual - theoretical, theoretical);
  },

  // Group items by property
  groupBy(array, property) {
    return array.reduce((acc, item) => {
      const key = item[property];
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});
  },

  // Sort items
  sortBy(array, property, order = 'asc') {
    return [...array].sort((a, b) => {
      if (order === 'asc') {
        return a[property] > b[property] ? 1 : -1;
      } else {
        return a[property] < b[property] ? 1 : -1;
      }
    });
  },

  // Paginate results
  paginate(array, page = 1, perPage = 20) {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    
    return {
      data: array.slice(start, end),
      pagination: {
        page,
        perPage,
        total: array.length,
        totalPages: Math.ceil(array.length / perPage)
      }
    };
  },

  // Generate unique ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  // Deep clone object
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  // Check if object is empty
  isEmpty(obj) {
    return Object.keys(obj).length === 0;
  },

  // Delay/sleep function
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Format currency
  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  },

  // Calculate hours between dates
  calculateHours(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const milliseconds = end - start;
    return Math.round((milliseconds / (1000 * 60 * 60)) * 100) / 100;
  },

  // Check if date is today
  isToday(date) {
    const d = new Date(date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  },

  // Get date range
  getDateRange(startDate, endDate) {
    const dates = [];
    let currentDate = new Date(startDate);
    const end = new Date(endDate);
    
    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  }
};

module.exports = helpers;
