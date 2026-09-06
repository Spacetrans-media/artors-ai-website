import { NextResponse } from "next/server";
import { z } from "zod";
import { buildKnowledge } from "@/lib/chat/knowledge";
import { answerAsJessica } from "@/lib/chat/answer";
import { checkAllowed, saveTurn, clientIp, MAX_TURNS_PER_SESSION } from "@/lib/chat/store";
import { getChatSettings } from "@/lib/chat/settings";
import type { ChatMessage } from "@/lib/ai/provider";

/** One turn of a conversation with Jessica. */

export const maxDuration = 30;

const body = z.object({
  sessionKey: z.string().trim().min(8).max(64),
  sourcePath: z.string().trim().max(200).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(1200),
      }),
    )
    .min(1)
    .max(MAX_TURNS_PER_SESSION * 2),
});

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const { sessionKey, sourcePath, messages } = parsed.data;
  const ip = clientIp(req.headers);

  const settings = await getChatSettings();
  if (!settings.enabled) {
    return NextResponse.json({ error: "The assistant is offline." }, { status: 503 });
  }

  const allowed = await checkAllowed(sessionKey, ip, settings.maxTurns);
  if (!allowed.ok) {
    // 200, not 429: this is a thing Jessica says, not an error the widget
    // should render as a failure. The client shows the capture form instead.
    return NextResponse.json({ reply: allowed.error, action: "callback", capped: true });
  }

  const knowledge = await buildKnowledge();
  const { reply, action } = await answerAsJessica(
    knowledge,
    messages as ChatMessage[],
    settings,
  );

  await saveTurn({
    sessionKey,
    ip,
    userAgent: req.headers.get("user-agent") ?? undefined,
    sourcePath,
    messages: [...messages, { role: "assistant", content: reply }] as ChatMessage[],
    intent: action,
  });

  return NextResponse.json({ reply, action });
}
