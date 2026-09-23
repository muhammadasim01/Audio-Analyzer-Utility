require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { createPool } = require('../config/db');

async function migrate() {
  const pool = createPool();
  const client = await pool.connect();

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  try {
    await client.query('BEGIN');

    for (const file of files) {
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
    }

    await client.query('COMMIT');
    console.log('All migrations applied successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
