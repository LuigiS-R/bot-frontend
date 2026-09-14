import type { Dashboard, Order, Watchlist } from "./types";

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

export const mockOrders: Order[] = [
  { orderId: "demo-order-1", symbol: "AAPL", side: "BUY", quantity: "25", filledQuantity: "25", orderType: "LIMIT", limitPrice: "182.30", status: "FILLED", reason: "Strategy Engine: UP prediction, confidence 0.81", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString() },
  { orderId: "demo-order-2", symbol: "NVDA", side: "BUY", quantity: "10", filledQuantity: "10", orderType: "LIMIT", limitPrice: "118.20", status: "FILLED", reason: "Strategy Engine: UP prediction, confidence 0.77", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(), updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString() },
  { orderId: "demo-order-3", symbol: "TSLA", side: "SELL", quantity: "5", filledQuantity: "0", orderType: "LIMIT", limitPrice: "241.00", status: "PENDING", reason: "Manual order", createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(), updatedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString() },
  { orderId: "demo-order-4", symbol: "MSFT", side: "BUY", quantity: "8", filledQuantity: "0", orderType: "LIMIT", limitPrice: "402.50", status: "REJECTED", reason: "Insufficient buying power", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(), updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString() },
];

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
