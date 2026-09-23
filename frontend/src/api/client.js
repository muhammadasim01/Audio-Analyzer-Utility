import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
});

export async function uploadAudio(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post('/api/upload', form);
  return res.data;
}
