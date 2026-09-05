import axios from 'axios';

// Lokalno (npm run dev) koristi se localhost; na Vercelu se postavlja VITE_API_URL
// (Project Settings -> Environment Variables) da pokazuje na pravu Render adresu backend-a.
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
