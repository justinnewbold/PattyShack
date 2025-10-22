/**
 * Database Seeding Script
 * Populates database with demo data for testing
 */

const { getPool } = require('./pool');

/**
 * Seed demo data into database
 */
async function seedDatabase() {
  const pool = getPool();

  if (!pool) {
    console.log('Skipping seeding - not using PostgreSQL');
    return;
  }

  console.log('Seeding database with demo data...');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Clear existing data (in reverse order of dependencies)
    console.log('  → Clearing existing data...');
    await client.query('TRUNCATE temperature_alerts, inventory_counts, invoices, schedules, inventory_items, temperature_logs, tasks, locations, users CASCADE');

    // Seed Users
    console.log('  → Seeding users...');
    await client.query(`
      INSERT INTO users (id, username, email, password, role, location_id, first_name, last_name, phone, active)
      VALUES
        ('user-1', 'john.manager', 'john@pattyshack.com', '$2a$10$hashedpassword', 'manager', 'store-100', 'John', 'Smith', '555-0100', true),
        ('user-2', 'sarah.crew', 'sarah@pattyshack.com', '$2a$10$hashedpassword', 'crew', 'store-100', 'Sarah', 'Johnson', '555-0101', true),
        ('user-3', 'mike.district', 'mike@pattyshack.com', '$2a$10$hashedpassword', 'district', 'store-100', 'Mike', 'Wilson', '555-0102', true),
        ('user-4', 'lisa.manager', 'lisa@pattyshack.com', '$2a$10$hashedpassword', 'manager', 'store-200', 'Lisa', 'Davis', '555-0200', true),
        ('user-5', 'tom.crew', 'tom@pattyshack.com', '$2a$10$hashedpassword', 'crew', 'store-200', 'Tom', 'Brown', '555-0201', true)
    `);

    // Seed Locations
    console.log('  → Seeding locations...');
    await client.query(`
      INSERT INTO locations (id, name, code, address, city, state, zip, phone, type, brand_id, district_id, region_id, manager_id, timezone, active, opening_date)
      VALUES
        ('store-100', 'PattyShack Downtown', 'PS-100', '123 Main St', 'Chicago', 'IL', '60601', '555-1000', 'corporate', 'brand-1', 'district-1', 'region-1', 'user-1', 'America/Chicago', true, '2020-01-15'),
        ('store-200', 'PattyShack Midtown', 'PS-200', '456 Oak Ave', 'Chicago', 'IL', '60602', '555-2000', 'corporate', 'brand-1', 'district-1', 'region-1', 'user-4', 'America/Chicago', true, '2021-03-20')
    `);

    // Seed Tasks
    console.log('  → Seeding tasks...');
    await client.query(`
      INSERT INTO tasks (id, title, description, type, category, location_id, assigned_to, priority, status, due_date, recurring, recurrence_pattern)
      VALUES
        ('task-1', 'Morning Line Check', 'Check all equipment temperatures and food quality', 'line_check', 'food_safety', 'store-100', 'user-2', 'high', 'pending', NOW() + INTERVAL '2 hours', true, 'daily'),
        ('task-2', 'Deep Clean Fryers', 'Clean and filter all fryer oil', 'cleaning', 'maintenance', 'store-100', 'user-2', 'medium', 'in_progress', NOW() + INTERVAL '4 hours', false, null),
        ('task-3', 'Inventory Count - Proteins', 'Count all frozen protein inventory', 'checklist', 'inventory', 'store-100', 'user-1', 'high', 'completed', NOW() - INTERVAL '1 day', false, null),
        ('task-4', 'Opening Checklist', 'Complete opening procedures', 'opening', 'operations', 'store-200', 'user-5', 'critical', 'pending', NOW() + INTERVAL '1 hour', true, 'daily')
    `);

    // Seed Temperature Logs
    console.log('  → Seeding temperature logs...');
    const tempLogs = [];
    for (let i = 0; i < 20; i++) {
      const temp = 35 + Math.random() * 10; // 35-45°F range
      const isInRange = temp >= 33 && temp <= 41;
      tempLogs.push(`(
        'temp-log-${i}',
        'store-100',
        'fridge-${Math.floor(i / 5) + 1}',
        'refrigerator',
        ${temp.toFixed(1)},
        'F',
        33,
        41,
        ${isInRange},
        'manual',
        null,
        'user-2',
        NOW() - INTERVAL '${i} hours'
      )`);
    }
    await client.query(`
      INSERT INTO temperature_logs (id, location_id, equipment_id, equipment_type, temperature, unit, threshold_min, threshold_max, is_in_range, source, sensor_id, recorded_by, recorded_at)
      VALUES ${tempLogs.join(',\n')}
    `);

    // Seed Inventory Items
    console.log('  → Seeding inventory items...');
    await client.query(`
      INSERT INTO inventory_items (id, location_id, name, sku, barcode, category, unit, current_quantity, par_level, reorder_point, unit_cost, total_value)
      VALUES
        ('inv-1', 'store-100', 'Ground Beef 80/20', 'BEEF-8020', '123456789001', 'protein', 'lb', 150, 200, 100, 3.99, 598.50),
        ('inv-2', 'store-100', 'Sesame Buns', 'BUN-SES', '123456789002', 'bakery', 'case', 25, 40, 20, 12.50, 312.50),
        ('inv-3', 'store-100', 'American Cheese Slices', 'CHEESE-AM', '123456789003', 'dairy', 'lb', 80, 100, 50, 4.25, 340.00),
        ('inv-4', 'store-200', 'Ground Beef 80/20', 'BEEF-8020', '123456789001', 'protein', 'lb', 175, 200, 100, 3.99, 698.25),
        ('inv-5', 'store-200', 'Sesame Buns', 'BUN-SES', '123456789002', 'bakery', 'case', 35, 40, 20, 12.50, 437.50)
    `);

    // Seed Schedules
    console.log('  → Seeding schedules...');
    await client.query(`
      INSERT INTO schedules (id, location_id, user_id, date, start_time, end_time, position, status, scheduled_hours, hourly_rate, metadata)
      VALUES
        ('sched-1', 'store-100', 'user-2', CURRENT_DATE, '08:00', '16:00', 'cook', 'scheduled', 8, 15.00, '{"projected_sales": 2500}'),
        ('sched-2', 'store-100', 'user-1', CURRENT_DATE, '09:00', '17:00', 'manager', 'in_progress', 8, 22.00, '{"projected_sales": 2500}'),
        ('sched-3', 'store-200', 'user-5', CURRENT_DATE, '10:00', '18:00', 'cashier', 'scheduled', 8, 14.00, '{"projected_sales": 3000}'),
        ('sched-4', 'store-200', 'user-4', CURRENT_DATE, '08:00', '16:00', 'manager', 'completed', 8, 22.00, '{"actual_sales": 3200}'),
        ('sched-5', 'store-100', 'user-2', CURRENT_DATE - 1, '08:00', '16:00', 'cook', 'completed', 8, 15.00, '{"actual_sales": 2800}')
    `);

    // Update completed schedule with clock times
    await client.query(`
      UPDATE schedules
      SET
        clock_in_time = date + start_time::time,
        clock_out_time = date + end_time::time,
        actual_hours = 8,
        labor_cost = 8 * hourly_rate
      WHERE status = 'completed'
    `);

    // Seed Invoices
    console.log('  → Seeding invoices...');
    await client.query(`
      INSERT INTO invoices (id, location_id, vendor_id, invoice_number, invoice_date, due_date, subtotal, tax, total, status, ocr_processed, ocr_confidence, line_items)
      VALUES
        ('inv-1', 'store-100', 'vendor-sysco', 'INV-2024-001', CURRENT_DATE - 2, CURRENT_DATE + 28, 1250.00, 87.50, 1337.50, 'pending', true, 0.95,
         '[{"description": "Ground Beef 80/20", "quantity": 200, "unitPrice": 3.99, "total": 798.00}, {"description": "Cheese Slices", "quantity": 100, "unitPrice": 4.52, "total": 452.00}]'::jsonb),
        ('inv-2', 'store-100', 'vendor-usfood', 'INV-2024-002', CURRENT_DATE - 5, CURRENT_DATE + 25, 850.00, 59.50, 909.50, 'approved', true, 0.89,
         '[{"description": "Buns - Cases", "quantity": 60, "unitPrice": 12.50, "total": 750.00}, {"description": "Lettuce", "quantity": 20, "unitPrice": 5.00, "total": 100.00}]'::jsonb),
        ('inv-3', 'store-200', 'vendor-sysco', 'INV-2024-003', CURRENT_DATE - 1, CURRENT_DATE + 29, 2100.00, 147.00, 2247.00, 'pending', true, 0.92,
         '[{"description": "Ground Beef 80/20", "quantity": 300, "unitPrice": 3.99, "total": 1197.00}, {"description": "Buns", "quantity": 80, "unitPrice": 12.50, "total": 1000.00}]'::jsonb)
    `);

    // Update approved invoice
    await client.query(`
      UPDATE invoices
      SET approved_by = 'user-1', approved_at = NOW() - INTERVAL '2 days'
      WHERE status = 'approved'
    `);

    await client.query('COMMIT');
    console.log('✓ Database seeded successfully');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seeding error:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Clear all data from database
 */
async function clearDatabase() {
  const pool = getPool();

  if (!pool) {
    console.log('Skipping clear - not using PostgreSQL');
    return;
  }

  console.log('Clearing database...');

  try {
    await pool.query('TRUNCATE temperature_alerts, inventory_counts, invoices, schedules, inventory_items, temperature_logs, tasks, locations, users CASCADE');
    console.log('✓ Database cleared');
  } catch (error) {
    console.error('Clear error:', error);
    throw error;
  }
}

module.exports = {
  seedDatabase,
  clearDatabase
};
