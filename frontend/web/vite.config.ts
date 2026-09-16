import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The backend doesn't send CORS headers, so a direct browser fetch to it is
// blocked. Production works around this via vercel.json's same-origin
// rewrite; this proxy does the equivalent for local dev (server-to-server,
// not subject to CORS) so the frontend can keep calling relative /api paths.
// Scoped to /api/v1 (not /api) so it doesn't swallow the /api/signals/*
// routes below, which are this project's own serverless functions.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const key of ['ALPACA_API_KEY_ID', 'ALPACA_API_SECRET_KEY', 'HF_TOKEN']) {
    if (!process.env[key] && env[key]) process.env[key] = env[key];
  }

  return {
    plugins: [
      react() as any,
      {
        name: 'signals-api-dev-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url?.startsWith('/api/signals/')) return next();
            const pathname = req.url.split('?')[0];
            const modPath = pathname === '/api/signals/news'
              ? '/api/signals/news.ts'
              : pathname === '/api/signals/inputs'
                ? '/api/signals/inputs.ts'
                : pathname === '/api/signals/analyze'
                  ? '/api/signals/analyze.ts'
                  : null;
            if (!modPath) return next();
            try {
              const mod = await server.ssrLoadModule(modPath);
              let body: string | undefined;
              if (req.method === 'POST') {
                body = await new Promise<string>((resolve, reject) => {
                  let data = '';
                  req.on('data', chunk => { data += chunk; });
                  req.on('end', () => resolve(data));
                  req.on('error', reject);
                });
              }
              const request = new Request(`http://localhost${req.url}`, {
                method: req.method,
                headers: { 'content-type': (req.headers['content-type'] as string) || 'application/json' },
                body,
              });
              const response: Response = await mod.default(request);
              res.statusCode = response.status;
              response.headers.forEach((value, key) => res.setHeader(key, value));
              res.end(await response.text());
            } catch (e) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ message: e instanceof Error ? e.message : 'Dev signals middleware failed.' }));
            }
          });
        },
      },
    ],
    server: {
      proxy: {
        '/api/v1': {
          target: 'http://212.2.247.199:8080',
          changeOrigin: true,
        },
      },
    },
  };
});
