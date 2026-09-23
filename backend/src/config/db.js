const { Pool } = require('pg');

function createPool(overrides = {}) {
  return new Pool({
    connectionString: overrides.connectionString || process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ...overrides,
  });
}

module.exports = { createPool };
