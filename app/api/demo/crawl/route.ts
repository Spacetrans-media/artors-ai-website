import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { crawlSite, normaliseUrl } from "@/lib/demo/crawl";
import { checkCrawlAllowed, clientIp } from "@/lib/demo/limits";

/**
 * Reads a visitor's website so the demo agent has something to answer from.
 *
 * Cached per domain: the tenth person who tries the same site costs nothing,
 * which matters because the obvious sites (a competitor's, a big brand's) get
 * tried repeatedly.
 */

export const maxDuration = 60;

/**
 * A few readable lines for the preview frame.
 *
 * The crawler's own "# domain" and "## /path" markers are stripped: they are
 * scaffolding for the model, and showing them back to a visitor would make
 * their own homepage look like a config file.
 */
function excerptOf(content: string): string {
  return content
    .split("\n")
    .filter((line) => !line.startsWith("#"))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 700);
}

const body = z.object({ url: z.string().trim().min(3).max(500) });
const CACHE_HOURS = 24;

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a website address." }, { status: 400 });
  }

  const target = normaliseUrl(parsed.data.url);
  if (!target) {
    return NextResponse.json(
      { error: "That does not look like a public website address." },
      { status: 400 },
    );
  }
  const domain = target.hostname.toLowerCase();
  const ip = clientIp(req.headers);

  const allowed = await checkCrawlAllowed(ip);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: 429 });

  const db = getDb();

  // Serve a recent crawl rather than hitting someone's site again.
  if (db) {
    try {
      const [cached] = await db
        .select()
        .from(schema.demoCrawls)
        .where(eq(schema.demoCrawls.domain, domain))
        .limit(1);
      const fresh =
        cached && Date.now() - new Date(cached.updatedAt).getTime() < CACHE_HOURS * 3600_000;
      if (cached && fresh && cached.content) {
        return NextResponse.json({
          domain,
          title: cached.title,
          pages: cached.pages,
          excerpt: excerptOf(cached.content),
          cached: true,
        });
      }
    } catch (e) {
      console.error("[demo:cache-read-failed]", e);
    }
  }

  const result = await crawlSite(target.toString());
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });

  if (result.content.length < 400) {
    return NextResponse.json(
      {
        error:
          "There was not enough readable text on that site for a useful demo. Sites built entirely in JavaScript often look empty to a crawler — which is itself worth knowing.",
      },
      { status: 422 },
    );
  }

  if (db) {
    try {
      const values = {
        domain,
        url: result.url,
        title: result.title,
        content: result.content,
        pages: result.pages,
      };
      const [existing] = await db
        .select({ id: schema.demoCrawls.id })
        .from(schema.demoCrawls)
        .where(eq(schema.demoCrawls.domain, domain))
        .limit(1);
      if (existing) {
        await db.update(schema.demoCrawls).set(values).where(eq(schema.demoCrawls.id, existing.id));
      } else {
        await db.insert(schema.demoCrawls).values(values);
      }
      // The session row is what caps questions later, and it is the lead signal.
      await db.insert(schema.demoSessions).values({ domain, ip, messages: 0 });
    } catch (e) {
      console.error("[demo:cache-write-failed]", e);
    }
  }

  return NextResponse.json({
    domain,
    title: result.title,
    pages: result.pages,
    skipped: result.skipped,
    excerpt: excerptOf(result.content),
    cached: false,
  });
}
