import type {
  Dashboard,
  NewsSignal,
  Order,
  PlaceOrderInput,
  SignalInputs,
  Watchlist,
} from "./types";

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const companyNames: Record<string, string> = {
  AAPL: "Apple",
  AMZN: "Amazon",
  AMD: "AMD",
  GOOGL: "Alphabet",
  META: "Meta",
  MSFT: "Microsoft",
  NFLX: "Netflix",
  NVDA: "NVIDIA",
  QQQ: "Invesco QQQ",
  SPY: "S&P 500",
  TSLA: "Tesla",
};

export const mockDashboard: Dashboard = {
  account: {
    accountNumber: "PA-DEMO-0001",
    cash: "75850.24",
    buyingPower: "75850.24",
    equity: "100226.25",
    portfolioValue: "100226.25",
    longMarketValue: "24376.01",
    status: "ACTIVE",
  },
  positions: [
    { symbol: "AAPL", quantity: "25", averageEntryPrice: "182.30", currentPrice: "196.44", costBasis: "4557.50", marketValue: "4911.00", unrealizedPnl: "353.50" },
    { symbol: "NVDA", quantity: "10", averageEntryPrice: "118.20", currentPrice: "129.85", costBasis: "1182.00", marketValue: "1298.50", unrealizedPnl: "116.50" },
    { symbol: "TSLA", quantity: "15", averageEntryPrice: "255.00", currentPrice: "238.75", costBasis: "3825.00", marketValue: "3581.25", unrealizedPnl: "-243.75" },
    { symbol: "MSFT", quantity: "8", averageEntryPrice: "388.50", currentPrice: "402.50", costBasis: "3108.00", marketValue: "3220.00", unrealizedPnl: "112.00" },
    { symbol: "AMZN", quantity: "6", averageEntryPrice: "198.40", currentPrice: "214.72", costBasis: "1190.40", marketValue: "1288.32", unrealizedPnl: "97.92" },
    { symbol: "AMD", quantity: "12", averageEntryPrice: "158.75", currentPrice: "171.36", costBasis: "1905.00", marketValue: "2056.32", unrealizedPnl: "151.32" },
    { symbol: "GOOGL", quantity: "10", averageEntryPrice: "174.20", currentPrice: "196.18", costBasis: "1742.00", marketValue: "1961.80", unrealizedPnl: "219.80" },
    { symbol: "META", quantity: "4", averageEntryPrice: "490.00", currentPrice: "571.42", costBasis: "1960.00", marketValue: "2285.68", unrealizedPnl: "325.68" },
    { symbol: "NFLX", quantity: "2", averageEntryPrice: "680.00", currentPrice: "742.85", costBasis: "1360.00", marketValue: "1485.70", unrealizedPnl: "125.70" },
    { symbol: "SPY", quantity: "4", averageEntryPrice: "520.00", currentPrice: "571.86", costBasis: "2080.00", marketValue: "2287.44", unrealizedPnl: "207.44" },
  ],
  asOf: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
  freshness: "FRESH",
};

export const mockOrders: Order[] = [
  { orderId: "demo-order-1", symbol: "AAPL", side: "BUY", quantity: "25", filledQuantity: "25", orderType: "LIMIT", limitPrice: "182.30", status: "FILLED", reason: "Strategy Engine: UP prediction, confidence 0.81", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString() },
  { orderId: "demo-order-2", symbol: "NVDA", side: "BUY", quantity: "10", filledQuantity: "10", orderType: "LIMIT", limitPrice: "118.20", status: "FILLED", reason: "Strategy Engine: UP prediction, confidence 0.77", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(), updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString() },
  { orderId: "demo-order-3", symbol: "TSLA", side: "SELL", quantity: "5", filledQuantity: "0", orderType: "LIMIT", limitPrice: "241.00", status: "PENDING", reason: "Manual order · awaiting simulated fill", createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(), updatedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString() },
  { orderId: "demo-order-4", symbol: "MSFT", side: "BUY", quantity: "8", filledQuantity: "0", orderType: "LIMIT", limitPrice: "402.50", status: "REJECTED", reason: "Insufficient buying power", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(), updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString() },
];

