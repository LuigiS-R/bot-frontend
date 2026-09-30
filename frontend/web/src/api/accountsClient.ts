import {
  addMockTicker,
  createMockOrder,
  createMockWatchlist,
  deleteMockWatchlist,
  getMockActiveTickers,
  getMockDashboard,
  getMockOrders,
  getMockWatchlist,
  getMockWatchlists,
  refreshMockDashboard,
  removeMockTicker,
  toggleMockTicker,
  updateMockWatchlist,
} from "./mockData";
import type { PlaceOrderInput } from "./types";

export class ApiError extends Error {
  constructor(public status: number, public payload: unknown) {
    super(`API Error ${status}`);
  }
}

export const errorText = (error: any) => error?.payload?.message || error?.message || "An unexpected error occurred.";

// Keep a small delay so loading, error, and success states behave like a real
// network-backed client while the application runs entirely in the browser.
function localRequest<T>(operation: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      try { resolve(operation()); }
      catch (error) { reject(error); }
    }, 120);
  });
}

// This is the browser-only replacement for the account-service API. State is
// shared by every page for the lifetime of the tab, but is intentionally not
// persisted: refreshing the page starts a clean demo account.
export const accounts = {
  dashboard: () => localRequest(getMockDashboard),
  account: () => localRequest(() => getMockDashboard().account),
  orders: () => localRequest(getMockOrders),
  placeOrder: (input: PlaceOrderInput) => localRequest(() => createMockOrder(input)),
  reconcile: () => localRequest(refreshMockDashboard),
  watchlists: () => localRequest(getMockWatchlists),
  watchlist: (id: string) => localRequest(() => getMockWatchlist(id)),
  activeTickers: () => localRequest(getMockActiveTickers),
  createWatchlist: (name: string, symbols: string[]) => localRequest(() => createMockWatchlist(name, symbols)),
  updateWatchlist: (id: string, name: string, symbols: string[]) => localRequest(() => updateMockWatchlist(id, name, symbols)),
  addTicker: (id: string, ticker: string) => localRequest(() => addMockTicker(id, ticker)),
  toggleTicker: (id: string, ticker: string, isActive: boolean) => localRequest(() => toggleMockTicker(id, ticker, isActive)),
  removeTicker: (id: string, ticker: string) => localRequest(() => removeMockTicker(id, ticker)),
  deleteWatchlist: (id: string) => localRequest(() => { deleteMockWatchlist(id); return undefined; }),
};
