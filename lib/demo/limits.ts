import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

/**
 * Spend control for the demo.
 *
 * A free, unauthenticated endpoint that calls a paid model is an invitation to
 * spend someone else's money. Three ceilings, cheapest check first:
 *
 *   - per IP, per day: how many sites one visitor may crawl
 *   - per session: how many questions per site
 *   - site-wide, per day: the hard stop that protects the bill
 *
 * All three read from the database rather than memory, because a restart must
 * not reset an attacker's budget — the same reasoning as the admin lockout.
 */

export const MAX_SITES_PER_IP_PER_DAY = 5;
export const MAX_MESSAGES_PER_SESSION = 8;
export const MAX_DEMOS_PER_DAY = 300;

function since(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

export type LimitVerdict = { ok: true } | { ok: false; error: string };

export async function checkCrawlAllowed(ip: string): Promise<LimitVerdict> {
  const db = getDb();
  if (!db) return { ok: true }; // No database: the demo degrades, it does not block.

  try {
    const [[perIp], [total]] = await Promise.all([
      db
        .select({ n: sql<number>`count(*)` })
        .from(schema.demoSessions)
        .where(
          and(eq(schema.demoSessions.ip, ip), gte(schema.demoSessions.createdAt, since(24))),
        ),
      db
        .select({ n: sql<number>`count(*)` })
        .from(schema.demoSessions)
        .where(gte(schema.demoSessions.createdAt, since(24))),
    ]);

    if (Number(total?.n ?? 0) >= MAX_DEMOS_PER_DAY) {
      return {
        ok: false,
        error: "The demo has hit its limit for today. Book a call and we will show you live.",
      };
    }
    if (Number(perIp?.n ?? 0) >= MAX_SITES_PER_IP_PER_DAY) {
      return {
        ok: false,
        error: `You have tried ${MAX_SITES_PER_IP_PER_DAY} sites today, which is the limit. Book a call if you want to go further.`,
      };
    }
    return { ok: true };
  } catch (e) {
    console.error("[demo:limit-check-failed]", e);
    return { ok: true };
  }
}

/**
 * Increments the message count and reports whether the session may continue.
 *
 * Scoped to the last 24 hours, like every other ceiling here. Without that
 * window the row never expires and the cap stops being a session limit: the
 * eighth question a visitor ever asks about a domain locks them out of it for
 * good. That bites hardest on shared and CGNAT addresses — an office or a
 * mobile carrier is one IP, so one person exhausting the demo would greet
 * every colleague after them with "that is 8 questions" on their first.
 *
 * A day later they get a fresh session, which is what "per session" was always
 * meant to mean.
 */
export async function consumeMessage(domain: string, ip: string): Promise<LimitVerdict> {
  const db = getDb();
  if (!db) return { ok: true };

  try {
    const [row] = await db
      .select()
      .from(schema.demoSessions)
      .where(
        and(
          eq(schema.demoSessions.domain, domain),
          eq(schema.demoSessions.ip, ip),
          gte(schema.demoSessions.createdAt, since(24)),
        ),
      )
      .orderBy(desc(schema.demoSessions.createdAt))
      .limit(1);

    if (!row) {
      await db.insert(schema.demoSessions).values({ domain, ip, messages: 1 });
      return { ok: true };
    }
    if (row.messages >= MAX_MESSAGES_PER_SESSION) {
      return {
        ok: false,
        error: `That is ${MAX_MESSAGES_PER_SESSION} questions — the demo's limit. Book a call to see it working properly on your site.`,
      };
    }
    await db
      .update(schema.demoSessions)
      .set({ messages: row.messages + 1 })
      .where(eq(schema.demoSessions.id, row.id));
    return { ok: true };
  } catch (e) {
    console.error("[demo:consume-failed]", e);
    return { ok: true };
  }
}

export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