export const mockWatchlists: Watchlist[] = [
  {
    watchlist: { watchlistId: "demo-momentum", name: "Momentum Leaders", syncStatus: "UNAVAILABLE" },
    entries: [
      { ticker: "AAPL", active: true },
      { ticker: "NVDA", active: true },
      { ticker: "TSLA", active: false },
      { ticker: "MSFT", active: true },
      { ticker: "AMZN", active: true },
      { ticker: "AMD", active: false },
      { ticker: "GOOGL", active: true },
      { ticker: "META", active: true },
      { ticker: "NFLX", active: false },
      { ticker: "SPY", active: true },
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

export function getMockDashboard(): Dashboard {
  return clone(mockDashboard);
}

export function refreshMockDashboard(): Dashboard {
  mockDashboard.asOf = new Date().toISOString();
  return getMockDashboard();
}

export function getMockOrders(): Order[] {
  return clone(mockOrders);
}

export function createMockOrder(input: PlaceOrderInput): Order {
  const now = new Date().toISOString();
  const order: Order = {
    orderId: `demo-order-${Date.now()}`,
    symbol: input.symbol.toUpperCase(),
    side: input.side,
    quantity: input.quantity,
    filledQuantity: "0",
    orderType: "LIMIT",
    limitPrice: input.limitPrice,
    status: "PENDING",
    reason: "Manual demo order · awaiting simulated fill",
    createdAt: now,
    updatedAt: now,
  };
  mockOrders.unshift(order);
  return clone(order);
}

export function getMockWatchlists(): Watchlist[] {
  return clone(mockWatchlists);
}

export function getMockWatchlist(id: string): Watchlist {
  const item = mockWatchlists.find(w => w.watchlist.watchlistId === id);
  if (!item) throw new Error("Watchlist not found");
  return clone(item);
}

export function createMockWatchlist(name: string, symbols: string[]): Watchlist {
  const watchlist: Watchlist = {
    watchlist: {
      watchlistId: `demo-${Date.now()}`,
      name: name.trim() || "New watchlist",
      syncStatus: "UNAVAILABLE",
    },
    entries: symbols.map(ticker => ({ ticker: ticker.toUpperCase(), active: true })),
  };
  mockWatchlists.push(watchlist);
  return clone(watchlist);
}

export function addMockTicker(id: string, ticker: string): Watchlist {
  const item = mockWatchlists.find(w => w.watchlist.watchlistId === id);
  if (!item) throw new Error("Watchlist not found");
  const normalized = ticker.toUpperCase();
  if (!item.entries.some(entry => entry.ticker === normalized)) {
    item.entries.push({ ticker: normalized, active: true });
  }
  return clone(item);
}

export function toggleMockTicker(id: string, ticker: string, isActive: boolean): Watchlist {
  const item = mockWatchlists.find(w => w.watchlist.watchlistId === id);
  if (!item) throw new Error("Watchlist not found");
  const entry = item.entries.find(candidate => candidate.ticker === ticker);
  if (!entry) throw new Error("Ticker not found");
  entry.active = isActive;
  return clone(item);
}

export function removeMockTicker(id: string, ticker: string): Watchlist {
  const item = mockWatchlists.find(w => w.watchlist.watchlistId === id);
  if (!item) throw new Error("Watchlist not found");
  item.entries = item.entries.filter(entry => entry.ticker !== ticker);
  return clone(item);
}

export function deleteMockWatchlist(id: string): void {
  const index = mockWatchlists.findIndex(w => w.watchlist.watchlistId === id);
  if (index >= 0) mockWatchlists.splice(index, 1);
}

interface MarketProfile {
  price: number;
  change: number;
  rsi: number;
  macd: number;
  volatility: number;
  volume: number;
}

const marketProfiles: Record<string, MarketProfile> = {
  AAPL: { price: 196.44, change: 0.0184, rsi: 61.8, macd: 1.42, volatility: 0.014, volume: 48300000 },
  AMZN: { price: 214.72, change: 0.0097, rsi: 57.4, macd: 0.88, volatility: 0.018, volume: 27100000 },
  AMD: { price: 171.36, change: -0.0128, rsi: 44.9, macd: -1.16, volatility: 0.029, volume: 39200000 },
  MSFT: { price: 402.5, change: 0.0061, rsi: 55.7, macd: 0.64, volatility: 0.013, volume: 18600000 },
  NVDA: { price: 129.85, change: 0.0312, rsi: 68.2, macd: 2.74, volatility: 0.026, volume: 178400000 },
  GOOGL: { price: 196.18, change: 0.0142, rsi: 59.3, macd: 1.08, volatility: 0.016, volume: 22400000 },
  META: { price: 571.42, change: 0.0221, rsi: 64.1, macd: 3.12, volatility: 0.021, volume: 15300000 },
  NFLX: { price: 742.85, change: -0.0084, rsi: 48.7, macd: -0.42, volatility: 0.019, volume: 6900000 },
  SPY: { price: 571.86, change: 0.0076, rsi: 56.9, macd: 1.26, volatility: 0.009, volume: 48200000 },
  TSLA: { price: 238.75, change: -0.0215, rsi: 39.6, macd: -2.18, volatility: 0.034, volume: 92400000 },
};

function profileFor(symbol: string): MarketProfile {
  const normalized = symbol.toUpperCase();
  if (marketProfiles[normalized]) return marketProfiles[normalized];
  const seed = Array.from(normalized).reduce((total, character) => total + character.charCodeAt(0), 0);
  const price = 80 + (seed % 320);
  return { price, change: ((seed % 41) - 20) / 1000, rsi: 42 + (seed % 25), macd: ((seed % 31) - 15) / 5, volatility: 0.012 + (seed % 23) / 1000, volume: 12000000 + (seed % 80) * 1000000 };
}

export function getMockSignalInputs(symbol: string): SignalInputs {
  const normalized = symbol.toUpperCase();
  const profile = profileFor(normalized);
  const now = Date.now();
  const series = Array.from({ length: 20 }, (_, index) => {
    const progress = index / 19;
    const wave = Math.sin(index * 0.78 + normalized.length) * profile.price * 0.012;
    const trend = profile.price * (profile.change * (progress - 1));
    return {
      date: new Date(now - (19 - index) * 24 * 60 * 60 * 1000).toISOString(),
      close: Number((profile.price + wave + trend).toFixed(2)),
    };
  });
  const previousClose = series[series.length - 2]?.close ?? profile.price;
  const open = profile.price * (1 - profile.change * 0.35);
  return {
    symbol: normalized,
    asOf: new Date(now - 1000 * 60 * 14).toISOString(),
    features: {
      open: Number(open.toFixed(2)),
      high: Number((Math.max(open, profile.price) * 1.008).toFixed(2)),
      low: Number((Math.min(open, profile.price) * 0.993).toFixed(2)),
      close: profile.price,
      volume: profile.volume,
      return: Number(((profile.price - previousClose) / previousClose).toFixed(4)),
      ma5: Number((profile.price * (1 - profile.change * 0.3)).toFixed(2)),
      ma20: Number((profile.price * (1 - profile.change * 1.1)).toFixed(2)),
      volatility5: profile.volatility,
      rsi14: profile.rsi,
      macd: profile.macd,
    },
    series,
  };
}

export function getMockNews(symbol: string): NewsSignal[] {
  const normalized = symbol.toUpperCase();
  const company = companyNames[normalized] ?? normalized;
  const profile = profileFor(normalized);
  const now = Date.now();
  const bullish = profile.change >= 0;
  return [
    {
      symbol: normalized,
      headline: `${company} keeps its product roadmap on track as demand remains resilient`,
      source: "Market Desk",
      url: "https://example.com/demo-news",
      publishedAt: new Date(now - 1000 * 60 * 75).toISOString(),
      direction: bullish ? "UP" : "DOWN",
      confidence: 0.78,
    },
    {
      symbol: normalized,
      headline: `Analysts review ${company}'s latest operating outlook and valuation range`,
      source: "Analyst Notes",
      url: "https://example.com/demo-news",
      publishedAt: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
      direction: bullish ? "UP" : "DOWN",
      confidence: 0.66,
    },
    {
      symbol: normalized,
      headline: `Trading volume increases as investors position ahead of the next catalyst`,
      source: "Earnings Wire",
      url: "https://example.com/demo-news",
      publishedAt: new Date(now - 1000 * 60 * 60 * 22).toISOString(),
      direction: bullish ? "DOWN" : "UP",
      confidence: 0.54,
    },
  ];
}
