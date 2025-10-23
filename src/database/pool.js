// src/database/pool.js
const { Pool } = require('pg');

let pool;

function initializePool() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;

  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Required for Railway SSL
  });

  console.log(`PostgreSQL pool initialized: ${connectionString.replace(/:[^:@]*@/, ':****@')}`);
  return pool;
}

async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection test succeeded');
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return false;
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
    console.log('🛑 PostgreSQL pool closed');
  }
}

module.exports = { initializePool, testConnection, closePool };
