require('dotenv').config();

const { createPool } = require('./config/db');
const createApp = require('./app');

const PORT = process.env.PORT || 3001;

async function start() {
  const pool = createPool();

  // quick db sanity check before we start accpeting requests
  try {
    const client = await pool.connect();
    client.release();
    console.log('Database connection established.');
  } catch (err) {
    console.error('Failed to connect to database:', err.message);
    process.exit(1);
  }

  const app = createApp(pool);
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

start();
