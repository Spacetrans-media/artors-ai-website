import "server-only";

import { complete, providerName, type ChatMessage } from "@/lib/ai/provider";
import { retrieve } from "./retrieve";

export type { ChatMessage };

/**
 * The demo's answer.
 *
 * Model plumbing lives in lib/ai/provider.ts; what belongs here is the one
 * rule that makes this demo worth showing — answer only from the visitor's own
 * pages — and an honest fallback for when no key is configured.
 */

const SYSTEM = `You are a website assistant for the business described in the CONTEXT below.

Rules, in order:
1. Answer ONLY from the CONTEXT. It is the text of that company's own website.
2. If the answer is not in the CONTEXT, say plainly that the page doesn't cover
   it and suggest they ask the business directly. Never guess a price, a phone
   number, an address or an opening time.
3. Be brief. Two or three sentences unless asked for more.
4. Write as the business would to its own customer: plain, warm, no jargon,
   no marketing adjectives.
5. Never mention the CONTEXT, the crawl, or that you are an AI model.`;

export function activeProvider(): string {
  return providerName();
}

export async function answer(
  context: string,
  messages: ChatMessage[],
  siteName: string,
): Promise<string> {
  // Only the passages that bear on this question. Sending the whole crawl on
  // every turn burns a free tier's per-minute token budget on a single answer,
  // and buries the relevant sentence in navigation text.
  const question = messages.filter((m) => m.role === "user").pop()?.content ?? "";
  const relevant = retrieve(context, question);
  const system = `${SYSTEM}\n\nCONTEXT — the website of ${siteName}:\n\n${relevant}`;

  if (providerName() === "mock") return viaMock(context, messages);

  try {
    const reply = await complete(system, messages, { maxTokens: 400, surface: "demo" });
    return reply || "No answer came back.";
  } catch (e) {
    console.error("[demo:provider-failed]", providerName(), e);
    return "Something went wrong reaching the model. Try again in a moment.";
  }
}

/**
 * No key configured. Rather than fake intelligence, this does something honest
 * and still useful: a keyword lookup over the crawled text, returning the
 * sentence that best matches. It proves the crawl worked and the plumbing is
 * connected, and it says so.
 *
 * MOCK is not a placeholder to be removed. It is how the crawler, the caps,
 * the rate limiting and the UI get tested without spending anything, and it is
 * what the page falls back to if a key is ever missing in production — a demo
 * that degrades to something honest beats one that 500s.
 */
function viaMock(context: string, messages: ChatMessage[]): string {
  const question = messages.filter((m) => m.role === "user").pop()?.content ?? "";
  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const sentences = context.split(/(?<=[.!?])\s+/).filter((s) => s.length > 60);
  let best = "";
  let bestScore = 0;
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    const score = words.reduce((n, w) => n + (lower.includes(w) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = sentence;
    }
  }

  if (bestScore === 0) {
    return "Demo mode: no model key is configured, so this is a keyword match over the pages we read, and nothing matched your question. With a model connected it would answer this properly.";
  }
  return `${best.trim().slice(0, 400)}\n\n(Demo mode — matched from the site's own text. With a model connected the answer would be written properly rather than quoted.)`;
}
