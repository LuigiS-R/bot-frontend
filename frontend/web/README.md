# Tradify web

Vite/React dashboard for one configured Alpaca-style paper account. This build
is intentionally backend-independent: dashboard metrics, orders, watchlists,
market inputs, and news are realistic local mock data, and interactions remain
available in the current browser session.

```sh
npm ci
npm run dev
```

No environment variables are required. For Vercel, use this directory as the
project root, `npm ci` as the install command, `npm run build` as the build
command, and `dist` as the output directory.
