/**
 * User Model
 * Supports role-based access control (crew, manager, regional, corporate)
 */

class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.password = data.password; // Should be hashed
    this.role = data.role; // 'crew', 'manager', 'district', 'regional', 'corporate'
    this.locationId = data.locationId;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.phone = data.phone;
    this.active = data.active !== undefined ? data.active : true;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  hasPermission(permission) {
    const rolePermissions = {
      crew: ['task.view', 'task.complete', 'temperature.log'],
      manager: ['task.*', 'temperature.*', 'inventory.*', 'schedule.*', 'location.view'],
      district: ['location.*', 'report.district', 'audit.*'],
      regional: ['location.*', 'report.regional', 'audit.*', 'analytics.*'],
      corporate: ['*']
    };

    const userPermissions = rolePermissions[this.role] || [];
    return userPermissions.includes('*') || 
           userPermissions.includes(permission) ||
           userPermissions.some(p => p.endsWith('.*') && permission.startsWith(p.slice(0, -1)));
  }
}

module.exports = User;
