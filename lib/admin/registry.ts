import "server-only";
import { z } from "zod";
import { schema } from "@/lib/db";
import type { CollectionKey } from "./collections";

/**
 * Server half of the collection registry — docs/ADMIN.md §4.
 *
 * Maps a collection key to its table and its validation. The key arriving from
 * a client action is only ever used to look up an entry here, so an unknown or
 * crafted key resolves to nothing rather than reaching the database.
 */

/** "" -> undefined, so a cleared optional field stores NULL rather than "". */
const blankToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const optionalText = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max).optional());

const optionalUrl = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max).url().optional());

const bool = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
const sortOrder = z.preprocess(
  (v) => (v === "" || v == null ? 0 : Number(v)),
  z.number().int().min(-9999).max(9999),
);

const metrics = z.preprocess(
  (v) => {
    if (typeof v !== "string" || v.trim() === "") return undefined;
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  },
  z
    .array(z.object({ label: z.string().trim().max(80), value: z.string().trim().max(80) }))
    .max(6)
    .optional(),
);

const clientsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  kind: z.enum(["client", "integration"]),
  logoUrl: optionalText(400),
  websiteUrl: optionalUrl(400),
  sortOrder,
  published: bool,
});

const caseStudiesSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens only"),
  clientName: optionalText(140),
  industry: optionalText(80),
  summary: optionalText(400),
  challenge: optionalText(20000),
  solution: optionalText(20000),
  outcome: optionalText(20000),
  metrics,
  coverUrl: optionalText(400),
  sortOrder,
  published: bool,
});

const testimonialsSchema = z.object({
  quote: z.string().trim().min(1).max(2000),
  authorName: z.string().trim().min(1).max(120),
  authorRole: optionalText(140),
  company: optionalText(140),
  avatarUrl: optionalText(400),
  sortOrder,
  published: bool,
});

const faqArray = z.preprocess(
  (v) => {
    if (typeof v !== "string" || v.trim() === "") return undefined;
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  },
  z.array(z.object({ q: z.string().trim().max(300), a: z.string().trim().max(3000) })).max(12).optional(),
);

/** "2026-08-27" -> Date. Empty stays undefined so the column keeps its NULL. */
const dateField = z.preprocess((v) => {
  if (typeof v !== "string" || v.trim() === "") return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}, z.date().optional());

const slug = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens only");

const insightsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug,
  excerpt: optionalText(400),
  directAnswer: optionalText(1200),
  body: optionalText(200000),
  faq: faqArray,
  tags: optionalText(240),
  coverUrl: optionalText(400),
  authorName: optionalText(120),
  publishedAt: dateField,
  sortOrder,
  published: bool,
});

const glossarySchema = z.object({
  term: z.string().trim().min(1).max(140),
  slug,
  definition: z.string().trim().min(1).max(500),
  body: optionalText(200000),
  faq: faqArray,
  relatedTerms: optionalText(400),
  relatedService: optionalText(140),
  sortOrder,
  published: bool,
});

const teamSchema = z.object({
  name: z.string().trim().min(1).max(120),
  role: optionalText(140),
  bio: optionalText(20000),
  photoUrl: optionalText(400),
  linkedinUrl: optionalUrl(400),
  email: z.preprocess(blankToUndefined, z.string().trim().email().max(160).optional()),
  isFounder: bool,
  sortOrder,
  published: bool,
});

const kbSchema = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1).max(4000),
  keywords: optionalText(400),
  category: optionalText(80),
  sortOrder,
  published: bool,
});

export const REGISTRY = {
  // No revalidate: Jessica reads this table on every request rather than from
  // a rendered page, so an edit is live as soon as it is saved.
  kb: { table: schema.kbEntries, schema: kbSchema, revalidate: [] },
  clients: { table: schema.clients, schema: clientsSchema, revalidate: ["/"] },
  caseStudies: { table: schema.caseStudies, schema: caseStudiesSchema, revalidate: ["/work"] },
  testimonials: { table: schema.testimonials, schema: testimonialsSchema, revalidate: ["/"] },
  team: { table: schema.teamMembers, schema: teamSchema, revalidate: ["/about"] },
  insights: { table: schema.insights, schema: insightsSchema, revalidate: ["/insights"] },
  glossary: { table: schema.glossaryTerms, schema: glossarySchema, revalidate: ["/glossary"] },
} as const;

export function entry(key: string) {
  if (!Object.prototype.hasOwnProperty.call(REGISTRY, key)) return null;
  return REGISTRY[key as CollectionKey];
}
