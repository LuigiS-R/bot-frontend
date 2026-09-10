import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The backend doesn't send CORS headers, so a direct browser fetch to it is
// blocked. Production works around this via vercel.json's same-origin
// rewrite; this proxy does the equivalent for local dev (server-to-server,
// not subject to CORS) so the frontend can keep calling relative /api paths.
export default defineConfig({
  plugins: [react() as any],
  server: {
    proxy: {
      '/api': {
        target: 'http://212.2.247.199:8080',
        changeOrigin: true,
      },
    },
  },
});
