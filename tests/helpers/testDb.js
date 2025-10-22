/**
 * Test Database Utilities
 * Provides setup, teardown, and helper functions for tests
 */

const { Pool } = require('pg');

let testPool = null;

/**
 * Get or create test database pool
 */
function getTestPool() {
  if (!testPool) {
    testPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'pattyshack_test',
      user: process.env.DB_USER || 'pattyshack_user',
      password: process.env.DB_PASSWORD || 'pattyshack_dev_password',
      max: 5,
      idleTimeoutMillis: 1000,
      connectionTimeoutMillis: 5000,
    });
  }
  return testPool;
}

/**
 * Initialize test database with schema
 */
async function setupTestDatabase() {
  const pool = getTestPool();

  try {
    // Run migrations
    const fs = require('fs');
    const path = require('path');
    const migrationPath = path.join(__dirname, '../../src/database/migrations/001_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(migrationSQL);
    console.log('✓ Test database schema created');
  } catch (error) {
    console.error('Failed to setup test database:', error.message);
    throw error;
  }
}

/**
 * Clear all data from test database
 */
async function clearTestDatabase() {
  const pool = getTestPool();

  try {
    await pool.query(`
      TRUNCATE
        temperature_alerts,
        inventory_counts,
        invoices,
        schedules,
        inventory_items,
        temperature_logs,
        tasks,
        locations,
        users
      CASCADE
    `);
  } catch (error) {
    console.error('Failed to clear test database:', error.message);
    throw error;
  }
}

/**
 * Tear down test database
 */
async function teardownTestDatabase() {
  if (testPool) {
    await testPool.end();
    testPool = null;
  }
}

/**
 * Create test user
 */
async function createTestUser(userData = {}) {
  const pool = getTestPool();

  const user = {
    id: userData.id || `test-user-${Date.now()}`,
    username: userData.username || 'testuser',
    email: userData.email || 'test@pattyshack.com',
    password: userData.password || '$2a$10$hashedpassword',
    role: userData.role || 'manager',
    location_id: userData.location_id || null,
    first_name: userData.first_name || 'Test',
    last_name: userData.last_name || 'User',
    phone: userData.phone || '555-0000',
    active: userData.active !== undefined ? userData.active : true
  };

  await pool.query(`
    INSERT INTO users (id, username, email, password, role, location_id, first_name, last_name, phone, active)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [
    user.id, user.username, user.email, user.password, user.role,
    user.location_id, user.first_name, user.last_name, user.phone, user.active
  ]);

  return user;
}

/**
 * Create test location
 */
async function createTestLocation(locationData = {}) {
  const pool = getTestPool();

  const location = {
    id: locationData.id || `test-location-${Date.now()}`,
    name: locationData.name || 'Test Location',
    code: locationData.code || `TEST-${Date.now()}`,
    address: locationData.address || '123 Test St',
    city: locationData.city || 'Test City',
    state: locationData.state || 'TS',
    zip: locationData.zip || '12345',
    phone: locationData.phone || '555-1000',
    type: locationData.type || 'corporate',
    brand_id: locationData.brand_id || 'brand-1',
    district_id: locationData.district_id || 'district-1',
    region_id: locationData.region_id || 'region-1',
    manager_id: locationData.manager_id || null,
    timezone: locationData.timezone || 'America/New_York',
    active: locationData.active !== undefined ? locationData.active : true
  };

  await pool.query(`
    INSERT INTO locations (id, name, code, address, city, state, zip, phone, type, brand_id, district_id, region_id, manager_id, timezone, active)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
  `, [
    location.id, location.name, location.code, location.address, location.city,
    location.state, location.zip, location.phone, location.type, location.brand_id,
    location.district_id, location.region_id, location.manager_id, location.timezone, location.active
  ]);

  return location;
}

/**
 * Create test task
 */
async function createTestTask(taskData = {}) {
  const pool = getTestPool();

  const task = {
    id: taskData.id || `test-task-${Date.now()}`,
    title: taskData.title || 'Test Task',
    description: taskData.description || 'Test description',
    type: taskData.type || 'checklist',
    category: taskData.category || 'test',
    location_id: taskData.location_id,
    assigned_to: taskData.assigned_to || null,
    priority: taskData.priority || 'medium',
    status: taskData.status || 'pending',
    due_date: taskData.due_date || null
  };

  await pool.query(`
    INSERT INTO tasks (id, title, description, type, category, location_id, assigned_to, priority, status, due_date)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [
    task.id, task.title, task.description, task.type, task.category,
    task.location_id, task.assigned_to, task.priority, task.status, task.due_date
  ]);

  return task;
}

module.exports = {
  getTestPool,
  setupTestDatabase,
  clearTestDatabase,
  teardownTestDatabase,
  createTestUser,
  createTestLocation,
  createTestTask
};
