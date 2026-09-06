import "server-only";
import { and, gte, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/dal";
import { providerName } from "@/lib/ai/provider";
import {
  MAX_TURNS_SITE_PER_DAY,
  MAX_SESSIONS_PER_IP_PER_DAY,
  MAX_TURNS_PER_SESSION,
} from "@/lib/chat/store";
import { MAX_DEMOS_PER_DAY, MAX_MESSAGES_PER_SESSION } from "@/lib/demo/limits";

/**
 * What the model has cost, and how much room is left.
 *
 * Two different questions, and the dashboard answers both because they fail in
 * different ways. "How much have I spent" is a bill. "How much can I still
 * spend today" is a ceiling — and the ceilings here are ours, not the
 * provider's: they are what stops one abusive visitor emptying the account.
 *
 * Prices are read from the environment rather than hardcoded, because every
 * provider charges differently and a wrong number confidently displayed is
 * worse than no number. With no rates set the dashboard shows tokens and says
 * plainly that it cannot cost them.
 */

export type UsageWindow = {
  requests: number;
  inputTokens: number;
  outputTokens: number;
};

export type UsageStats = {
  provider: string;
  model: string;
  today: UsageWindow;
  last7: UsageWindow;
  bySurface: { surface: string; requests: number; inputTokens: number; outputTokens: number }[];
  /** USD per million tokens, from the environment. Null when unset. */
  prices: { input: number; output: number } | null;
  /** Today's spend against our own daily ceilings. */
  ceilings: {
    chatTurns: { used: number; max: number };
    demoSessions: { used: number; max: number };
  };
  /** The worst a day can cost with every ceiling saturated. Null without prices. */
  worstCasePerDay: number | null;
  /** Average input tokens per call, measured. The figure that drives everything. */
  avgInputTokens: number;
};

const EMPTY: UsageWindow = { requests: 0, inputTokens: 0, outputTokens: 0 };

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function prices(): { input: number; output: number } | null {
  const input = Number(process.env.AI_PRICE_INPUT_PER_M);
  const output = Number(process.env.AI_PRICE_OUTPUT_PER_M);
  if (!Number.isFinite(input) || !Number.isFinite(output)) return null;
  if (input <= 0 && output <= 0) return null;
  return { input, output };
}

export function costOf(w: UsageWindow, p: { input: number; output: number } | null): number | null {
  if (!p) return null;
  return (w.inputTokens / 1_000_000) * p.input + (w.outputTokens / 1_000_000) * p.output;
}

export async function getUsage(): Promise<UsageStats | null> {
  await requireAdmin();
  const db = getDb();
  if (!db) return null;

  const p = prices();
  const base = {
    provider: providerName(),
    model: process.env.DEMO_MODEL ?? "default",
    prices: p,
  };

  try {
    const window = (since: Date) =>
      db
        .select({
          requests: sql<number>`count(*)`,
          inputTokens: sql<number>`coalesce(sum(input_tokens), 0)`,
          outputTokens: sql<number>`coalesce(sum(output_tokens), 0)`,
        })
        .from(schema.aiUsage)
        .where(gte(schema.aiUsage.createdAt, since));

    const [[today], [last7], bySurface, [chatToday], [demoToday]] = await Promise.all([
      window(startOfToday()),
      window(daysAgo(7)),
      db
        .select({
          surface: schema.aiUsage.surface,
          requests: sql<number>`count(*)`,
          inputTokens: sql<number>`coalesce(sum(input_tokens), 0)`,
          outputTokens: sql<number>`coalesce(sum(output_tokens), 0)`,
        })
        .from(schema.aiUsage)
        .where(gte(schema.aiUsage.createdAt, daysAgo(7)))
        .groupBy(schema.aiUsage.surface),
      // Both ceilings count the same rows the limiters do, so the dashboard
      // and the enforcement can never disagree.
      db
        .select({ n: sql<number>`coalesce(sum(turns), 0)` })
        .from(schema.chatSessions)
        .where(gte(schema.chatSessions.createdAt, daysAgo(1))),
      db
        .select({ n: sql<number>`count(*)` })
        .from(schema.demoSessions)
        .where(gte(schema.demoSessions.createdAt, daysAgo(1))),
    ]);

    const num = (v: unknown) => Number(v ?? 0);
    const win = (r: typeof today): UsageWindow => ({
      requests: num(r?.requests),
      inputTokens: num(r?.inputTokens),
      outputTokens: num(r?.outputTokens),
    });

    const last7Window = win(last7);
    const avgInputTokens = last7Window.requests
      ? Math.round(last7Window.inputTokens / last7Window.requests)
      : 0;

    // The ceiling arithmetic, spelled out: every chat turn and every demo
    // message is one model call, and each costs roughly what we have measured.
    const maxCallsPerDay =
      MAX_TURNS_SITE_PER_DAY + MAX_DEMOS_PER_DAY * MAX_MESSAGES_PER_SESSION;
    const perCall = costOf(
      { requests: 1, inputTokens: avgInputTokens, outputTokens: 100 },
      p,
    );

    return {
      ...base,
      today: win(today),
      last7: last7Window,
      bySurface: bySurface.map((r) => ({
        surface: r.surface,
        requests: num(r.requests),
        inputTokens: num(r.inputTokens),
        outputTokens: num(r.outputTokens),
      })),
      ceilings: {
        chatTurns: { used: num(chatToday?.n), max: MAX_TURNS_SITE_PER_DAY },
        demoSessions: { used: num(demoToday?.n), max: MAX_DEMOS_PER_DAY },
      },
      worstCasePerDay: perCall === null ? null : perCall * maxCallsPerDay,
      avgInputTokens,
    };
  } catch (e) {
    console.error("[admin:usage-failed]", e);
    return {
      ...base,
      today: EMPTY,
      last7: EMPTY,
      bySurface: [],
      ceilings: {
        chatTurns: { used: 0, max: MAX_TURNS_SITE_PER_DAY },
        demoSessions: { used: 0, max: MAX_DEMOS_PER_DAY },
      },
      worstCasePerDay: null,
      avgInputTokens: 0,
    };
  }
}

/** Re-exported so the dashboard can explain the per-visitor limits too. */
export const PER_VISITOR = {
  chatTurns: MAX_TURNS_PER_SESSION,
  chatSessionsPerIp: MAX_SESSIONS_PER_IP_PER_DAY,
  demoMessages: MAX_MESSAGES_PER_SESSION,
};
