function flagOutlier({ durationSec, qualityScore, fileSizeBytes }) {
  if (fileSizeBytes < 10000) return true;       // too small to be real audio
  if (durationSec < 10) return true;            // probaly a clip or broken file
  if (durationSec > 7200) return true;          // over 2 hours is unusual
  if (qualityScore < 3.0) return true;          // really bad quality

  const bytesPerSec = durationSec > 0 ? fileSizeBytes / durationSec : 0;
  if (bytesPerSec < 1000) return true;          // file size dosent match duration

  return false;
}

module.exports = { flagOutlier };
