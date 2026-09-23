import React from 'react';

export default function ResultCard({ result }) {
  const { original_name, duration_fmt, duration_sec, quality_score, bitrate, sample_rate, file_size, is_outlier, is_duplicate, sha256_hash, created_at } = result;

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
      <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', wordBreak: 'break-all', color: '#1a1a2e' }}>{original_name}</h2>

      {is_duplicate && (
        <div style={{ background: '#fff8e1', color: '#f57f17', border: '1px solid #ffe082', borderRadius: 6, padding: '0.5rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>
          Duplicate — this file was already uploaded
        </div>
      )}

      {is_outlier && (
        <div style={{ background: '#fce4ec', color: '#c62828', border: '1px solid #ef9a9a', borderRadius: 6, padding: '0.5rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>
          Outlier detected — check README for threshold details
        </div>
      )}

      <QualityMeter score={quality_score} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
        <Stat label="Duration"     value={`${duration_fmt} (${Number(duration_sec).toFixed(1)}s)`} />
        <Stat label="Quality"      value={`${quality_score} / 10`} />
        <Stat label="Bitrate"      value={bitrate ? `${Math.round(bitrate / 1000)} kbps` : 'N/A'} />
        <Stat label="Sample Rate"  value={sample_rate ? `${(sample_rate / 1000).toFixed(1)} kHz` : 'N/A'} />
        <Stat label="File Size"    value={formatBytes(file_size)} />
        <Stat label="Uploaded"     value={new Date(created_at).toLocaleString()} />
      </div>

      <details style={{ borderTop: '1px solid #eee', paddingTop: '0.75rem' }}>
        <summary style={{ cursor: 'pointer', fontSize: '0.875rem', color: '#8a96a3' }}>SHA-256 hash</summary>
        <code style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.75rem', wordBreak: 'break-all', color: '#555' }}>{sha256_hash}</code>
      </details>
    </div>
  );
}

function QualityMeter({ score }) {
  const pct = ((score - 1) / 9) * 100;
  const color = score >= 7 ? '#43a047' : score >= 4 ? '#fb8c00' : '#e53935';

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.35rem', color: '#555' }}>
        <span>Audio Quality</span>
        <span style={{ color, fontWeight: 700 }}>{score}/10</span>
      </div>
      <div style={{ height: 10, background: '#eee', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 5, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ background: '#f5f7fa', borderRadius: 8, padding: '0.6rem 0.75rem' }}>
      <span style={{ display: 'block', fontSize: '0.75rem', color: '#8a96a3', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1a1a2e' }}>{value}</span>
    </div>
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
