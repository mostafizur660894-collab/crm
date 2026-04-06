const mysql = require('mysql2/promise');
const config = require('../config');
const logger = require('../utils/logger');

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: config.db.waitForConnections,
  connectionLimit: config.db.connectionLimit,
  queueLimit: config.db.queueLimit,
  charset: 'utf8mb4',
});

// Test connection on startup
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    logger.info('MySQL connected successfully');
    connection.release();
    return true;
  } catch (error) {
    logger.error('MySQL connection failed:', error.message);
    throw error;
  }
}

module.exports = { pool, testConnection };
