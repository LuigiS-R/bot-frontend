const SPACE_BASE = "https://andreamena-finbert-stock-news-impact-api.hf.space";

export interface SentimentResult {
  direction: "UP" | "DOWN";
  confidence: number;
}

// The Space runs Gradio, whose HTTP API is enqueue-then-poll: POST starts the call and
// returns an event_id, then GET on that event_id streams Server-Sent Events until "complete".
// Anonymous calls hit a low shared ZeroGPU quota almost immediately, so every call is
// authenticated with our own HF token for a per-user quota instead.
function hfHeaders(extra?: HeadersInit): HeadersInit {
  const token = process.env.HF_TOKEN;
  if (!token) throw new Error("HF_TOKEN is not configured on the server.");
  return { Authorization: `Bearer ${token}`, ...extra };
}

export async function classifyHeadline(text: string): Promise<SentimentResult> {
  const postRes = await fetch(`${SPACE_BASE}/gradio_api/call/predict`, {
    method: "POST",
    headers: hfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ data: [text] }),
  });
  if (!postRes.ok) throw new Error(`FinBERT space request failed (${postRes.status})`);
  const { event_id } = await postRes.json();

  const streamRes = await fetch(`${SPACE_BASE}/gradio_api/call/predict/${event_id}`, { headers: hfHeaders() });
  const raw = await streamRes.text();

  if (/event:\s*error/.test(raw)) throw new Error("FinBERT space returned an error.");
  const match = raw.match(/event:\s*complete\s*\ndata:\s*(.*)/);
  if (!match) throw new Error("FinBERT space did not return a result.");

  const [result] = JSON.parse(match[1]) as [{ label: "UP" | "DOWN"; confidence: number }];
  return { direction: result.label, confidence: result.confidence };
}
