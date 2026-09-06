import "server-only";
import { and, count, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/dal";
import { REGISTRY } from "./registry";
import type { CollectionKey } from "./collections";

/** Reads for the admin. Every one verifies the session first. */

export type Overview = {
  leads: { total: number; new: number; last7: number; unnotified: number };
  content: Record<CollectionKey, { total: number; published: number }>;
};

export async function getOverview(): Promise<Overview | null> {
  await requireAdmin();
  const db = getDb();
  if (!db) return null;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  // A lead with no emailed_at five minutes on is the safety net in
  // docs/BACKEND.md §4.3 — notification failed and nobody was told.
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

  const [[total], [fresh], [last7], [unnotified]] = await Promise.all([
    db.select({ n: count() }).from(schema.leads),
    db.select({ n: count() }).from(schema.leads).where(eq(schema.leads.status, "new")),
    db.select({ n: count() }).from(schema.leads).where(gte(schema.leads.createdAt, weekAgo)),
    db
      .select({ n: count() })
      .from(schema.leads)
      .where(and(isNull(schema.leads.emailedAt), lt(schema.leads.createdAt, fiveMinAgo))),
  ]);

  const keys = Object.keys(REGISTRY) as CollectionKey[];
  const content = {} as Overview["content"];
  await Promise.all(
    keys.map(async (key) => {
      const table = REGISTRY[key].table;
      const [[t], [p]] = await Promise.all([
        db.select({ n: count() }).from(table),
        db.select({ n: count() }).from(table).where(eq(table.published, true)),
      ]);
      content[key] = { total: Number(t.n), published: Number(p.n) };
    }),
  );

  return {
    leads: {
      total: Number(total.n),
      new: Number(fresh.n),
      last7: Number(last7.n),
      unnotified: Number(unnotified.n),
    },
    content,
  };
}

export type LeadRow = typeof schema.leads.$inferSelect;

export async function listLeads(status?: string): Promise<LeadRow[]> {
  await requireAdmin();
  const db = getDb();
  if (!db) return [];

  const valid = ["new", "contacted", "qualified", "closed", "spam"] as const;
  const where = valid.includes(status as (typeof valid)[number])
    ? eq(schema.leads.status, status as (typeof valid)[number])
    : undefined;

  return db
    .select()
    .from(schema.leads)
    .where(where)
    .orderBy(desc(schema.leads.createdAt))
    .limit(500);
}

export async function listCollection(key: CollectionKey): Promise<Record<string, unknown>[]> {
  await requireAdmin();
  const db = getDb();
  if (!db) return [];
  const table = REGISTRY[key].table;
  return db
    .select()
    .from(table)
    .orderBy(table.sortOrder, sql`id desc`)
    .limit(500) as Promise<Record<string, unknown>[]>;
}

export type ChatRow = typeof schema.chatSessions.$inferSelect;

/**
 * Conversations, newest first.
 *
 * Read for two different jobs: the ones with a lead attached are sales
 * context, and the ones without are the backlog of questions Jessica could
 * not answer well — which is the queue for the knowledge base.
 */
export async function listChatSessions(): Promise<ChatRow[]> {
  await requireAdmin();
  const db = getDb();
  if (!db) return [];
  return db
    .select()
    .from(schema.chatSessions)
    .orderBy(desc(schema.chatSessions.createdAt))
    .limit(200);
}
