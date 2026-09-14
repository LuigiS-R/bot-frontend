const NEWS_URL = "https://data.alpaca.markets/v1beta1/news";
const BARS_URL = "https://data.alpaca.markets/v2/stocks";

function alpacaHeaders(): HeadersInit {
  const keyId = process.env.ALPACA_API_KEY_ID;
  const secretKey = process.env.ALPACA_API_SECRET_KEY;
  if (!keyId || !secretKey) throw new Error("Alpaca credentials are not configured on the server.");
  return { "APCA-API-KEY-ID": keyId, "APCA-API-SECRET-KEY": secretKey };
}

export interface AlpacaNewsItem {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  created_at: string;
  symbols: string[];
}

export async function fetchNews(symbols: string[], limit = 10): Promise<AlpacaNewsItem[]> {
  const url = new URL(NEWS_URL);
  url.searchParams.set("symbols", symbols.join(","));
  url.searchParams.set("limit", String(limit));
  const res = await fetch(url, { headers: alpacaHeaders() });
  if (!res.ok) throw new Error(`Alpaca news request failed (${res.status})`);
  const data = await res.json();
  return data.news ?? [];
}

export interface AlpacaBar { t: string; o: number; h: number; l: number; c: number; v: number; }

// Alpaca's default lookback window (no explicit start) can come back empty depending on
// how recently the market last traded, so we always pass an explicit start date.
export async function fetchBars(symbol: string, lookbackDays = 90, limit = 100): Promise<AlpacaBar[]> {
  const start = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const url = new URL(`${BARS_URL}/${encodeURIComponent(symbol)}/bars`);
  url.searchParams.set("timeframe", "1Day");
  url.searchParams.set("start", start);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("feed", "iex");
  url.searchParams.set("adjustment", "raw");
  const res = await fetch(url, { headers: alpacaHeaders() });
  if (!res.ok) throw new Error(`Alpaca bars request failed (${res.status})`);
  const data = await res.json();
  return data.bars ?? [];
}
