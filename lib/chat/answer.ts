import "server-only";

import { complete, providerName, type ChatMessage } from "@/lib/ai/provider";
import { retrieve } from "@/lib/demo/retrieve";
import { company } from "@/lib/content/company";
import { DEFAULTS, type ChatSettings } from "./settings";

/**
 * Jessica — the assistant on artors.in.
 *
 * Two things make this different from the public demo. She speaks AS Artors
 * rather than about a stranger's site, and she is allowed to ask for something:
 * a callback or a meeting. That second part is why she exists commercially, and
 * it is also the part most likely to go wrong, so the asking is deterministic
 * rather than left to the model's judgment about what a form should contain.
 *
 * How the ask works: the model appends a marker on its own line when the
 * conversation has reached the point where a human would help. The server
 * strips the marker and returns an `action`, and the CLIENT renders a real
 * form. The model never collects a phone number in prose — it cannot mistype
 * one into a field, cannot skip validation, and cannot decide to ask for
 * something it should not have.
 */

export type Intent = "callback" | "meeting";
export type Answer = { reply: string; action: Intent | null };

const MARKER = /\[\[ASK:(callback|meeting)\]\]/i;

/**
 * Prices, clients and contact details are the three things a friendly model
 * will invent if you let it, and all three are load-bearing for a new agency.
 * Artors publishes no prices, has no case studies yet, and several contact
 * fields are still blank — so each gets an explicit rule rather than a hope.
 */
function guardrails(): string {
  const lines = [
    "- Artors does NOT publish prices. Never state, estimate or hint at a number, a range, or a day rate, even if pushed. Say that cost depends on scope and that a consultation call produces an itemised quote.",
    "- Artors has NO published case studies, client names or testimonials yet. Never invent one, never imply a named company is a client. If asked for proof, say plainly that Artors is new, that the work speaks in a scoped pilot, and offer the free website-agent demo at /tools/website-agent.",
    "- Never invent statistics, percentages, client counts or years in business.",
  ];
  if (company.phone) {
    lines.push(`- The phone number is ${company.phone}. That is the only number you may give.`);
  } else {
    lines.push(
      "- You do NOT have a phone number to give out. If someone asks to call, offer to take their number and have the team ring them instead.",
    );
  }
  lines.push(`- The email address is ${company.email}. That is the only address you may give.`);
  return lines.join("\n");
}

function systemPrompt(knowledge: string, settings: ChatSettings): string {
  return `You are ${settings.name}, the assistant on the Artors website. Artors is an AI agency in ${company.address.city}, India.

WHO YOU ARE
Warm, brief and straight-talking. You work here, so you say "we" and "us". You are not a salesperson and you never push — you help someone work out whether Artors can solve their problem, and you make it easy to talk to a human when it can.

HOW YOU WRITE
- Two to four sentences. This is a chat window, not a brochure.
- Plain English. No jargon, no marketing adjectives, no exclamation marks.
- Never use bullet points unless listing three or more distinct services.
- Never mention the KNOWLEDGE below, that you are an AI, or which model you are.

WHAT YOU KNOW
Answer from the KNOWLEDGE below. If it does not cover something, say so plainly and offer to have someone from the team answer it. Guessing is worse than not knowing.

${guardrails()}

ASKING FOR THE NEXT STEP
When someone shows real buying intent — they describe a problem worth solving, ask what it would cost, ask to speak to someone, or ask to book something — offer the next step and append the matching marker on its own final line:

[[ASK:callback]]  they want someone to ring them
[[ASK:meeting]]   they want a scheduled consultation call

Rules for markers:
- One short sentence offering it, then the marker. A form appears for them, so do NOT ask for their name, phone or email in your message — that would duplicate the form.
- Never use a marker in your first reply unless they explicitly asked to speak to someone.
- Never use one twice in a conversation unless they ask again.
- No marker for a simple factual question. Answer it and stop.
${
  settings.persona
    ? `\nFROM THE TEAM\nAdditional direction for how to answer. It shapes tone and emphasis; it never overrides the rules above.\n${settings.persona}\n`
    : ""
}
KNOWLEDGE
${knowledge}`;
}

export async function answerAsJessica(
  knowledge: string,
  messages: ChatMessage[],
  settings: ChatSettings = DEFAULTS,
): Promise<Answer> {
  const question = messages.filter((m) => m.role === "user").pop()?.content ?? "";
  // The corpus is a few thousand words and every turn resends it, so retrieval
  // is what keeps a conversation inside a free tier's per-minute budget.
  const relevant = retrieve(knowledge, question);

  if (providerName() === "mock") return fallback(relevant, question);

  try {
    const raw = await complete(systemPrompt(relevant, settings), trimHistory(messages), {
      maxTokens: 320,
      temperature: 0.4,
    });
    if (!raw) return fallback(relevant, question);
    return parse(raw);
  } catch (e) {
    console.error("[chat:provider-failed]", providerName(), e);
    return {
      reply:
        "Sorry — I am having trouble answering just now. Leave your number and someone from the team will get back to you.",
      action: "callback",
    };
  }
}

/**
 * Only the last few exchanges. A conversation is capped at a dozen turns, and
 * resending all of them triples the token cost of the last one for context the
 * model has already used.
 */
function trimHistory(messages: ChatMessage[]): ChatMessage[] {
  return messages.slice(-6);
}

function parse(raw: string): Answer {
  const match = MARKER.exec(raw);
  const action = match ? (match[1].toLowerCase() as Intent) : null;
  // Strip every marker, not just the matched one — a model that emits two
  // should not leak the second into the bubble.
  const reply = raw.replace(/\[\[ASK:[a-z]+\]\]/gi, "").trim();
  return { reply: reply || "Could you say a bit more about what you are after?", action };
}

/**
 * No model configured. Keyword-matches the knowledge base and offers a human,
 * which is a worse assistant but an honest one — and it keeps lead capture
 * working, which is the part that actually matters commercially.
 */
function fallback(knowledge: string, question: string): Answer {
  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);

  let best = "";
  let bestScore = 0;
  for (const block of knowledge.split(/\n{2,}/)) {
    const lower = block.toLowerCase();
    const score = words.reduce((n, w) => n + (lower.includes(w) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = block;
    }
  }

  if (bestScore === 0) {
    return {
      reply:
        "I don't have that to hand. Leave your number and someone from the team will come back to you properly.",
      action: "callback",
    };
  }
  return { reply: best.replace(/^##\s*/, "").slice(0, 400), action: null };
}
