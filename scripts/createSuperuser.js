/**
 * Create Superuser Script
 * Creates a superuser account for development and testing
 */

const bcrypt = require('bcrypt');
const { getPool } = require('../src/database/pool');

async function createSuperuser() {
  const pool = getPool();

  if (!pool) {
    console.error('❌ Database connection not available');
    console.log('Make sure DATABASE_URL is set in your environment variables');
    process.exit(1);
  }

  console.log('Creating superuser account...');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      ['justin@pattyshack.com', 'justin.admin']
    );

    if (existingUser.rows.length > 0) {
      console.log('⚠️  User already exists. Updating password...');

      // Hash the password
      const hashedPassword = await bcrypt.hash('123456', 10);

      // Update existing user
      await client.query(
        `UPDATE users
         SET password = $1, role = $2, active = true, updated_at = NOW()
         WHERE email = $3`,
        [hashedPassword, 'corporate', 'justin@pattyshack.com']
      );

      console.log('✓ Superuser password updated');
    } else {
      console.log('Creating new superuser...');

      // Hash the password
      const hashedPassword = await bcrypt.hash('123456', 10);

      // Create new superuser
      await client.query(
        `INSERT INTO users (
          id, username, email, password, role,
          first_name, last_name, active, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())`,
        [
          'user-superadmin',
          'justin.admin',
          'justin@pattyshack.com',
          hashedPassword,
          'corporate',
          'Justin',
          'Admin'
        ]
      );

      console.log('✓ Superuser created successfully');
    }

    await client.query('COMMIT');

    console.log('\n✅ Done!');
    console.log('\nLogin credentials:');
    console.log('  Email:    justin@pattyshack.com');
    console.log('  Password: 123456');
    console.log('\n⚠️  IMPORTANT: Change this password after first login!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating superuser:', error.message);
    throw error;
  } finally {
    client.release();
    process.exit(0);
  }
}

// Run the script
createSuperuser().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
