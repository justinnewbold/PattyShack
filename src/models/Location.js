/**
 * Location Model
 * Represents a restaurant location with hierarchical organization
 */

class Location {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.code = data.code; // Unique store code
    this.address = data.address;
    this.city = data.city;
    this.state = data.state;
    this.zip = data.zip;
    this.phone = data.phone;
    this.type = data.type; // 'corporate', 'franchise'
    this.brandId = data.brandId;
    this.districtId = data.districtId;
    this.regionId = data.regionId;
    this.managerId = data.managerId;
    this.timezone = data.timezone || 'America/New_York';
    this.active = data.active !== undefined ? data.active : true;
    this.openingDate = data.openingDate;
    this.metadata = data.metadata || {}; // Additional custom fields
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  getHierarchy() {
    return {
      location: this.id,
      district: this.districtId,
      region: this.regionId,
      brand: this.brandId
    };
  }
}

module.exports = Location;
