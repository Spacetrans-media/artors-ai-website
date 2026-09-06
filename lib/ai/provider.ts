import "server-only";

/**
 * The one place the site talks to a language model.
 *
 * Both the public demo and Jessica route through here, so a change of vendor
 * is a change of environment variables rather than a change of code. Chosen by
 * DEMO_PROVIDER, defaulting to whichever key is present:
 *
 *   anthropic  ANTHROPIC_API_KEY   best quality
 *   gemini     GEMINI_API_KEY      a genuinely free tier
 *   openai     OPENAI_API_KEY      and ANY OpenAI-compatible endpoint
 *   none       —                   caller falls back to something honest
 *
 * The openai path is deliberately the widest door. Groq, Together, Fireworks,
 * OpenRouter, DeepSeek, vLLM and a local Ollama or LM Studio all speak the
 * same /chat/completions shape, so DEMO_BASE_URL retargets it without another
 * adapter. One provider, most of the market.
 */

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type Provider = "anthropic" | "gemini" | "openai" | "mock";

export function providerName(): Provider {
  const forced = process.env.DEMO_PROVIDER?.toLowerCase();
  if (forced === "anthropic" || forced === "gemini" || forced === "openai" || forced === "mock") {
    return forced;
  }
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GEMINI_API_KEY) return "gemini";
  // A self-hosted endpoint often needs no key at all, so the base URL alone
  // is enough to say "there is a model here".
  if (process.env.DEMO_BASE_URL) return "openai";
  return "mock";
}

export function hasModel(): boolean {
  return providerName() !== "mock";
}

export type CompleteOptions = {
  /** Output ceiling. Counts against a free tier's per-minute budget too. */
  maxTokens?: number;
  temperature?: number;
};

/**
 * Runs one completion. Throws on any provider error — callers decide what a
 * failure should look like to the visitor, because the right answer differs:
 * the demo degrades to a keyword match, Jessica offers a human instead.
 */
export async function complete(
  system: string,
  messages: ChatMessage[],
  opts: CompleteOptions = {},
): Promise<string> {
  const provider = providerName();
  const maxTokens = opts.maxTokens ?? 400;
  const temperature = opts.temperature ?? 0.3;

  if (provider === "anthropic") return viaAnthropic(system, messages, maxTokens);
  if (provider === "gemini") return viaGemini(system, messages, maxTokens, temperature);
  if (provider === "openai") return viaOpenAiCompatible(system, messages, maxTokens, temperature);
  throw new Error("No model provider configured.");
}

async function viaAnthropic(
  system: string,
  messages: ChatMessage[],
  maxTokens: number,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.DEMO_MODEL || "claude-sonnet-5",
      max_tokens: maxTokens,
      // The system block repeats on every turn, so caching it makes the
      // second and later questions in a conversation much cheaper.
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages,
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.content?.[0]?.text?.trim() || "";
}

async function viaGemini(
  system: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number,
): Promise<string> {
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
        generationConfig: { maxOutputTokens: maxTokens, temperature },
      }),
    },
  );
  if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

/**
 * Any OpenAI-compatible /chat/completions endpoint.
 *
 * DEMO_BASE_URL retargets it: https://api.groq.com/openai/v1,
 * https://openrouter.ai/api/v1, http://localhost:11434/v1 for Ollama. Only the
 * base URL, the key and the model name change.
 */
async function viaOpenAiCompatible(
  system: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number,
): Promise<string> {
  const base = (process.env.DEMO_BASE_URL || "https://api.openai.com/v1").replace(/[/]+$/, "");
  const key = process.env.OPENAI_API_KEY;
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(key ? { authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify({
      model: process.env.DEMO_MODEL || "gpt-4o-mini",
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok) throw new Error(`openai-compatible ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content?.trim() || "";
}
