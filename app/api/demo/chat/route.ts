import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { answer, type ChatMessage } from "@/lib/demo/answer";
import { consumeMessage, clientIp, MAX_MESSAGES_PER_SESSION } from "@/lib/demo/limits";

/**
 * Answers one question about a previously crawled site.
 *
 * The content is read from our cache by domain rather than accepted from the
 * client — otherwise anyone could post 60,000 characters of their own text and
 * use this as a free model endpoint.
 */

export const maxDuration = 60;

const body = z.object({
  domain: z.string().trim().min(3).max(255),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .min(1)
    .max(MAX_MESSAGES_PER_SESSION * 2),
});

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const { domain, messages } = parsed.data;
  const ip = clientIp(req.headers);

  const db = getDb();
  if (!db) {
    return NextResponse.json(
      { error: "The demo is unavailable right now. Book a call and we will show you live." },
      { status: 503 },
    );
  }

  const [crawl] = await db
    .select()
    .from(schema.demoCrawls)
    .where(eq(schema.demoCrawls.domain, domain))
    .limit(1);

  if (!crawl?.content) {
    return NextResponse.json({ error: "Start by entering a website address." }, { status: 404 });
  }

  const allowed = await consumeMessage(domain, ip);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: 429 });

  const reply = await answer(crawl.content, messages as ChatMessage[], crawl.title || domain);
  return NextResponse.json({ reply });
}
