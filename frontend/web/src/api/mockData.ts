import type { Dashboard, Watchlist } from "./types";

export const mockDashboard: Dashboard = {
  account: {
    accountNumber: "PA-DEMO-0001",
    // Started from $100,000 cash; the remainder reflects the cost basis of the positions below,
    // so cash + market value of positions reconciles to equity.
    cash: "90435.50",
    buyingPower: "90435.50",
    equity: "100226.25",
    portfolioValue: "100226.25",
    longMarketValue: "9790.75",
    status: "ACTIVE",
  },
  positions: [
    { symbol: "AAPL", quantity: "25", averageEntryPrice: "182.30", currentPrice: "196.44", costBasis: "4557.50", marketValue: "4911.00", unrealizedPnl: "353.50" },
    { symbol: "NVDA", quantity: "10", averageEntryPrice: "118.20", currentPrice: "129.85", costBasis: "1182.00", marketValue: "1298.50", unrealizedPnl: "116.50" },
    { symbol: "TSLA", quantity: "15", averageEntryPrice: "255.00", currentPrice: "238.75", costBasis: "3825.00", marketValue: "3581.25", unrealizedPnl: "-243.75" },
  ],
  asOf: new Date().toISOString(),
  freshness: "UNAVAILABLE",
};

export const mockWatchlists: Watchlist[] = [
  {
    watchlist: { watchlistId: "demo-momentum", name: "Momentum Leaders", syncStatus: "UNAVAILABLE" },
    entries: [
      { ticker: "AAPL", active: true },
      { ticker: "NVDA", active: true },
      { ticker: "TSLA", active: false },
    ],
  },
  {
    watchlist: { watchlistId: "demo-earnings", name: "Earnings Watch", syncStatus: "UNAVAILABLE" },
    entries: [
      { ticker: "MSFT", active: true },
      { ticker: "AMZN", active: true },
    ],
  },
];
