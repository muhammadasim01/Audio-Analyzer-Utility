function flagOutlier({ durationSec, qualityScore, fileSizeBytes }) {
  if (fileSizeBytes < 10000) return 'File is too small to be real audio (under 10 KB)';
  if (durationSec < 10) return 'Duration is under 10 seconds';
  if (durationSec > 7200) return 'Duration is over 2 hours';
  if (qualityScore < 3.0) return 'Quality score is below 3.0';

  const bytesPerSec = durationSec > 0 ? fileSizeBytes / durationSec : 0;
  if (bytesPerSec < 1000) return 'File size does not match the duration';

  return null;
}

module.exports = { flagOutlier };
