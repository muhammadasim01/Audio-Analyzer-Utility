const { formatDuration, computeQualityScore } = require('../../src/services/audioAnalysis');
const { flagOutlier } = require('../../src/services/outlierService');

describe('formatDuration', () => {
  test('zero seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  test('pads single-digit seconds', () => {
    expect(formatDuration(65)).toBe('1:05');
  });

  test('exactly 60 seconds', () => {
    expect(formatDuration(60)).toBe('1:00');
  });

  test('over an hour', () => {
    expect(formatDuration(3661)).toBe('61:01');
  });

  test('truncates fractional seconds', () => {
    expect(formatDuration(187.9)).toBe('3:07');
  });
});

describe('computeQualityScore', () => {
  test('returns 10.0 for 320kbps 44100Hz with high density', () => {
    const score = computeQualityScore({
      bitrate: 320000,
      sampleRate: 44100,
      fileSizeBytes: 4000000,
      durationSec: 100,
    });
    expect(score).toBe(10.0);
  });

  test('low score when bitrate/sampleRate are null and density is tiny', () => {
    const score = computeQualityScore({
      bitrate: null,
      sampleRate: null,
      fileSizeBytes: 100,
      durationSec: 100,
    });
    expect(score).toBeLessThan(5.0);
  });

  test('score stays between 1 and 10', () => {
    const score = computeQualityScore({
      bitrate: 128000,
      sampleRate: 44100,
      fileSizeBytes: 1500000,
      durationSec: 90,
    });
    expect(score).toBeGreaterThanOrEqual(1);
    expect(score).toBeLessThanOrEqual(10);
  });

  test('score is rounded to 1 decimal place', () => {
    const score = computeQualityScore({
      bitrate: 192000,
      sampleRate: 44100,
      fileSizeBytes: 2000000,
      durationSec: 80,
    });
    expect(score).toBe(Math.round(score * 10) / 10);
  });

  test('null bitrate falls back to neutral — score is between 64k and 320k', () => {
    const withNull = computeQualityScore({ bitrate: null, sampleRate: 44100, fileSizeBytes: 2000000, durationSec: 50 });
    const with64k  = computeQualityScore({ bitrate: 64000, sampleRate: 44100, fileSizeBytes: 2000000, durationSec: 50 });
    const with320k = computeQualityScore({ bitrate: 320000, sampleRate: 44100, fileSizeBytes: 2000000, durationSec: 50 });
    expect(withNull).toBeGreaterThan(with64k);
    expect(withNull).toBeLessThan(with320k);
  });
});

describe('flagOutlier', () => {
  const normal = { durationSec: 180, qualityScore: 7.0, fileSizeBytes: 500000 };

  test('normal file is not flagged', () => {
    expect(flagOutlier(normal)).toBe(false);
  });

  test('too short (< 10s)', () => {
    expect(flagOutlier({ ...normal, durationSec: 5 })).toBe(true);
  });

  test('too long (> 2h)', () => {
    expect(flagOutlier({ ...normal, durationSec: 7201 })).toBe(true);
  });

  test('quality score below 3.0', () => {
    expect(flagOutlier({ ...normal, qualityScore: 2.9 })).toBe(true);
  });

  test('file smaller than 10KB', () => {
    expect(flagOutlier({ ...normal, fileSizeBytes: 9999 })).toBe(true);
  });

  test('byte density too low (50 bytes / 180s)', () => {
    expect(flagOutlier({ ...normal, fileSizeBytes: 50 })).toBe(true);
  });
});
