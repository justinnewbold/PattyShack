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
  },

  // Schedule status validation
  isValidScheduleStatus(status) {
    const validStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'no_show', 'open'];
    return validStatuses.includes(status);
  },

  // Time string validation (HH:MM)
  isValidTimeString(time) {
    if (typeof time !== 'string') return false;
    const normalized = time.trim();
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(normalized);
  },

  // Time range validation (start before end)
  isValidTimeRange(start, end) {
    if (!this.isValidTimeString(start) || !this.isValidTimeString(end)) {
      return false;
    }

    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    return startMinutes < endMinutes;
  },

  // Non-negative number validation
  isNonNegativeNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) && num >= 0;
  },

  // Duration validation (minutes)
  isValidDuration(minutes, { min = 0, max = 24 * 60 } = {}) {
    const value = Number(minutes);
    if (!Number.isFinite(value)) return false;
    return value >= min && value <= max;
  }
};

module.exports = validators;
