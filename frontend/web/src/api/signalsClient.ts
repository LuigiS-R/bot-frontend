import { getMockNews, getMockSignalInputs } from "./mockData";
import type { NewsSignal, SignalInputs } from "./types";

function localRequest<T>(operation: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      try { resolve(operation()); }
      catch (error) { reject(error); }
    }, 120);
  });
}

// This replaces the market-data, news-ingestion, and prediction-service calls
// with deterministic local computations. It keeps the same response shapes
// and asynchronous behavior as the former backend client.
export const signals = {
  news: (symbol: string): Promise<{ items: NewsSignal[] }> => localRequest(() => ({ items: getMockNews(symbol) })),
  inputs: (symbol: string): Promise<SignalInputs> => localRequest(() => getMockSignalInputs(symbol)),
};
