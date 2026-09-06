import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { ChatMessage } from "@/lib/ai/provider";

/**
 * Persistence and spend control for the chat.
 *
 * Jessica sits on every page and calls a model, which makes her the one thing
 * on this site a stranger can run up a bill with. The ceilings are the same
 * shape as the demo's and read from the database for the same reason: a
 * restart must not hand an abuser a fresh budget.
 *
 * The transcript is saved on every turn rather than at the end, because most
 * conversations have no end — the visitor closes the tab. A half-finished
 * conversation that shows what someone wanted is still worth reading.
 */

export const MAX_TURNS_PER_SESSION = 12;
export const MAX_SESSIONS_PER_IP_PER_DAY = 6;
export const MAX_TURNS_SITE_PER_DAY = 800;

export type Verdict = { ok: true } | { ok: false; error: string };

function since(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function loadSession(sessionKey: string) {
  const db = getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(schema.chatSessions)
    .where(eq(schema.chatSessions.sessionKey, sessionKey))
    .limit(1);
  return row ?? null;
}

/**
 * Checked before the model is called, and it fails OPEN on a database error:
 * a chat that stops working because a count query failed is a worse outcome
 * than a chat that briefly has no ceiling.
 */
export async function checkAllowed(
  sessionKey: string,
  ip: string,
  maxTurns: number = MAX_TURNS_PER_SESSION,
): Promise<Verdict> {
  const db = getDb();
  if (!db) return { ok: true };

  try {
    const existing = await loadSession(sessionKey);
    if (existing && existing.turns >= maxTurns) {
      return {
        ok: false,
        error: `We have covered a fair bit here. Leave your number and someone from the team will pick it up properly.`,
      };
    }

    const [[perIp], [total]] = await Promise.all([
      db
        .select({ n: sql<number>`count(*)` })
        .from(schema.chatSessions)
        .where(
          and(eq(schema.chatSessions.ip, ip), gte(schema.chatSessions.createdAt, since(24))),
        ),
      db
        .select({ n: sql<number>`coalesce(sum(turns), 0)` })
        .from(schema.chatSessions)
        .where(gte(schema.chatSessions.createdAt, since(24))),
    ]);

    if (Number(total?.n ?? 0) >= MAX_TURNS_SITE_PER_DAY) {
      return {
        ok: false,
        error:
          "I am at my limit for today. Leave your number and the team will get back to you.",
      };
    }
    if (!existing && Number(perIp?.n ?? 0) >= MAX_SESSIONS_PER_IP_PER_DAY) {
      return {
        ok: false,
        error: "That is a few conversations today. Leave your number and we will call you.",
      };
    }
    return { ok: true };
  } catch (e) {
    console.error("[chat:limit-check-failed]", e);
    return { ok: true };
  }
}

export async function saveTurn(args: {
  sessionKey: string;
  ip: string;
  userAgent?: string;
  sourcePath?: string;
  messages: ChatMessage[];
  intent?: "callback" | "meeting" | null;
}): Promise<void> {
  const db = getDb();
  if (!db) return;

  const turns = args.messages.filter((m) => m.role === "user").length;

  try {
    await db
      .insert(schema.chatSessions)
      .values({
        sessionKey: args.sessionKey,
        ip: args.ip,
        userAgent: args.userAgent?.slice(0, 256),
        sourcePath: args.sourcePath?.slice(0, 200),
        messages: args.messages,
        turns,
        intent: args.intent ?? "none",
      })
      .onDuplicateKeyUpdate({
        set: {
          messages: args.messages,
          turns,
          // An intent already recorded is not cleared by a later plain turn —
          // the conversation asked for a callback whether or not it still is.
          ...(args.intent ? { intent: args.intent } : {}),
        },
      });
  } catch (e) {
    // Losing a transcript must never lose the answer the visitor is waiting for.
    console.error("[chat:save-failed]", e);
  }
}

/** Links a captured lead back to the conversation that produced it. */
export async function attachLead(sessionKey: string, leadId: number | null): Promise<void> {
  const db = getDb();
  if (!db || !leadId) return;
  try {
    await db
      .update(schema.chatSessions)
      .set({ leadId })
      .where(eq(schema.chatSessions.sessionKey, sessionKey));
  } catch (e) {
    console.error("[chat:attach-lead-failed]", e);
  }
}
