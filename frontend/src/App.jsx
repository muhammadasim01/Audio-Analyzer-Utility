import React, { useState } from 'react';
import UploadForm from './components/UploadForm';
import ResultCard from './components/ResultCard';

export default function App() {
  const [result, setResult] = useState(null);

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', fontFamily: 'Arial, sans-serif' }}>
      <header style={{ background: '#1a1a2e', color: '#fff', padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Audio Analysis Service</h1>
        <p style={{ margin: '0.5rem 0 0', opacity: 0.7, fontSize: '0.95rem' }}>
          Upload an MP3 to get duration, quality score, and duplicate detection
        </p>
      </header>

      <main style={{ maxWidth: 640, margin: '2rem auto', padding: '0 1rem' }}>
        <UploadForm onResult={setResult} />
        {result && <ResultCard result={result} />}
      </main>
    </div>
  );
}
