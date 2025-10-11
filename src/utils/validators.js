/**
 * Validation Utilities
 * Common validation functions for data integrity
 */

const validators = {
  // Email validation
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Phone validation
  isValidPhone(phone) {
    const phoneRegex = /^\+?[\d\s-()]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  },

  // Temperature validation
  isValidTemperature(temp, unit = 'F') {
    const num = parseFloat(temp);
    if (isNaN(num)) return false;
    
    if (unit === 'F') {
      return num >= -50 && num <= 200;
    } else if (unit === 'C') {
      return num >= -45 && num <= 93;
    }
    return false;
  },

  // Date validation
  isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  },

  // Quantity validation
  isValidQuantity(quantity) {
    const num = parseFloat(quantity);
    return !isNaN(num) && num >= 0;
  },

  // Role validation
  isValidRole(role) {
    const validRoles = ['crew', 'manager', 'district', 'regional', 'corporate'];
    return validRoles.includes(role);
  },

  // Task status validation
  isValidTaskStatus(status) {
    const validStatuses = ['pending', 'in_progress', 'completed', 'failed', 'overdue'];
    return validStatuses.includes(status);
  },

  // Task type validation
  isValidTaskType(type) {
    const validTypes = ['checklist', 'line_check', 'food_safety', 'opening', 'closing', 'custom'];
    return validTypes.includes(type);
  },

  // Required fields validation
  hasRequiredFields(data, requiredFields) {
    return requiredFields.every(field => 
      data.hasOwnProperty(field) && 
      data[field] !== null && 
      data[field] !== undefined && 
      data[field] !== ''
    );
  },

  // Sanitize string input
  sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return str.trim().replace(/[<>]/g, '');
  }
};

module.exports = validators;
