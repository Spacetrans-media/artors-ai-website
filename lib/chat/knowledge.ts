import "server-only";
import { and, eq, desc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { pillars } from "@/lib/content/services";
import { pricing } from "@/lib/content/pricing";
import { company } from "@/lib/content/company";
import { faq, engagements, process as howWeWork } from "@/lib/content/sections";
import { security } from "@/lib/content/security";

/**
 * What Jessica knows.
 *
 * Assembled at request time from two sources, deliberately not one:
 *
 *   - The site's own content modules. Services, pricing and the FAQ are
 *     already written, reviewed and rendered on real pages. Copying them into
 *     a knowledge base would mean maintaining the same sentence twice and
 *     watching the two drift, so they are read directly. Edit the page, Jessica
 *     changes with it.
 *   - kb_entries, edited in the admin panel. For everything that is NOT on a
 *     page: the questions people actually ask in a chat window, which are
 *     usually the awkward ones.
 *
 * The whole corpus is a few thousand words, so it is rebuilt per request
 * rather than cached. Retrieval then cuts it down to what one question needs.
 */

/** Only the fields that were actually filled in — never an empty address. */
function companyFacts(): string {
  const lines = [`Artors is an AI agency based in ${company.address.city}, ${company.address.state}, India.`];
  if (company.legalName) lines.push(`Registered entity: ${company.legalName}.`);
  if (company.gstin) lines.push(`GSTIN: ${company.gstin}.`);
  if (company.cin) lines.push(`CIN: ${company.cin}.`);
  const street = [company.address.line1, company.address.line2, company.address.postalCode]
    .filter(Boolean)
    .join(", ");
  if (street) lines.push(`Address: ${street}, ${company.address.city}.`);
  if (company.phone) lines.push(`Phone: ${company.phone}.`);
  if (company.whatsapp) lines.push(`WhatsApp: +${company.whatsapp}.`);
  if (company.email) lines.push(`Email: ${company.email}.`);
  if (company.linkedin) lines.push(`LinkedIn: ${company.linkedin}.`);
  lines.push(`Client data is stored in ${company.dataRegion}.`);
  return lines.join(" ");
}

function siteKnowledge(): string {
  const parts: string[] = [];

  parts.push(`## About Artors\n${companyFacts()}`);

  parts.push(
    "## Services Artors offers\n" +
      pillars
        .map((p) => `${p.title}: ${p.blurb} Result: ${p.result} Covers: ${p.items.join(", ")}.`)
        .join("\n"),
  );

  parts.push(
    `## Pricing and how engagements are priced\n${pricing.statement} ${pricing.intro}\n` +
      pricing.principles.map((p) => `${p.title}: ${p.text}`).join("\n") +
      `\n${pricing.practicesNote}\n` +
      "Artors does not publish fixed prices. Cost depends on the systems involved, the volume handled, and whether Artors runs it after launch. The way to get a number is a consultation call, which produces an itemised quote.",
  );

  parts.push(
    `## How a project runs\n` +
      howWeWork.steps.map((s: { title: string; text: string }) => `${s.title}: ${s.text}`).join("\n"),
  );

  parts.push(
    `## Ways of working with Artors\n` +
      engagements.options
        .map((o) => `${o.title} (${o.tag}): ${o.points.join("; ")}.`)
        .join("\n"),
  );

  parts.push(
    `## Common questions\n` +
      faq.items.map((f: { q: string; a: string }) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n"),
  );

  parts.push(
    `## Security and data handling\n` +
      security.sections
        .map((sec) => `${sec.heading}: ${sec.body.join(" ")}`)
        .join("\n"),
  );

  return parts.join("\n\n");
}

/** Published glossary and insights give Jessica the explainers to point at. */
async function publishedContent(): Promise<string> {
  const db = getDb();
  if (!db) return "";

  try {
    const [terms, articles] = await Promise.all([
      db
        .select({
          term: schema.glossaryTerms.term,
          slug: schema.glossaryTerms.slug,
          definition: schema.glossaryTerms.definition,
        })
        .from(schema.glossaryTerms)
        .where(eq(schema.glossaryTerms.published, true))
        .limit(60),
      db
        .select({
          title: schema.insights.title,
          slug: schema.insights.slug,
          directAnswer: schema.insights.directAnswer,
        })
        .from(schema.insights)
        .where(eq(schema.insights.published, true))
        .orderBy(desc(schema.insights.publishedAt))
        .limit(40),
    ]);

    const parts: string[] = [];
    if (terms.length) {
      parts.push(
        "## Terms Artors explains on the site\n" +
          terms.map((t) => `${t.term} (/glossary/${t.slug}): ${t.definition}`).join("\n"),
      );
    }
    if (articles.length) {
      parts.push(
        "## Articles Artors has published\n" +
          articles
            .map((a) => `${a.title} (/insights/${a.slug}): ${(a.directAnswer ?? "").slice(0, 300)}`)
            .join("\n"),
      );
    }
    return parts.join("\n\n");
  } catch (e) {
    // A knowledge gap is not a reason to take the chat down.
    console.error("[chat:content-failed]", e);
    return "";
  }
}

/** The admin-edited entries. Keywords are appended so retrieval can see them. */
async function kbKnowledge(): Promise<string> {
  const db = getDb();
  if (!db) return "";

  try {
    const rows = await db
      .select()
      .from(schema.kbEntries)
      .where(eq(schema.kbEntries.published, true))
      .orderBy(schema.kbEntries.sortOrder)
      .limit(200);

    if (!rows.length) return "";
    return rows
      .map((r) => `## ${r.question}\n${r.answer}${r.keywords ? `\nAlso asked as: ${r.keywords}` : ""}`)
      .join("\n\n");
  } catch (e) {
    console.error("[chat:kb-failed]", e);
    return "";
  }
}

/**
 * The full corpus.
 *
 * Order matters, because retrieve() always sends the opening of the corpus
 * whatever was asked — it assumes a site leads by saying who it is. So the
 * identity goes first here too, otherwise "who are you?" has to win a keyword
 * contest against thirty other entries to get answered.
 *
 * Admin entries come next: when a hand-written answer and a page say
 * overlapping things, the hand-written one usually exists precisely because
 * the page was not landing.
 */
export async function buildKnowledge(): Promise<string> {
  const [kb, content] = await Promise.all([kbKnowledge(), publishedContent()]);
  return [`## Who Artors is\n${companyFacts()}`, kb, siteKnowledge(), content]
    .filter(Boolean)
    .join("\n\n");
}
