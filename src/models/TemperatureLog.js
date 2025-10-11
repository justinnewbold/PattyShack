/**
 * Temperature Log Model
 * Supports HACCP-compliant temperature monitoring and IoT sensor integration
 */

class TemperatureLog {
  constructor(data) {
    this.id = data.id;
    this.locationId = data.locationId;
    this.equipmentId = data.equipmentId;
    this.equipmentType = data.equipmentType; // 'refrigerator', 'freezer', 'hot_holding', 'prep_table'
    this.temperature = data.temperature;
    this.unit = data.unit || 'F'; // 'F' or 'C'
    this.threshold = data.threshold; // Min/max acceptable range
    this.isInRange = data.isInRange;
    this.source = data.source || 'manual'; // 'manual', 'iot_sensor', 'bluetooth_probe'
    this.sensorId = data.sensorId;
    this.recordedBy = data.recordedBy;
    this.recordedAt = data.recordedAt || new Date();
    this.notes = data.notes || '';
    this.correctiveAction = data.correctiveAction;
    this.alertSent = data.alertSent || false;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date();
  }

  checkThreshold(min, max) {
    this.isInRange = this.temperature >= min && this.temperature <= max;
    return this.isInRange;
  }

  requiresCorrectiveAction() {
    return !this.isInRange && !this.correctiveAction;
  }
}

module.exports = TemperatureLog;
