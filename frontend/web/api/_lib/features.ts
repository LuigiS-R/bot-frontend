import type { AlpacaBar } from "./alpaca";

// Mirrors the eleven market features described in the project's final report
// (Section 3.3, Market Data Service): OHLCV, close-to-close return, MA5, MA20,
// 5-period volatility, RSI14, and MACD (EMA12 - EMA26).
export interface MarketFeatures {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  return: number;
  ma5: number;
  ma20: number;
  volatility5: number;
  rsi14: number;
  macd: number;
}

function sma(values: number[], period: number): number {
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function ema(values: number[], period: number): number {
  const k = 2 / (period + 1);
  let value = values[0];
  for (let i = 1; i < values.length; i++) value = values[i] * k + value * (1 - k);
  return value;
}

function rsi14(closes: number[]): number {
  const period = 14;
  const changes = closes.slice(1).map((c, i) => c - closes[i]);
  const gains = changes.map(c => Math.max(c, 0));
  const losses = changes.map(c => Math.max(-c, 0));

  let avgGain = sma(gains.slice(0, period), period);
  let avgLoss = sma(losses.slice(0, period), period);
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

const MIN_BARS = 27;

export function computeFeatures(bars: AlpacaBar[]): MarketFeatures {
  if (bars.length < MIN_BARS) {
    throw new Error(`Not enough bars to compute market features (need ${MIN_BARS}+, got ${bars.length}).`);
  }
  const closes = bars.map(b => b.c);
  const latest = bars[bars.length - 1];
  const prevClose = bars[bars.length - 2].c;

  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  const last5Returns = returns.slice(-5);
  const meanReturn = last5Returns.reduce((a, b) => a + b, 0) / last5Returns.length;
  const variance = last5Returns.reduce((sum, r) => sum + (r - meanReturn) ** 2, 0) / (last5Returns.length - 1);

  return {
    open: latest.o,
    high: latest.h,
    low: latest.l,
    close: latest.c,
    volume: latest.v,
    return: (latest.c - prevClose) / prevClose,
    ma5: sma(closes, 5),
    ma20: sma(closes, 20),
    volatility5: Math.sqrt(variance),
    rsi14: rsi14(closes),
    macd: ema(closes, 12) - ema(closes, 26),
  };
}
