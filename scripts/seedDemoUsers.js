/**
 * Seed Demo Users Script
 * Creates demo users for each role level for development and testing
 */

const bcrypt = require('bcrypt');
const { getPool } = require('../src/database/pool');

const DEMO_PASSWORD = '123456'; // Simple password for demo accounts

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

async function seedDemoUsers() {
  const pool = getPool();

  if (!pool) {
    console.error('❌ Database connection not available');
    console.log('Make sure DATABASE_URL is set in your environment variables');
    process.exit(1);
  }

  console.log('Seeding demo users for development...\n');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Hash the password once
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

    let created = 0;
    let updated = 0;

    for (const user of demoUsers) {
      // Check if user exists
      const existing = await client.query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [user.email, user.username]
      );

      if (existing.rows.length > 0) {
        // Update existing user
        await client.query(
          `UPDATE users
           SET password = $1, role = $2, first_name = $3, last_name = $4,
               phone = $5, active = true, updated_at = NOW()
           WHERE email = $6`,
          [hashedPassword, user.role, user.firstName, user.lastName, user.phone, user.email]
        );
        console.log(`✓ Updated ${user.role.padEnd(10)} - ${user.email}`);
        updated++;
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
        console.log(`✓ Created ${user.role.padEnd(10)} - ${user.email}`);
        created++;
      }
    }

    await client.query('COMMIT');

    console.log('\n✅ Demo users seeded successfully!');
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log('\n📝 All demo users have the same password: 123456');
    console.log('\n👥 Demo Users by Role:');
    console.log('   ├─ Corporate:  justin@pattyshack.com');
    console.log('   ├─ Regional:   regional@pattyshack.com');
    console.log('   ├─ District:   district@pattyshack.com');
    console.log('   ├─ Manager:    manager@pattyshack.com');
    console.log('   └─ Crew:       crew@pattyshack.com');
    console.log('\n⚠️  IMPORTANT: These are demo accounts for development only!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error seeding demo users:', error.message);
    throw error;
  } finally {
    client.release();
    process.exit(0);
  }
}

// Run the script
seedDemoUsers().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
