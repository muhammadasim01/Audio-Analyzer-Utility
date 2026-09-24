const path = require('path');
const fs = require('fs');
const request = require('supertest');
const { Pool } = require('pg');

const createApp = require('../../src/app');

const FIXTURE_MP3 = path.join(__dirname, '../fixtures/sample.mp3');
const TEST_DB_URL = process.env.TEST_DATABASE_URL;

let pool;
let app;

beforeAll(async () => {
  if (!TEST_DB_URL) {
    throw new Error('TEST_DATABASE_URL is not set. Create a test database and add it to .env');
  }

  pool = new Pool({ connectionString: TEST_DB_URL });
  await runMigrations(pool);
  app = createApp(pool);
});

afterAll(async () => {
  await pool.end();
});

afterEach(async () => {
  // clean up uploaded files from disk
  const rows = await pool.query('SELECT file_path FROM audio_files');
  for (const row of rows.rows) {
    if (row.file_path && fs.existsSync(row.file_path)) {
      fs.unlinkSync(row.file_path);
    }
  }
  await pool.query('TRUNCATE audio_files RESTART IDENTITY');
});

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

  test('includes outlier_reason when file is flagged as outlier', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', FIXTURE_MP3, { contentType: 'audio/mpeg', filename: 'sample.mp3' });

    expect(res.status).toBe(201);
    // our sample.mp3 is very short so it should be flagged
    if (res.body.is_outlier) {
      expect(typeof res.body.outlier_reason).toBe('string');
      expect(res.body.outlier_reason.length).toBeGreaterThan(0);
    } else {
      expect(res.body.outlier_reason).toBeNull();
    }
  });

  test('returns 200 with is_duplicate:true when same file is uploaded again', async () => {
    const first = await request(app)
      .post('/api/upload')
      .attach('file', FIXTURE_MP3, { contentType: 'audio/mpeg', filename: 'original.mp3' });
    expect(first.status).toBe(201);

    // second upload — different filename, same content
    const second = await request(app)
      .post('/api/upload')
      .attach('file', FIXTURE_MP3, { contentType: 'audio/mpeg', filename: 'renamed.mp3' });

    expect(second.status).toBe(200);
    expect(second.body.is_duplicate).toBe(true);
    expect(second.body.id).toBe(first.body.id);
  });

  test('duplicate response still includes outlier_reason', async () => {
    await request(app)
      .post('/api/upload')
      .attach('file', FIXTURE_MP3, { contentType: 'audio/mpeg', filename: 'first.mp3' });

    const dup = await request(app)
      .post('/api/upload')
      .attach('file', FIXTURE_MP3, { contentType: 'audio/mpeg', filename: 'second.mp3' });

    expect(dup.status).toBe(200);
    expect(dup.body).toHaveProperty('outlier_reason');
  });

  test('returns 400 when no file is attached', async () => {
    const res = await request(app).post('/api/upload');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 400 when a non-MP3 file is uploaded', async () => {
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

  test('only one record in DB even after uploading the same file twice', async () => {
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

async function runMigrations(dbPool) {
  const migrationsDir = path.join(__dirname, '../../src/db/migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

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
