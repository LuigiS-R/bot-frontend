import { mockDashboard, mockOrders, mockWatchlists } from "./mockData";
import type { PlaceOrderInput } from "./types";

export class ApiError extends Error { constructor(public status: number, public payload: unknown) { super(`API Error ${status}`); } }
export const errorText = (error: any) => error?.payload?.message || error?.message || "An unexpected error occurred.";
const base = () => import.meta.env.VITE_ACCOUNTS_API_BASE_URL || "";

async function request(path: string, init?: RequestInit) {
  const response = await fetch(base() + path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!response.ok) {
    const raw = await response.text();
    let body: unknown = raw;
    try { body = raw ? JSON.parse(raw) : undefined; } catch { /* not JSON, keep raw text */ }
    throw new ApiError(response.status, body);
  }
  if (response.status === 204) return undefined;
  return response.json();
}

// Falls back to demo data when the backend can't be reached (e.g. no local
// server running), so the UI can still be previewed instead of blank/crashed.
function withFallback<T>(mock: T) {
  return (error: unknown) => {
    console.warn("Accounts API unreachable, showing demo data instead.", error);
    return mock;
  };
}

export const accounts = {
  dashboard: () => request("/api/v1/dashboard").catch(withFallback(mockDashboard)),
  account: () => request("/api/v1/account"),
  orders: () => request("/api/v1/orders").catch(withFallback(mockOrders)),
  placeOrder: (input: PlaceOrderInput) => request("/api/v1/orders", { method: "POST", body: JSON.stringify({ ...input, orderType: "LIMIT", timeInForce: "DAY" }) }),
  reconcile: () => request("/api/v1/account/reconcile", { method: "POST" }),
  watchlists: () => request("/api/v1/watchlists").catch(withFallback(mockWatchlists)),
  watchlist: (id: string) => request(`/api/v1/watchlists/${id}`).catch(withFallback(mockWatchlists.find(w => w.watchlist.watchlistId === id) ?? mockWatchlists[0])),
  createWatchlist: (name: string, symbols: string[]) => request("/api/v1/watchlists", { method: "POST", body: JSON.stringify({ name, symbols }) }),
  addTicker: (id: string, ticker: string) => request(`/api/v1/watchlists/${id}/entries`, { method: "POST", body: JSON.stringify({ ticker }) }),
  toggleTicker: (id: string, ticker: string, isActive: boolean) => request(`/api/v1/watchlists/${id}/entries/${ticker}`, { method: "PATCH", body: JSON.stringify({ isActive }) }),
  removeTicker: (id: string, ticker: string) => request(`/api/v1/watchlists/${id}/entries/${ticker}`, { method: "DELETE" }),
  deleteWatchlist: (id: string) => request(`/api/v1/watchlists/${id}`, { method: "DELETE" }),
};
