# Frontend

The React UI is a self-contained paper-trading demo. It uses realistic local
fixtures for the dashboard, orders, watchlists, market inputs, and news signals;
no backend service or environment variable is required.

```sh
cd frontend/web
npm ci
npm run dev
```

Create a production build with `npm run build` and deploy `frontend/web` to
Vercel with `dist` as the output directory.
