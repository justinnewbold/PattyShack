/**
 * Database Migration Runner
 * Executes SQL migration files in order
 */

const fs = require('fs');
const path = require('path');
const { getPool } = require('./pool');

/**
 * Run all pending migrations
 */
async function runMigrations() {
  const pool = getPool();

  if (!pool) {
    console.log('Skipping migrations - not using PostgreSQL');
    return;
  }

  console.log('Running database migrations...');

  try {
    // Create migrations tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get list of migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    // Check which migrations have already been run
    const executedResult = await pool.query('SELECT name FROM migrations');
    const executedMigrations = new Set(executedResult.rows.map(r => r.name));

    // Run pending migrations
    for (const file of files) {
      if (executedMigrations.has(file)) {
        console.log(`  ✓ ${file} (already executed)`);
        continue;
      }

      console.log(`  → Running ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`  ✓ ${file} completed`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`  ✗ ${file} failed:`, error.message);
        throw error;
      } finally {
        client.release();
      }
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

/**
 * Rollback last migration (use with caution)
 */
async function rollbackLastMigration() {
  const pool = getPool();

  if (!pool) {
    console.log('Cannot rollback - not using PostgreSQL');
    return;
  }

  console.log('Rolling back last migration...');

  try {
    const result = await pool.query(
      'SELECT name FROM migrations ORDER BY executed_at DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    const lastMigration = result.rows[0].name;
    console.log(`Rollback not implemented for: ${lastMigration}`);
    console.log('Please create a rollback migration manually');
  } catch (error) {
    console.error('Rollback error:', error);
    throw error;
  }
}

module.exports = {
  runMigrations,
  rollbackLastMigration
};
