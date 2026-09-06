import { NextResponse } from "next/server";
import { z } from "zod";
import { persistLead, notifyEmail, confirmLead } from "@/lib/leads/deliver";
import { attachLead, loadSession, clientIp } from "@/lib/chat/store";

/**
 * A lead captured inside the chat.
 *
 * Deliberately a separate endpoint from /api/lead rather than a flag on it:
 * this one attaches the transcript, so whoever makes the call opens with what
 * the person actually said instead of a name and a number. Same persist-then-
 * notify order, for the same reason — the database is the source of truth and
 * a mail failure must never lose a lead.
 */

const body = z.object({
  sessionKey: z.string().trim().min(8).max(64),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(40),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  /** Free text: "tomorrow morning", "after 6pm", a date. Not a calendar slot. */
  preferred: z.string().trim().max(120).optional().or(z.literal("")),
  intent: z.enum(["callback", "meeting"]),
  sourcePath: z.string().trim().max(200).optional().or(z.literal("")),
  website: z.string().optional(), // honeypot
});

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const d = parsed.data;
  if (d.website) return NextResponse.json({ ok: true }); // bot: happy silence

  const ip = clientIp(req.headers);
  const session = await loadSession(d.sessionKey);

  // The transcript is the message. A salesperson opening with "you asked about
  // WhatsApp automation for a clinic" is a different call from a cold one.
  const transcript = (session?.messages ?? [])
    .map((m) => `${m.role === "user" ? "Them" : "Jessica"}: ${m.content}`)
    .join("\n")
    .slice(0, 4000);

  const label = d.intent === "meeting" ? "Meeting request" : "Callback request";
  const when = d.preferred ? `\nPreferred time: ${d.preferred}` : "";

  const lead = {
    name: d.name,
    phone: d.phone,
    email: d.email || undefined,
    service: `Chat — ${label}`,
    message: `${label} from the chat.${when}\n\n--- Conversation ---\n${transcript}`,
    sourcePath: d.sourcePath || undefined,
    ip,
    userAgent: req.headers.get("user-agent")?.slice(0, 256) ?? undefined,
  };

  let id: number | null = null;
  try {
    id = await persistLead(lead);
  } catch (e) {
    console.error("[chat-lead:persist-failed]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  await attachLead(d.sessionKey, id);

  await Promise.allSettled([notifyEmail(lead, id), confirmLead(lead, id)]).then((rs) =>
    rs.forEach((r) => {
      if (r.status === "rejected") console.error("[chat-lead:notify-failed]", r.reason);
    }),
  );

  return NextResponse.json({ ok: true });
}
