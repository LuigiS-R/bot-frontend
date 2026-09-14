import { fetchBars } from "../_lib/alpaca";
import { computeFeatures } from "../_lib/features";

export const config = { runtime: "edge" };

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol")?.trim().toUpperCase();

  if (!symbol) {
    return new Response(JSON.stringify({ message: "symbol query param is required" }), { status: 400 });
  }

  try {
    const bars = await fetchBars(symbol, 90, 100);
    const features = computeFeatures(bars);
    const series = bars.slice(-30).map(b => ({ date: b.t, close: b.c }));
    const body = { symbol, asOf: bars[bars.length - 1]?.t, features, series };
    return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Inputs request failed.";
    return new Response(JSON.stringify({ message }), { status: 502, headers: { "Content-Type": "application/json" } });
  }
}
