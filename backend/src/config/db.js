const { Pool } = require('pg');
const { DATABASE_URL } = require('./env');

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined. Add it to the backend/.env file.');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
