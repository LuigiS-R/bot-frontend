import { getMockNews, getMockSignalInputs } from "./mockData";
import type { NewsSignal, SignalInputs } from "./types";

// Signal pages use deterministic local fixtures so they remain fully usable
// when the market-data and news services are unavailable.
export const signals = {
  news: async (symbol: string): Promise<{ items: NewsSignal[] }> => ({ items: getMockNews(symbol) }),
  inputs: async (symbol: string): Promise<SignalInputs> => getMockSignalInputs(symbol),
};
