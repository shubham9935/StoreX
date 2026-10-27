const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const migrationDirectory = path.resolve(__dirname, '../../database/migrations');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined. Add it to the backend/.env file.');
  }

  const migrations = fs.readdirSync(migrationDirectory)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  await pool.query(
    `CREATE TABLE IF NOT EXISTS storex_schema_migrations (
       name TEXT PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`
  );

  for (const migration of migrations) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const applied = await client.query(
        'SELECT 1 FROM storex_schema_migrations WHERE name = $1',
        [migration]
      );

      if (applied.rows.length > 0) {
        await client.query('COMMIT');
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationDirectory, migration), 'utf8');
      await client.query(sql);
      await client.query(
        'INSERT INTO storex_schema_migrations (name) VALUES ($1)',
        [migration]
      );
      await client.query('COMMIT');
      console.log(`Applied migration: ${migration}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

migrate()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());