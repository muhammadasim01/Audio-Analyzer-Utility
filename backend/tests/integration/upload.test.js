'use strict';

const path = require('path');
const fs = require('fs');
const request = require('supertest');
const { Pool } = require('pg');

const createApp = require('../../src/app');
const migrate = require('../../src/db/migrate');

const FIXTURE_MP3 = path.join(__dirname, '../fixtures/sample.mp3');
const TEST_DB_URL = process.env.TEST_DATABASE_URL;

let pool;
let app;

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

beforeAll(async () => {
  if (!TEST_DB_URL) {
    throw new Error(
      'TEST_DATABASE_URL is not set. Create a test database and add it to .env'
    );
  }

  pool = new Pool({ connectionString: TEST_DB_URL });
  // Run migrations against the test database
  await runMigrations(pool);

  app = createApp(pool);
});

afterAll(async () => {
  await pool.end();
});

afterEach(async () => {
  // Reset state between tests — delete disk files too
  const rows = await pool.query('SELECT file_path FROM audio_files');
  for (const row of rows.rows) {
    if (row.file_path && fs.existsSync(row.file_path)) {
      fs.unlinkSync(row.file_path);
    }
  }
  await pool.query('TRUNCATE audio_files RESTART IDENTITY');
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/upload', () => {
  test('returns 201 with analysis result for a valid MP3', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', FIXTURE_MP3, { contentType: 'audio/mpeg', filename: 'sample.mp3' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      is_duplicate: false,
      is_outlier: expect.any(Boolean),
      quality_score: expect.any(Number),
      duration_sec: expect.any(Number),
      duration_fmt: expect.any(String),
      sha256_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(res.body.quality_score).toBeGreaterThanOrEqual(1);
    expect(res.body.quality_score).toBeLessThanOrEqual(10);
  });

  test('returns 200 with is_duplicate:true when same file is uploaded again', async () => {
    // First upload
    const first = await request(app)
      .post('/api/upload')
      .attach('file', FIXTURE_MP3, { contentType: 'audio/mpeg', filename: 'original.mp3' });
    expect(first.status).toBe(201);

    // Second upload — different filename, same content
    const second = await request(app)
      .post('/api/upload')
      .attach('file', FIXTURE_MP3, { contentType: 'audio/mpeg', filename: 'renamed.mp3' });

    expect(second.status).toBe(200);
    expect(second.body.is_duplicate).toBe(true);
    expect(second.body.id).toBe(first.body.id);
  });

  test('returns 400 when no file is attached', async () => {
    const res = await request(app).post('/api/upload');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 400 when a non-MP3 file is uploaded', async () => {
    // Create a temporary text file
    const tmpPath = path.join(__dirname, '../fixtures/fake.txt');
    fs.writeFileSync(tmpPath, 'not an mp3');

    try {
      const res = await request(app)
        .post('/api/upload')
        .attach('file', tmpPath, { contentType: 'text/plain', filename: 'fake.mp3' });
      expect(res.status).toBe(400);
    } finally {
      fs.unlinkSync(tmpPath);
    }
  });

  test('persists exactly one record in the database per unique file', async () => {
    await request(app)
      .post('/api/upload')
      .attach('file', FIXTURE_MP3, { contentType: 'audio/mpeg', filename: 'a.mp3' });

    await request(app)
      .post('/api/upload')
      .attach('file', FIXTURE_MP3, { contentType: 'audio/mpeg', filename: 'b.mp3' });

    const { rows } = await pool.query('SELECT COUNT(*) FROM audio_files');
    expect(parseInt(rows[0].count, 10)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Helper: run migrations inline
// ---------------------------------------------------------------------------

async function runMigrations(dbPool) {
  const migrationsDir = path.join(__dirname, '../../src/db/migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const client = await dbPool.connect();
  try {
    await client.query('BEGIN');
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
