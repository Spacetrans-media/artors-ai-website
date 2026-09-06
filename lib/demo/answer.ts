import "server-only";

/**
 * The demo's model call.
 *
 * Provider-swappable, the same decision BigLead made and for the same reason:
 * the model will change twice a year and nothing else should have to. Chosen
 * by DEMO_PROVIDER, defaulting to whichever key is present.
 *
 *   anthropic  ANTHROPIC_API_KEY   best quality
 *   gemini     GEMINI_API_KEY      has a genuinely free tier — fine for a demo
 *   mock       none                canned replies; exercises the whole pipeline
 *
 * MOCK is not a placeholder to be removed. It is how the crawler, the caps,
 * the rate limiting and the UI get tested without spending anything, and it is
 * what the page falls back to if a key is ever missing in production — a demo
 * that degrades to something honest beats one that 500s.
 */

export type ChatMessage = { role: "user" | "assistant"; content: string };

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

function providerName(): "anthropic" | "gemini" | "mock" {
  const forced = process.env.DEMO_PROVIDER?.toLowerCase();
  if (forced === "anthropic" || forced === "gemini" || forced === "mock") return forced;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return "mock";
}

export function activeProvider(): string {
  return providerName();
}

export async function answer(
  context: string,
  messages: ChatMessage[],
  siteName: string,
): Promise<string> {
  const provider = providerName();
  const system = `${SYSTEM}\n\nCONTEXT — the website of ${siteName}:\n\n${context}`;

  try {
    if (provider === "anthropic") return await viaAnthropic(system, messages);
    if (provider === "gemini") return await viaGemini(system, messages);
    return viaMock(context, messages);
  } catch (e) {
    console.error("[demo:provider-failed]", provider, e);
    return "Something went wrong reaching the model. Try again in a moment.";
  }
}

async function viaAnthropic(system: string, messages: ChatMessage[]): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.DEMO_MODEL || "claude-sonnet-5",
      max_tokens: 400,
      // The context is the same on every turn, so caching it makes the second
      // and later questions in a conversation much cheaper.
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages,
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.content?.[0]?.text?.trim() || "No answer came back.";
}

async function viaGemini(system: string, messages: ChatMessage[]): Promise<string> {
  const model = process.env.DEMO_MODEL || "gemini-flash-latest";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: 400, temperature: 0.3 },
      }),
    },
  );
  if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "No answer came back.";
}

/**
 * No key configured. Rather than fake intelligence, this does something honest
 * and still useful: a keyword lookup over the crawled text, returning the
 * sentence that best matches. It proves the crawl worked and the plumbing is
 * connected, and it says so.
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
