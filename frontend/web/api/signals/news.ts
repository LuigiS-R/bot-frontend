import { fetchNews } from "../_lib/alpaca";
import { classifyHeadline } from "../_lib/finbert";

export const config = { runtime: "edge" };

const MAX_HEADLINES = 5;

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const symbols = (url.searchParams.get("symbols") ?? "")
    .split(",")
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);

  if (symbols.length === 0) {
    return new Response(JSON.stringify({ message: "symbols query param is required" }), { status: 400 });
  }

  try {
    const news = await fetchNews(symbols, MAX_HEADLINES);
    // The FinBERT Space runs on a single free ZeroGPU worker, which errors out under
    // concurrent load even when authenticated — classify one headline at a time.
    const items = [];
    for (const item of news.slice(0, MAX_HEADLINES)) {
      const matchedSymbol = item.symbols.find(s => symbols.includes(s)) ?? symbols[0];
      const base = {
        symbol: matchedSymbol,
        headline: item.headline,
        source: item.source,
        url: item.url,
        publishedAt: item.created_at,
      };
      try {
        const sentiment = await classifyHeadline(item.headline);
        items.push({ ...base, direction: sentiment.direction, confidence: sentiment.confidence });
      } catch {
        items.push({ ...base, direction: null, confidence: null });
      }
    }
    return new Response(JSON.stringify({ items }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Signals request failed.";
    return new Response(JSON.stringify({ message }), { status: 502, headers: { "Content-Type": "application/json" } });
  }
}
