// src/database/pool.js
const { Pool } = require('pg');

let pool;

/**
 * Initialize the PostgreSQL connection pool
 */
function initializePool() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable not set');
  }

  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Required for Railway SSL
  });

  console.log(`PostgreSQL pool initialized: ${connectionString.replace(/:[^:@]*@/, ':****@')}`);
  return pool;
}

/**
 * Return the current PostgreSQL pool
 */
function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializePool() first.');
  }
  return pool;
}

/**
 * Test database connectivity
 */
async function testConnection() {
  try {
    const client = await getPool().connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log(`✅ Database connection test succeeded: ${result.rows[0].now}`);
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return false;
  }
}

/**
 * Close the database pool
 */
async function closePool() {
  if (pool) {
    await pool.end();
    console.log('🛑 PostgreSQL pool closed');
  }
}

module.exports = { initializePool, getPool, testConnection, closePool };
