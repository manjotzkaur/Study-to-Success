// backend/db.js
require('dotenv').config();
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10, // adjust as needed
  queueLimit: 0
});

pool.getConnection((err, connection) => {
  if (err) console.error('❌ MySQL connection error:', err);
  else {
    console.log('✅ Connected to Railway MySQL!');
    if (connection) connection.release();
  }
});

module.exports = pool;
