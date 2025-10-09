/**
 * Schedule Model
 * Supports shift scheduling, labor forecasting, and time tracking
 */

class Schedule {
  constructor(data) {
    this.id = data.id;
    this.locationId = data.locationId;
    this.userId = data.userId;
    this.date = data.date;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.position = data.position; // 'cook', 'cashier', 'manager', 'prep', etc.
    this.status = data.status || 'scheduled'; // 'scheduled', 'confirmed', 'in_progress', 'completed', 'no_show'
    this.clockInTime = data.clockInTime;
    this.clockOutTime = data.clockOutTime;
    this.clockInLocation = data.clockInLocation; // GPS coordinates
    this.breakDuration = data.breakDuration || 0; // minutes
    this.actualHours = data.actualHours || 0;
    this.scheduledHours = data.scheduledHours || 0;
    this.laborCost = data.laborCost || 0;
    this.approvedBy = data.approvedBy;
    this.notes = data.notes || '';
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  clockIn(location = null) {
    this.clockInTime = new Date();
    this.clockInLocation = location;
    this.status = 'in_progress';
    this.updatedAt = new Date();
  }

  clockOut() {
    this.clockOutTime = new Date();
    this.status = 'completed';
    this.actualHours = this.calculateActualHours();
    this.updatedAt = new Date();
  }

  calculateActualHours() {
    if (!this.clockInTime || !this.clockOutTime) return 0;
    const milliseconds = new Date(this.clockOutTime) - new Date(this.clockInTime);
    const hours = milliseconds / (1000 * 60 * 60);
    return Math.round((hours - (this.breakDuration / 60)) * 100) / 100;
  }

  calculateScheduledHours() {
    if (!this.startTime || !this.endTime) return 0;
    const start = new Date(`1970-01-01T${this.startTime}`);
    const end = new Date(`1970-01-01T${this.endTime}`);
    const hours = (end - start) / (1000 * 60 * 60);
    return Math.round((hours - (this.breakDuration / 60)) * 100) / 100;
  }
}

module.exports = Schedule;
