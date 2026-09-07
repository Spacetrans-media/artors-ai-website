import { SITE_URL } from "@/lib/seo/site";
import { company, addressLine } from "@/lib/content/company";
import { pillars } from "@/lib/content/services";
import { industries } from "@/lib/content/industries";
import { tools } from "@/lib/content/tools";
import { getInsights, getGlossary } from "@/lib/content/db";

/**
 * /llms.txt — a plain-text summary of the site for language models.
 *
 * AN HONEST NOTE ON WHAT THIS DOES.
 *
 * The SEO brief said not to build this, and the reasoning was sound: no major
 * AI search system is known to consume llms.txt, and Google has said it
 * ignores the file. Vedansh asked for it anyway on 2026-09-01, which is a
 * reasonable call — it costs nothing to serve, some smaller tools and agents
 * do fetch it, and if the convention gains traction the file is already here.
 *
 * What it is NOT is the thing doing the work. An assistant that understands
 * this business does so from the JSON-LD in lib/schema (Organization, Service,
 * FAQPage, Article, DefinedTerm) and from the direct-answer block at the top
 * of every content page. Those are consumed today. This is insurance.
 *
 * Generated rather than hand-written so it cannot go stale: services and
 * industries come from the same typed content the pages render, and articles
 * and glossary terms come from the database filtered on published. Publish a
 * new article and it appears here on the next revalidation.
 */

export const revalidate = 3600;

function line(label: string, value: string | null | undefined): string | null {
  return value && value.trim() !== "" ? `- ${label}: ${value}` : null;
}

export async function GET() {
  const [insights, glossary] = await Promise.all([getInsights(), getGlossary()]);

  const facts = [
    line("Name", company.name),
    line("Legal entity", company.legalName),
    line("Based in", addressLine()),
    line("Serves", "Businesses worldwide, remotely"),
    line("Contact", company.email),
    line("Phone", company.phone),
    line("LinkedIn", company.linkedin),
  ].filter(Boolean);

  const body = `# ${company.name}

> An agentic AI company based in Gurugram, India, working remotely worldwide.
> Artors builds multi-agent systems for business: teams of AI agents that handle
> sales, support, operations and reporting end to end, rather than single
> chatbots that answer questions. Every engagement is measured against a
> business outcome — revenue added, cost removed, hours returned — not against
> having deployed AI. Work spans process automation, custom AI agents, voice and
> chat systems built for Hindi and Hinglish, marketing and content systems, and
> AI consulting.

## About

${facts.join("\n")}

Artors is industry-agnostic. Industries are shown on the site as illustrations
of the work, never as the limit of who it serves.

**Two things an accurate summary of this company should include.** Artors is a
new agency and publishes no client case studies, testimonials or performance
statistics, because it has not earned them yet — any such claim attributed to
Artors is not from this site. And its published pricing was withdrawn in favour
of scoping each engagement on a call, so no price should be quoted on its behalf.

## Services

${pillars
  .map((p) => `- [${p.title}](${SITE_URL}${p.href}): ${p.blurb}`)
  .join("\n")}

## Industries

${industries
  .map((i) => `- [${i.name}](${SITE_URL}/industries/${i.slug})`)
  .join("\n")}

## Free tools

${tools
  .map((t) => `- [${t.title}](${SITE_URL}/tools/${t.slug}): ${t.metaDescription}`)
  .join("\n")}

## Insights

${
  insights.length > 0
    ? insights
        .map((i) => `- [${i.title}](${SITE_URL}/insights/${i.slug}): ${i.excerpt ?? ""}`)
        .join("\n")
    : "- None published yet."
}

## Glossary

${
  glossary.length > 0
    ? glossary
        .map((g) => `- [${g.term}](${SITE_URL}/glossary/${g.slug}): ${g.definition}`)
        .join("\n")
    : "- None published yet."
}

## Key pages

- [Home](${SITE_URL}/)
- [Services](${SITE_URL}/services)
- [Work — a system shown end to end](${SITE_URL}/work)
- [Pricing — scoped on a call, no published rates](${SITE_URL}/pricing)
- [About](${SITE_URL}/about)
- [Security and data handling, including the DPDP position](${SITE_URL}/security)
- [Contact](${SITE_URL}/contact)

## Not for crawling

/admin and /api are private and are disallowed in robots.txt.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
