/**
 * Creates the initial admin user after migration.
 * Run ONCE: node src/database/seed-admin.js
 *
 * This script is safe to re-run — it will skip if admin already exists.
 */
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const mysql = require('mysql2/promise');
const config = require('../config');
const logger = require('../utils/logger');

async function seedAdmin() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
    });

    // Check if admin already exists
    const [existing] = await connection.execute(
      `SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'admin' LIMIT 1`
    );

    if (existing.length > 0) {
      logger.info('Admin user already exists. Skipping seed.');
      return;
    }

    // Get admin role id
    const [roles] = await connection.execute(
      `SELECT id FROM roles WHERE name = 'admin'`
    );

    if (roles.length === 0) {
      logger.error('Admin role not found. Run migration first: npm run migrate');
      process.exit(1);
    }

    const adminRoleId = roles[0].id;

    // Create admin user
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('Admin@123', salt);
    const uuid = uuidv4();

    await connection.execute(
      `INSERT INTO users (uuid, name, email, phone, password, role_id, branch_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuid, 'System Admin', 'admin@bimanocrm.com', null, hashedPassword, adminRoleId, null]
    );

    logger.info('─────────────────────────────────────────');
    logger.info('Admin user created successfully!');
    logger.info('Email:    admin@bimanocrm.com');
    logger.info('Password: Admin@123');
    logger.info('─────────────────────────────────────────');
    logger.info('IMPORTANT: Change this password after first login!');
  } catch (error) {
    logger.error('Seed admin failed:', error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

if (require.main === module) {
  seedAdmin().then(() => process.exit(0));
}

module.exports = { seedAdmin };
