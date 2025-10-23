/**
 * Auto-Seed Demo Users on Startup
 * Automatically creates demo users when the app starts in Railway
 * Only runs if SEED_DEMO_USERS=true is set
 */

const bcrypt = require('bcrypt');
const { getPool } = require('../src/database/pool');

const DEMO_PASSWORD = '123456';

const demoUsers = [
  {
    id: 'user-justin-admin',
    username: 'justin.admin',
    email: 'justin@pattyshack.com',
    role: 'corporate',
    firstName: 'Justin',
    lastName: 'Newbold',
    phone: '555-0001'
  },
  {
    id: 'user-demo-crew',
    username: 'crew.demo',
    email: 'crew@pattyshack.com',
    role: 'crew',
    firstName: 'Demo',
    lastName: 'Crew',
    phone: '555-0002'
  },
  {
    id: 'user-demo-manager',
    username: 'manager.demo',
    email: 'manager@pattyshack.com',
    role: 'manager',
    firstName: 'Demo',
    lastName: 'Manager',
    phone: '555-0003'
  },
  {
    id: 'user-demo-district',
    username: 'district.demo',
    email: 'district@pattyshack.com',
    role: 'district',
    firstName: 'Demo',
    lastName: 'District',
    phone: '555-0004'
  },
  {
    id: 'user-demo-regional',
    username: 'regional.demo',
    email: 'regional@pattyshack.com',
    role: 'regional',
    firstName: 'Demo',
    lastName: 'Regional',
    phone: '555-0005'
  }
];

async function autoSeedDemoUsers() {
  // Only run if SEED_DEMO_USERS environment variable is set to true
  if (process.env.SEED_DEMO_USERS !== 'true') {
    console.log('Auto-seed skipped (SEED_DEMO_USERS not enabled)');
    return;
  }

  const pool = getPool();

  if (!pool) {
    console.log('⚠️  Database not available, skipping auto-seed');
    return;
  }

  console.log('🌱 Auto-seeding demo users...');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Hash the password once
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const user of demoUsers) {
      // Check if user exists
      const existing = await client.query(
        'SELECT id, password FROM users WHERE email = $1',
        [user.email]
      );

      if (existing.rows.length > 0) {
        // User exists - check if password needs updating
        const existingPassword = existing.rows[0].password;

        // Only update if password is the placeholder from old seeds
        if (existingPassword === '$2a$10$hashedpassword') {
          await client.query(
            `UPDATE users
             SET password = $1, role = $2, first_name = $3, last_name = $4,
                 phone = $5, active = true, updated_at = NOW()
             WHERE email = $6`,
            [hashedPassword, user.role, user.firstName, user.lastName, user.phone, user.email]
          );
          console.log(`  ✓ Updated ${user.role.padEnd(10)} - ${user.email}`);
          updated++;
        } else {
          console.log(`  ⊘ Skipped ${user.role.padEnd(10)} - ${user.email} (already has valid password)`);
          skipped++;
        }
      } else {
        // Create new user
        await client.query(
          `INSERT INTO users (
            id, username, email, password, role,
            first_name, last_name, phone, active, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())`,
          [
            user.id,
            user.username,
            user.email,
            hashedPassword,
            user.role,
            user.firstName,
            user.lastName,
            user.phone
          ]
        );
        console.log(`  ✓ Created ${user.role.padEnd(10)} - ${user.email}`);
        created++;
      }
    }

    await client.query('COMMIT');

    console.log(`✅ Demo users ready! (Created: ${created}, Updated: ${updated}, Skipped: ${skipped})`);
    if (created > 0 || updated > 0) {
      console.log('   All demo accounts password: 123456');
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error auto-seeding demo users:', error.message);
    // Don't throw error - let the app continue starting even if seed fails
  } finally {
    client.release();
  }
}

module.exports = { autoSeedDemoUsers };
