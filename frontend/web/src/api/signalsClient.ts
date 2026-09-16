import { ApiError } from "./accountsClient";
import type { NewsSignal, SignalInputs } from "./types";

async function request(path: string, init?: RequestInit) {
  const response = await fetch(path, init);
  if (!response.ok) {
    const raw = await response.text();
    let body: unknown = raw;
    try { body = raw ? JSON.parse(raw) : undefined; } catch { /* not JSON, keep raw text */ }
    throw new ApiError(response.status, body);
  }
  return response.json();
}

export const signals = {
  news: (symbol: string): Promise<{ items: NewsSignal[] }> => request(`/api/signals/news?symbols=${encodeURIComponent(symbol)}`),
  inputs: (symbol: string): Promise<SignalInputs> => request(`/api/signals/inputs?symbol=${encodeURIComponent(symbol)}`),
  // Runs arbitrary text through the same fine-tuned FinBERT model used for real news
  // headlines — a live model call, not a client-side keyword-matching simulation.
  analyze: (text: string): Promise<{ direction: "UP" | "DOWN"; confidence: number }> =>
    request("/api/signals/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) }),
};
