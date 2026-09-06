import "server-only";
import { getDb, schema } from "@/lib/db";

/**
 * Jessica's configuration.
 *
 * Every field has a code default, and the database only ever overrides one.
 * That ordering is the point: the widget works on a fresh install before the
 * table exists, keeps working if someone empties a field, and degrades to
 * something sensible rather than blank if the database is unreachable.
 */

export type ChatSettings = {
  enabled: boolean;
  name: string;
  tagline: string;
  openingMessage: string;
  greetingTitle: string;
  greetingText: string;
  greetingMode: "first_visit" | "every_session" | "off";
  greetingDelay: number;
  suggestions: string[];
  persona: string;
  maxTurns: number;
};

export const DEFAULTS: ChatSettings = {
  enabled: true,
  name: "Jessica",
  tagline: "Artors — usually replies instantly",
  openingMessage:
    "Hi, I am Jessica. I can tell you what we build, how projects run, and what it would take for your business. What are you trying to fix?",
  greetingTitle: "Ask Jessica",
  greetingText: "I am online — how can I help you today?",
  greetingMode: "first_visit",
  greetingDelay: 4,
  suggestions: [
    "What does Artors do?",
    "What would it cost?",
    "Can you automate WhatsApp enquiries?",
    "I want to speak to someone",
  ],
  persona: "",
  maxTurns: 12,
};

/** A blank column means "use the default", not "show nothing". */
function text(value: string | null | undefined, fallback: string): string {
  const v = value?.trim();
  return v ? v : fallback;
}

export async function getChatSettings(): Promise<ChatSettings> {
  const db = getDb();
  if (!db) return DEFAULTS;

  try {
    const [row] = await db.select().from(schema.chatSettings).limit(1);
    if (!row) return DEFAULTS;

    const suggestions = (row.suggestions ?? [])
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);

    return {
      enabled: row.enabled,
      name: text(row.name, DEFAULTS.name),
      tagline: text(row.tagline, DEFAULTS.tagline),
      openingMessage: text(row.openingMessage, DEFAULTS.openingMessage),
      greetingTitle: text(row.greetingTitle, DEFAULTS.greetingTitle),
      greetingText: text(row.greetingText, DEFAULTS.greetingText),
      greetingMode: row.greetingMode,
      // Clamped rather than trusted: a 0 would fire the bubble before the page
      // has painted, and a 600 would fire it after everyone has left.
      greetingDelay: Math.min(Math.max(row.greetingDelay, 1), 60),
      suggestions: suggestions.length ? suggestions : DEFAULTS.suggestions,
      persona: row.persona?.trim() ?? "",
      // The upper bound is a spend control, so the admin form cannot raise it
      // past what the ceilings in store.ts are sized for.
      maxTurns: Math.min(Math.max(row.maxTurns, 2), 30),
    };
  } catch (e) {
    // A settings read failing must not take the assistant down.
    console.error("[chat:settings-failed]", e);
    return DEFAULTS;
  }
}

/** What the browser is allowed to know. `persona` stays on the server. */
export type PublicChatSettings = Omit<ChatSettings, "persona">;

export function toPublic(s: ChatSettings): PublicChatSettings {
  const { persona: _persona, ...rest } = s;
  return rest;
}
