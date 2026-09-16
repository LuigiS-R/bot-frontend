import { classifyHeadline } from "../_lib/finbert";

export const config = { runtime: "edge" };

const MAX_LENGTH = 500;

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ message: "POST required" }), { status: 405 });
  }

  let text = "";
  try {
    const body = await request.json();
    text = String(body?.text ?? "").trim();
  } catch {
    return new Response(JSON.stringify({ message: "Invalid JSON body." }), { status: 400 });
  }

  if (!text) {
    return new Response(JSON.stringify({ message: "text is required" }), { status: 400 });
  }
  if (text.length > MAX_LENGTH) {
    return new Response(JSON.stringify({ message: `text is too long (max ${MAX_LENGTH} characters).` }), { status: 400 });
  }

  try {
    const result = await classifyHeadline(text);
    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analysis failed.";
    return new Response(JSON.stringify({ message }), { status: 502, headers: { "Content-Type": "application/json" } });
  }
}
