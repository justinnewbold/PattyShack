/**
 * Database Connection Pool
 * Manages PostgreSQL connections with automatic reconnection
 */

const { Pool } = require('pg');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

let pool = null;

/**
 * Initialize database connection pool
 */
function initializePool() {
  if (pool) {
    return pool;
  }

  if (dbConfig.dialect === 'sqlite') {
    console.log('SQLite mode - database pool not initialized');
    return null;
  }

  pool = new Pool({
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.username,
    password: dbConfig.password,
    max: dbConfig.pool?.max || 20,
    min: dbConfig.pool?.min || 5,
    idleTimeoutMillis: dbConfig.pool?.idle || 10000,
    connectionTimeoutMillis: dbConfig.pool?.acquire || 30000,
  });

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
  });

  console.log(`PostgreSQL pool initialized: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

  return pool;
}

/**
 * Get database pool instance
 */
function getPool() {
  if (!pool) {
    return initializePool();
  }
  return pool;
}

/**
 * Execute a query with error handling
 */
async function query(text, params) {
  const client = await pool.connect();
  try {
    const start = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - start;

    if (duration > 1000) {
      console.warn(`Slow query (${duration}ms):`, text);
    }

    return result;
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute a transaction
 */
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close database pool
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database pool closed');
  }
}

/**
 * Test database connection
 */
async function testConnection() {
  try {
    const result = await query('SELECT NOW() as current_time');
    console.log('Database connection successful:', result.rows[0].current_time);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
}

module.exports = {
  initializePool,
  getPool,
  query,
  transaction,
  closePool,
  testConnection
};
