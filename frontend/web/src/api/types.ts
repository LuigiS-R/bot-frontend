export type Freshness = "FRESH" | "STALE" | "UNAVAILABLE";
export interface Account { accountNumber?: string; cash?: string; buyingPower?: string; portfolioValue?: string; equity?: string; longMarketValue?: string; lastSyncedAt?: string; status?: string; }
export interface Position { symbol: string; quantity?: string; averageEntryPrice?: string; currentPrice?: string; costBasis?: string; marketValue?: string; unrealizedPnl?: string; }
export interface Order {
  orderId?: string;
  symbol?: string;
  side?: string;
  quantity?: string;
  filledQuantity?: string;
  orderType?: string;
  limitPrice?: string;
  status?: string;
  reason?: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface PlaceOrderInput { symbol: string; side: "BUY" | "SELL"; quantity: string; limitPrice: string; }
export interface Dashboard { account?: Account; positions: Position[]; asOf?: string; freshness: Freshness; }
export interface WatchlistEntry { ticker: string; active: boolean; }
export interface Watchlist { watchlist: { watchlistId: string; name: string; syncStatus?: string }; entries: WatchlistEntry[]; }

export interface NewsSignal {
  symbol: string;
  headline: string;
  source: string;
  url: string;
  publishedAt: string;
  direction: "UP" | "DOWN" | null;
  confidence: number | null;
}
export interface MarketFeatures {
  open: number; high: number; low: number; close: number; volume: number;
  return: number; ma5: number; ma20: number; volatility5: number; rsi14: number; macd: number;
}
export interface PricePoint { date: string; close: number; }
export interface SignalInputs { symbol: string; asOf?: string; features: MarketFeatures; series: PricePoint[]; }
