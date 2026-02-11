const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'empleof_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '-05:00',
  dateStrings: true
});

const promisePool = pool.promise();

async function waitForConnection() {
  const maxRetries = 10;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await promisePool.query('SELECT 1');
      return;
    } catch (err) {
      if (attempt >= maxRetries) throw err;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

promisePool.waitForConnection = waitForConnection;

module.exports = promisePool;
