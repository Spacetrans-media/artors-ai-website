import { SITE_URL, absoluteUrl } from "@/lib/seo/site";
import { company, addressLine } from "@/lib/content/company";
import { pillars } from "@/lib/content/services";
import type { TeamMember } from "@/lib/content/db";

/**
 * JSON-LD builders — SEO-AUDIT.md Phase 1.4.
 *
 * Data-driven: everything here reads from lib/content/company.ts, the typed
 * content files, or the database. Nothing is hardcoded, and — critically —
 * every optional property is omitted when its source is empty rather than
 * emitted blank. Schema with an empty `telephone` or a placeholder address is
 * worse than schema without them: it is a machine-readable lie, and it is what
 * Rich Results flags as a warning.
 *
 * No `offers` on Service. Published prices were removed from /pricing on
 * 2026-08-27 (docs/PLAN.md §2.4), and inventing one to satisfy a schema field
 * would be fabricating business data.
 */

type Json = Record<string, unknown>;

/** Drops keys whose value is empty, so optional properties simply vanish. */
function compact(obj: Json): Json {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => {
      if (v == null) return false;
      if (typeof v === "string") return v.trim() !== "";
      if (Array.isArray(v)) return v.length > 0;
      return true;
    }),
  );
}

export const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

function postalAddress(): Json | null {
  const a = company.address;
  if (!a.city) return null;
  return compact({
    "@type": "PostalAddress",
    streetAddress: [a.line1, a.line2].filter(Boolean).join(", "),
    addressLocality: a.city,
    addressRegion: a.state,
    postalCode: a.postalCode,
    addressCountry: a.country === "India" ? "IN" : a.country,
  });
}

/**
 * Organization, doubling as the LocalBusiness for a Gurugram agency.
 * `founder` is populated from the team collection so the Person entity stays
 * in step with what /about actually shows.
 */
export function organizationSchema(founders: TeamMember[] = []): Json {
  const sameAs = [company.linkedin].filter(Boolean);
  const address = postalAddress();

  return compact({
    "@context": "https://schema.org",
    "@type": ["Organization", "ProfessionalService"],
    "@id": ORG_ID,
    name: company.name,
    legalName: company.legalName,
    url: SITE_URL,
    description:
      "Agentic AI company building multi-agent systems for business: teams of AI agents that handle sales, support, operations and reporting end to end. Based in Gurugram, India, working remotely with clients worldwide.",
    // Country was too narrow once clients are targeted globally. A real
    // address stays below as a trust signal; it is not a limit on who we work
    // with, and areaServed is the field that says so to a crawler.
    areaServed: { "@type": "AdministrativeArea", name: "Worldwide" },
    /**
     * The subjects this organisation is about.
     *
     * This is the field that does the work the /llms.txt file gets credit
     * for: knowsAbout is consumed today by the systems that build entity
     * understanding, whereas llms.txt largely is not. Drawn from the seven
     * pillars so it cannot drift from what the site actually sells.
     */
    knowsAbout: [
      "Agentic AI",
      "Multi-agent systems",
      "AI agent orchestration",
      ...pillars.map((p) => p.title),
      "Hindi and Hinglish voice AI",
      "AI automation for business",
      "DPDP Act compliance for AI systems",
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "AI services",
      itemListElement: pillars.map((p) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: p.title,
          description: p.blurb,
          url: absoluteUrl(p.href),
        },
      })),
    },
    address,
    telephone: company.phone,
    email: company.email,
    sameAs,
    founder: founders.map((f) =>
      compact({
        "@type": "Person",
        name: f.name,
        jobTitle: f.role,
        url: `${SITE_URL}/about`,
      }),
    ),
    contactPoint: compact({
      "@type": "ContactPoint",
      contactType: "sales",
      email: company.email,
      telephone: company.phone,
      areaServed: "Worldwide",
      availableLanguage: ["en", "hi"],
    }),
    // Tax identifiers only when real; an empty one reads as a fake business.
    taxID: company.gstin,
  });
}

export function websiteSchema(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: company.name,
    publisher: { "@id": ORG_ID },
    inLanguage: "en-IN",
  };
}

export function serviceSchema(input: {
  name: string;
  description: string;
  path: string;
}): Json {
  return compact({
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    serviceType: input.name,
    provider: { "@id": ORG_ID },
    areaServed: { "@type": "AdministrativeArea", name: "Worldwide" },
  });
}

export function faqSchema(items: readonly { q: string; a: string }[]): Json | null {
  if (items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function breadcrumbSchema(trail: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function articleSchema(input: {
  headline: string;
  description?: string | null;
  path: string;
  datePublished?: Date | string | null;
  dateModified?: Date | string | null;
  image?: string | null;
  authors?: TeamMember[];
}): Json {
  const iso = (d?: Date | string | null) => (d ? new Date(d).toISOString() : "");
  return compact({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    description: input.description ?? "",
    url: absoluteUrl(input.path),
    mainEntityOfPage: absoluteUrl(input.path),
    datePublished: iso(input.datePublished),
    dateModified: iso(input.dateModified ?? input.datePublished),
    image: input.image ? absoluteUrl(input.image) : "",
    publisher: { "@id": ORG_ID },
    author: (input.authors ?? []).map((a) =>
      compact({ "@type": "Person", name: a.name, jobTitle: a.role }),
    ),
  });
}

export { addressLine };
