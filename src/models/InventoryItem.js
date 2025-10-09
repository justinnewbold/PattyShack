/**
 * Inventory Item Model
 * Supports real-time inventory tracking, barcode scanning, and recipe costing
 */

class InventoryItem {
  constructor(data) {
    this.id = data.id;
    this.locationId = data.locationId;
    this.name = data.name;
    this.sku = data.sku;
    this.barcode = data.barcode;
    this.category = data.category; // 'protein', 'produce', 'dairy', 'dry_goods', 'beverages', etc.
    this.unit = data.unit; // 'lb', 'oz', 'kg', 'ea', 'case', 'gallon', etc.
    this.currentQuantity = data.currentQuantity || 0;
    this.parLevel = data.parLevel || 0;
    this.reorderPoint = data.reorderPoint || 0;
    this.unitCost = data.unitCost || 0;
    this.totalValue = data.totalValue || 0;
    this.vendorId = data.vendorId;
    this.lastCountDate = data.lastCountDate;
    this.lastCountBy = data.lastCountBy;
    this.lastOrderDate = data.lastOrderDate;
    this.lastReceivedDate = data.lastReceivedDate;
    this.wasteTracking = data.wasteTracking || [];
    this.usedInRecipes = data.usedInRecipes || [];
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  needsReorder() {
    return this.currentQuantity <= this.reorderPoint;
  }

  updateQuantity(quantity, reason = 'adjustment') {
    const previousQuantity = this.currentQuantity;
    this.currentQuantity = quantity;
    this.totalValue = this.currentQuantity * this.unitCost;
    this.updatedAt = new Date();
    
    return {
      previousQuantity,
      newQuantity: this.currentQuantity,
      difference: this.currentQuantity - previousQuantity,
      reason
    };
  }

  recordWaste(quantity, reasonCode, notes = '') {
    this.wasteTracking.push({
      quantity,
      reasonCode,
      notes,
      cost: quantity * this.unitCost,
      timestamp: new Date()
    });
    this.updateQuantity(this.currentQuantity - quantity, 'waste');
  }
}

module.exports = InventoryItem;
