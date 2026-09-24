# Audio Upload & Analysis Service

Upload an MP3 file and get back info about it,  how long it is, a quality score, and whether you've uploaded it before.

**Stack:** Node.js + Express, PostgreSQL, React + Vite

---

## How to run it locally

**You'll need:** Node.js 18+ and PostgreSQL 14+

### 1. Install dependancies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Set up the database

Create two databases in Postgres (one for dev, one for tests):

```bash
createdb audio_service
createdb audio_service_test
```

Then copy the example env file and fill in your Postgres credentails:

```bash
cd backend
cp .env.example .env
```

### 3. Run migrations

```bash
cd backend
npm run migrate
```

### 4. Start the backend

```bash
npm run dev
```

Runs on `http://localhost:3001`. You can check its working by hitting `/health`.

### 5. Start the frontend

```bash
cd frontend
npm run dev
```

Opens on `http://localhost:5173`.

### 6. Run tests

```bash
cd backend
npm test
```

---

## API

### POST /api/upload

Send an MP3 file as `multipart/form-data` using the field name `file`. Max size is 50 MB.

**New file (201):**

```json
{
  "id": 1,
  "original_name": "song.mp3",
  "duration_sec": 187.4,
  "duration_fmt": "3:07",
  "bitrate": 320000,
  "sample_rate": 44100,
  "quality_score": 9.8,
  "is_outlier": false,
  "is_duplicate": false,
  "sha256_hash": "a3f1...c9d2",
  "file_size": 7340032,
  "created_at": "2026-09-23T10:00:00.000Z"
}
```

**Same file uploaded again (200):**

Returns the original record with `"is_duplicate": true`. Nothing gets stored twice.

**Wrong file type (400):**

```json
{ "error": "Only .mp3 files are accepted" }
```

---

## Architecture overview

When you upload a file, here's what happens:

1. Multer saves it to the `uploads/` folder
2. I hash the file (SHA-256) and check if I've seen it before
3. If its a duplicate, I delete the new copy and return the existing record
4. If it's new, I read the audio metadata (duration, bitrate, sample rate), compute a quality score, check if it looks like an outlier, and save everything to Postgres

The app is split into small focused files — `hashService`, `audioAnalysis`, `outlierService` — so each thing can be tested on its own. The database pool is passed into `createApp()` instead of being a global, wich makes the integration tests easier to wire up.

---

## Quality score

The score goes from 1 to 10. It's based on three things:

- **Bitrate (50%)** — higher bitrate = better sound. 320kbps gets a 10, below 64kbps gets close to 1.
- **Sample rate (30%)** — 44.1kHz (CD quality) is the target. Lower than that pulls the score down.
- **File density (20%)** — file size divided by duration. Catches files where the header says it's long but the actual data is tiny.

If bitrate or sample rate isnt in the file's metadata, I use 0.5 (neutral) so I'm not punishing files unfairly.

**Why these signals?** I picked bitrate, sample rate, and file density because they're the most reliable indicators you can get without doing actual audio signal processing. Bitrate directly controls how much audio data is kept after compression — a 320kbps file keeps way more detail than a 64kbps one, so it gets the highest weight. Sample rate decides the highest frequency the audio can reproduce — anything below 44.1kHz (CD standard) is cutting off audible frequencies. File density is more of a sanity check — if a file claims to be 5 minutes long but is only 20KB, something is clearly wrong. These three together give a good enough picture of quality without needing any ML or heavy audio analysis.

---

## Outlier flag

A file gets flagged as an outlier if any of these are true:

- Under 10 seconds (probaly a sound effect or broken file)
- Over 2 hours
- Quality score below 3.0
- File is smaller than 10 KB
- Way too little data for how long it claims to be (under 1000 bytes/sec)

It's just a warning — the file still gets stored and returned.

---

## Duplicate detection

I hash the file's actual bytes with SHA-256 and check if that hash already exists in the database.

- Renaming the file doesnt matter — same bytes = same hash = detected as duplicate
- Re-encoding the same song at a diffrent bitrate will produce a different hash, so that won't be caught
- When a duplicate is found, the newly uploaded file is deleted right away so I dont waste disk space

---

## Assumptions

- Only MP3 files are accepted (other formats return a 400 error)
- Files are stored localy in `backend/uploads/` — fine for now, would need object storage (S3 etc.) to scale
- No login or auth — the endpoint is open
- `music-metadata` v7 is used (not v11) because v11 is ESM-only and would break Jest without extra config
- Single user / low traffic — the service isn't designed for many concurrent uploads at once
- Files are treated as trusted content, theres no virus scanning or deep content validation beyond MIME type and extension checks
- The outlier thresholds (10s, 2h, score < 3.0) are opinionated defaults that might not fit every use case
- The quality score is a rough estimate based on metadata only, not actual audio signal analysis

---

## Trade-offs

- **Analysis happens during the upload request**, its fast enough for now (usualy under 100ms), but for a high-traffic service you'd want to push it to a background job queue
- **SHA-256 only catches exact duplicates**, same audio re-encoded won't be caught; that's a much harder problem
- **Local file storage**, works for a single server, doesnt work if you scale horizontally
- **No file size check on the frontend**, the client lets you pick any size file and you only find out its too big after uploading. Checking before upload would save bandwith
- **No streaming upload**, the whole file is saved to disk before analysis starts. Streaming would reduce memory pressure for large files but adds complexity
- **Outlier reason is computed, not stored**, I calculate it on the fly instead of saving it in the database. Keeps the schema simpler but means a small recalculation on duplicate responses

---

## What I'd improve with more time

- Move audio analysis to a background job so uploads return instantly
- Add S3/R2 storage instead of local disk
- Rate limiting on the upload endpoint
- Upload history page in the UI with a GET /api/uploads endpoint
- Support for more audio formats (WAV, FLAC)
- File size check on the frontend before uploading — show an error right away if the file is over 50MB
- Upload progress bar so you can see how far along larger files are
- Drag and drop support on the upload area
- Cleanup job for orphaned files — if the server crashes mid-upload the file stays on disk with no DB record
- Sanitize original filenames before storing them — strip special characters
