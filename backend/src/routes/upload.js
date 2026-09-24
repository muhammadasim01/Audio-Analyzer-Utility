const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');

const { sha256File } = require('../services/hashService');
const { parseAudioFile } = require('../services/audioAnalysis');
const { flagOutlier } = require('../services/outlierService');

const router = express.Router();

const UPLOAD_DIR = path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, name);
  },
});

function fileFilter(req, file, cb) {
  const ok = file.mimetype === 'audio/mpeg' && path.extname(file.originalname).toLowerCase() === '.mp3';
  if (ok) {
    cb(null, true);
  } else {
    const err = new Error('Only .mp3 files are accepted');
    err.status = 400;
    cb(err, false);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE_BYTES || '52428800', 10) },
});

router.post('/upload', upload.single('file'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Use field name "file".' });
  }

  const { pool } = req.app.locals;
  const { path: filePath, originalname, size: fileSize } = req.file;

  try {
    const hash = await sha256File(filePath);

    const existing = await pool.query('SELECT * FROM audio_files WHERE sha256_hash = $1', [hash]);
    if (existing.rows.length > 0) {
      fs.unlink(filePath, () => {});
      const row = existing.rows[0];
      const outlierReason = flagOutlier({
        durationSec: parseFloat(row.duration_sec),
        qualityScore: parseFloat(row.quality_score),
        fileSizeBytes: row.file_size,
      });
      return res.status(200).json({ ...formatRow(row), is_duplicate: true, outlier_reason: outlierReason });
    }

    const analysis = await parseAudioFile(filePath, fileSize);
    const outlierReason = flagOutlier({
      durationSec: analysis.durationSec,
      qualityScore: analysis.qualityScore,
      fileSizeBytes: fileSize,
    });

    const { rows } = await pool.query(
      `INSERT INTO audio_files
        (sha256_hash, original_name, file_path, file_size,
         duration_sec, duration_fmt, bitrate, sample_rate,
         quality_score, is_outlier, is_duplicate)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [hash, originalname, filePath, fileSize,
       analysis.durationSec, analysis.durationFmt,
       analysis.bitrate, analysis.sampleRate,
       analysis.qualityScore, !!outlierReason, false]
    );

    return res.status(201).json({ ...formatRow(rows[0]), outlier_reason: outlierReason });
  } catch (err) {
    fs.unlink(filePath, () => {});
    next(err);
  }
});

function formatRow(row) {
  return {
    id: row.id,
    sha256_hash: row.sha256_hash,
    original_name: row.original_name,
    file_size: row.file_size,
    duration_sec: parseFloat(row.duration_sec),
    duration_fmt: row.duration_fmt,
    bitrate: row.bitrate,
    sample_rate: row.sample_rate,
    quality_score: parseFloat(row.quality_score),
    is_outlier: row.is_outlier,
    is_duplicate: row.is_duplicate,
    created_at: row.created_at,
  };
}

module.exports = router;
