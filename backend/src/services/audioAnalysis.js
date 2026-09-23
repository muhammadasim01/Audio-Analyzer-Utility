const mm = require('music-metadata');

function formatDuration(totalSeconds) {
  const secs = Math.floor(totalSeconds);
  const mins = Math.floor(secs / 60);
  const remaining = secs % 60;
  return `${mins}:${String(remaining).padStart(2, '0')}`;   // it will return like this mm:ss
}

// bitrate score — 320kbps is best, below 64kbps is bad, mising = neutral
function scoreBitrate(bitrate) {
  if (bitrate == null) return 0.5;
  if (bitrate < 64000) return 0;
  if (bitrate >= 320000) return 1;
  if (bitrate < 128000) return ((bitrate - 64000) / 64000) * 0.4;
  if (bitrate < 192000) return 0.4 + ((bitrate - 128000) / 64000) * 0.3;
  return 0.7 + ((bitrate - 192000) / 128000) * 0.3;
}

// 44100Hz (CD quality) = 1.0, anything lower pulls the score down
function scoreSampleRate(sr) {
  if (sr == null) return 0.5;
  if (sr < 22050) return 0;
  if (sr === 22050) return 0.4;
  if (sr >= 44100) return 1;
  return 0.4 + ((sr - 22050) / (44100 - 22050)) * 0.6;
}

// checks if the file size makes sence for how long the audio is
function scoreDensity(fileSize, duration) {
  if (!duration || duration <= 0) return 0;
  return Math.min((fileSize / duration) / 40000, 1);
}

function computeQualityScore({ bitrate, sampleRate, fileSizeBytes, durationSec }) {
  const raw =
    scoreBitrate(bitrate) * 0.5 +
    scoreSampleRate(sampleRate) * 0.3 +
    scoreDensity(fileSizeBytes, durationSec) * 0.2;

  return Math.round((1 + raw * 9) * 10) / 10;
}

async function parseAudioFile(filePath, fileSizeBytes) {
  const metadata = await mm.parseFile(filePath, { duration: true });
  const { duration, bitrate, sampleRate } = metadata.format;

  const durationSec = duration || 0;

  return {
    durationSec,
    durationFmt: formatDuration(durationSec),
    bitrate: bitrate ? Math.round(bitrate) : null,
    sampleRate: sampleRate ? Math.round(sampleRate) : null,
    qualityScore: computeQualityScore({
      bitrate: bitrate || null,
      sampleRate: sampleRate || null,
      fileSizeBytes,
      durationSec,
    }),
  };
}

module.exports = {
  parseAudioFile,
  formatDuration,
  computeQualityScore,
  scoreBitrate,
  scoreSampleRate,
  scoreDensity,
};
