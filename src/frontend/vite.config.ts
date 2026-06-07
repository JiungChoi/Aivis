import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: true,
    hmr: {
      host: 'localhost',
      port: 5173,
    },
    // Docker on macOS does not deliver inotify events through bind mounts,
    // so file changes never trigger HMR. Polling makes the watcher reliable
    // inside the container (slightly higher CPU, fine for dev).
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
  build: {
    outDir: 'dist',
  },
});
