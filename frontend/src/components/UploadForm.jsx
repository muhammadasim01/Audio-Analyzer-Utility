import React, { useRef, useState } from 'react';
import { uploadAudio } from '../api/client';

export default function UploadForm({ onResult }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function handleFileChange(e) {
    const selected = e.target.files[0];
    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith('.mp3')) {
      setError('Only .mp3 files are accepted.');
      setFile(null);
      return;
    }

    setError(null);
    setFile(selected);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    onResult(null);

    try {
      const data = await uploadAudio(file);
      onResult(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const disabled = !file || loading;

  return (
    <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
      <div
        onClick={() => inputRef.current?.click()}
        style={{ border: '2px dashed #c9d3e0', borderRadius: 8, padding: '2rem', textAlign: 'center', cursor: 'pointer', marginBottom: '1rem' }}
      >
        <input ref={inputRef} type="file" accept=".mp3" onChange={handleFileChange} style={{ display: 'none' }} />
        <p style={{ margin: 0, color: file ? '#1a1a2e' : '#8a96a3', fontWeight: file ? 600 : 400 }}>
          {file ? file.name : 'Click to select an MP3 file'}
        </p>
      </div>

      {error && <p style={{ color: '#e53935', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{error}</p>}

      <button
        type="submit"
        disabled={disabled}
        style={{
          width: '100%', padding: '0.75rem', background: '#1a1a2e', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: '1rem', fontWeight: 600,
          opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Analysing…' : 'Upload & Analyse'}
      </button>
    </form>
  );
}
