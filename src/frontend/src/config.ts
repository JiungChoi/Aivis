// Central runtime configuration.
// Override the backend URL at build/run time with VITE_API_BASE (see .env.example).
export const API_BASE = (import.meta.env.VITE_API_BASE ?? 'http://localhost:5050').replace(/\/+$/, '');
