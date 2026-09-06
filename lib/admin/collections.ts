/**
 * Collection specs — the single description of every editable content type.
 *
 * Client-safe: no drizzle, no zod, no server imports. The admin UI renders
 * forms and tables from these specs, and lib/admin/registry.ts maps the same
 * keys to tables and validation on the server. Adding a field means editing
 * one object, not five files.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "url"
  | "email"
  | "number"
  | "bool"
  | "select"
  | "image"
  | "metrics"
  | "markdown"
  | "faq";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
};

export type CollectionKey =
  | "clients"
  | "caseStudies"
  | "testimonials"
  | "team"
  | "insights"
  | "glossary"
  | "kb";

export type CollectionSpec = {
  key: CollectionKey;
  href: string;
  title: string;
  singular: string;
  blurb: string;
  /** Field names shown as table columns, in order. */
  columns: string[];
  fields: Field[];
};

const PUBLISH_FIELDS: Field[] = [
  {
    name: "sortOrder",
    label: "Sort order",
    type: "number",
    help: "Lower numbers appear first.",
  },
  {
    name: "published",
    label: "Published",
    type: "bool",
    help: "Off means it exists here but appears nowhere on the site.",
  },
];

export const COLLECTIONS: Record<CollectionKey, CollectionSpec> = {
  kb: {
    key: "kb",
    href: "/admin/kb",
    title: "Jessica's knowledge",
    singular: "Answer",
    blurb:
      "What Jessica tells visitors. The site's own pages — services, pricing, FAQ, glossary — she already reads directly, so put here only what is NOT on a page: the awkward questions people actually ask in a chat window.",
    columns: ["question", "category", "published"],
    fields: [
      {
        name: "question",
        label: "Question",
        type: "text",
        required: true,
        placeholder: "Do I own the code you build?",
        help: "Write it the way a visitor would type it, not as a heading. She finds this by matching their words against yours.",
      },
      {
        name: "answer",
        label: "Answer",
        type: "textarea",
        required: true,
        help: "Two to five sentences, in her voice: plain, warm, no marketing. Never put a price here — the site does not publish one.",
      },
      {
        name: "keywords",
        label: "Other ways people ask it",
        type: "text",
        placeholder: "cost, pricing, rate, kitna, budget",
        help: "Comma-separated. The cheapest fix when she misses a question: add the words the visitor actually used.",
      },
      {
        name: "category",
        label: "Category",
        type: "select",
        options: [
          { value: "about", label: "About Artors" },
          { value: "services", label: "Services" },
          { value: "pricing", label: "Pricing and commercials" },
          { value: "process", label: "How we work" },
          { value: "trust", label: "Trust and objections" },
          { value: "technical", label: "Technical" },
          { value: "support", label: "Support and aftercare" },
        ],
        help: "Grouping for this table only. It does not affect what she answers.",
      },
      ...PUBLISH_FIELDS,
    ],
  },

  clients: {
    key: "clients",
    href: "/admin/clients",
    title: "Logos",
    singular: "Logo",
    blurb:
      "The strip under the hero. A logo may only be marked Client if Artors has an actual engagement with them — otherwise it is an Integration.",
    columns: ["name", "kind", "published"],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      {
        name: "kind",
        label: "Kind",
        type: "select",
        required: true,
        options: [
          { value: "integration", label: "Integration — a tool we build with" },
          { value: "client", label: "Client — we have a real engagement" },
        ],
        help: "Showing a company as a client without an engagement is a legal liability, not a design choice.",
      },
      { name: "logoUrl", label: "Logo", type: "image" },
      { name: "websiteUrl", label: "Website", type: "url", placeholder: "https://" },
      ...PUBLISH_FIELDS,
    ],
  },

  caseStudies: {
    key: "caseStudies",
    href: "/admin/case-studies",
    title: "Case studies",
    singular: "Case study",
    blurb:
      "Real engagements only. /work shows the worked sample until the first case study is published here, then shows both.",
    columns: ["title", "clientName", "industry", "published"],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      {
        name: "slug",
        label: "Slug",
        type: "text",
        required: true,
        placeholder: "missed-calls-real-estate",
        help: "Used in the URL. Lowercase, hyphens, no spaces.",
      },
      { name: "clientName", label: "Client", type: "text" },
      { name: "industry", label: "Industry", type: "text" },
      {
        name: "summary",
        label: "Summary",
        type: "textarea",
        help: "One or two sentences, shown on the index.",
      },
      { name: "challenge", label: "Challenge", type: "textarea" },
      { name: "solution", label: "What we built", type: "textarea" },
      { name: "outcome", label: "Outcome", type: "textarea" },
      {
        name: "metrics",
        label: "Metrics",
        type: "metrics",
        help: "Measured results only. An invented number is worse than no number.",
      },
      { name: "coverUrl", label: "Cover image", type: "image" },
      ...PUBLISH_FIELDS,
    ],
  },

  testimonials: {
    key: "testimonials",
    href: "/admin/testimonials",
    title: "Testimonials",
    singular: "Testimonial",
    blurb:
      "Only words a real person actually said, attributed to them by name. The section is hidden on the site while this is empty.",
    columns: ["authorName", "company", "published"],
    fields: [
      { name: "quote", label: "Quote", type: "textarea", required: true },
      { name: "authorName", label: "Author", type: "text", required: true },
      { name: "authorRole", label: "Role", type: "text" },
      { name: "company", label: "Company", type: "text" },
      { name: "avatarUrl", label: "Photo", type: "image" },
      ...PUBLISH_FIELDS,
    ],
  },

  insights: {
    key: "insights",
    href: "/admin/insights",
    title: "Insights",
    singular: "Article",
    blurb:
      "The blog. The direct answer under the title is the passage AI search engines quote — write it as a complete answer, not a teaser.",
    columns: ["title", "publishedAt", "published"],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      {
        name: "slug",
        label: "Slug",
        type: "text",
        required: true,
        help: "Lowercase, hyphens, no spaces.",
      },
      {
        name: "excerpt",
        label: "Excerpt",
        type: "textarea",
        help: "One or two sentences for the index and the meta description.",
      },
      {
        name: "directAnswer",
        label: "Direct answer",
        type: "textarea",
        help: "40–60 words, plain text, answering the title outright. Rendered as the lede.",
      },
      {
        name: "body",
        label: "Body",
        type: "markdown",
        help: "Markdown. ## for headings, | pipes | for tables, - for lists.",
      },
      { name: "faq", label: "FAQ", type: "faq", help: "Emits FAQPage schema. Answers are always visible." },
      { name: "tags", label: "Tags", type: "text", help: "Comma separated." },
      { name: "authorName", label: "Author", type: "text", help: "Defaults to the founder if empty." },
      { name: "coverUrl", label: "Cover image", type: "image" },
      {
        name: "publishedAt",
        label: "Publish date",
        type: "text",
        placeholder: "2026-08-27",
        help: "YYYY-MM-DD. Used for Article schema and the visible date.",
      },
      ...PUBLISH_FIELDS,
    ],
  },

  glossary: {
    key: "glossary",
    href: "/admin/glossary",
    title: "Glossary",
    singular: "Term",
    blurb:
      "Short definition pages. One crisp sentence answering \"what is X\" is what AI assistants quote — these are the highest-yield pages on the site for citation.",
    columns: ["term", "relatedService", "published"],
    fields: [
      { name: "term", label: "Term", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text", required: true },
      {
        name: "definition",
        label: "Definition",
        type: "textarea",
        required: true,
        help: "ONE sentence. Self-contained — it has to make sense quoted on its own.",
      },
      { name: "body", label: "Body", type: "markdown", help: "200–400 words. Markdown." },
      { name: "faq", label: "FAQ", type: "faq" },
      {
        name: "relatedTerms",
        label: "Related terms",
        type: "text",
        help: "Comma-separated slugs of other glossary terms.",
      },
      {
        name: "relatedService",
        label: "Related service",
        type: "text",
        help: "Service pillar slug, e.g. ai-agents.",
      },
      ...PUBLISH_FIELDS,
    ],
  },

  team: {
    key: "team",
    href: "/admin/team",
    title: "Founders & team",
    singular: "Person",
    blurb: "Named humans with real photos. An anonymous agency in this category reads as a scam.",
    columns: ["name", "role", "isFounder", "published"],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "role", label: "Role", type: "text", placeholder: "Founder" },
      { name: "bio", label: "Bio", type: "textarea" },
      { name: "photoUrl", label: "Photo", type: "image" },
      { name: "linkedinUrl", label: "LinkedIn", type: "url", placeholder: "https://" },
      { name: "email", label: "Email", type: "email" },
      { name: "isFounder", label: "Founder", type: "bool" },
      ...PUBLISH_FIELDS,
    ],
  },
};

export const COLLECTION_LIST = Object.values(COLLECTIONS);
