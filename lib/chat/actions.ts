"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/dal";

/**
 * Saving Jessica's settings.
 *
 * requireAdmin() first, like every other admin mutation: Server Actions are
 * public endpoints reachable by anyone who can post to the app, so the session
 * check belongs in the action rather than only in the page that renders it.
 */

export type SettingsState = { ok?: boolean; error?: string };

const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optional = (max: number) => z.preprocess(blank, z.string().trim().max(max).optional());
const bool = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

const settingsSchema = z.object({
  enabled: bool,
  name: z.string().trim().min(1).max(60),
  tagline: optional(140),
  openingMessage: optional(1000),
  greetingTitle: optional(80),
  greetingText: optional(200),
  greetingMode: z.enum(["first_visit", "every_session", "off"]),
  // Bounds match lib/chat/settings.ts, which clamps again on read — the form
  // is a convenience, not the guarantee.
  greetingDelay: z.preprocess((v) => Number(v ?? 4), z.number().int().min(1).max(60)),
  persona: optional(2000),
  maxTurns: z.preprocess((v) => Number(v ?? 12), z.number().int().min(2).max(30)),
});

export async function saveChatSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  await requireAdmin();

  const db = getDb();
  if (!db) return { ok: false, error: "No database connection." };

  const parsed = settingsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the fields and retry." };
  }

  // Four separate inputs rather than one comma field, because a suggestion can
  // legitimately contain a comma.
  const suggestions = [0, 1, 2, 3]
    .map((i) => String(formData.get(`suggestion${i}`) ?? "").trim())
    .filter(Boolean)
    .slice(0, 4);

  const values = { ...parsed.data, suggestions };

  try {
    const [existing] = await db.select({ id: schema.chatSettings.id }).from(schema.chatSettings).limit(1);
    if (existing) {
      await db.update(schema.chatSettings).set(values).where(eq(schema.chatSettings.id, existing.id));
    } else {
      await db.insert(schema.chatSettings).values(values);
    }
  } catch (e) {
    console.error("[chat:settings-save-failed]", e);
    return { ok: false, error: "Could not save. Try again." };
  }

  // The widget reads /api/chat/config, which is edge-cached for a minute.
  revalidatePath("/api/chat/config");
  return { ok: true };
}
