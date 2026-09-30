import {
  addMockTicker,
  createMockOrder,
  createMockWatchlist,
  deleteMockWatchlist,
  getMockDashboard,
  getMockOrders,
  getMockWatchlist,
  getMockWatchlists,
  refreshMockDashboard,
  removeMockTicker,
  toggleMockTicker,
} from "./mockData";
import type { PlaceOrderInput } from "./types";

export class ApiError extends Error {
  constructor(public status: number, public payload: unknown) {
    super(`API Error ${status}`);
  }
}

export const errorText = (error: any) => error?.payload?.message || error?.message || "An unexpected error occurred.";

// The backend is intentionally not used in this demo build. These methods keep
// the same interface as the former API client so the pages remain interactive.
export const accounts = {
  dashboard: async () => getMockDashboard(),
  account: async () => getMockDashboard().account,
  orders: async () => getMockOrders(),
  placeOrder: async (input: PlaceOrderInput) => createMockOrder(input),
  reconcile: async () => refreshMockDashboard(),
  watchlists: async () => getMockWatchlists(),
  watchlist: async (id: string) => getMockWatchlist(id),
  createWatchlist: async (name: string, symbols: string[]) => createMockWatchlist(name, symbols),
  addTicker: async (id: string, ticker: string) => addMockTicker(id, ticker),
  toggleTicker: async (id: string, ticker: string, isActive: boolean) => toggleMockTicker(id, ticker, isActive),
  removeTicker: async (id: string, ticker: string) => removeMockTicker(id, ticker),
  deleteWatchlist: async (id: string) => deleteMockWatchlist(id),
};
