# Tradify web

Vite/React dashboard for one configured Alpaca-style paper account. This build
is intentionally backend-independent. An in-memory browser service mirrors the
account-service, market-data, and news response shapes: dashboard metrics,
orders, watchlists, market inputs, and news are all available without a server.
Orders can be validated and simulated, positions and account totals are
recalculated after fills, and watchlist mutations remain available for the
current browser session.

```sh
npm ci
npm run dev
```

No environment variables are required. For Vercel, use this directory as the
project root, `npm ci` as the install command, `npm run build` as the build
command, and `dist` as the output directory. Because the service is in-memory,
refreshing the page resets the demo account to its initial state; no real Alpaca
orders or credentials are used.
