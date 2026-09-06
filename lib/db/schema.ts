import {
  mysqlTable,
  bigint,
  varchar,
  text,
  timestamp,
  mysqlEnum,
  boolean,
  int,
  json,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

/**
 * Schema — docs/BACKEND.md §3, docs/ADMIN.md.
 *
 * Every id is an explicit bigint(unsigned).autoincrement(), never drizzle's
 * serial(): Hostinger runs MariaDB, where SERIAL is already an alias for
 * BIGINT UNSIGNED AUTO_INCREMENT UNIQUE, so the "serial AUTO_INCREMENT" the
 * mysql dialect emits is a parse error.
 *
 * Every content table defaults `published` to FALSE. The public site renders
 * only published rows and hides the whole section when there are none — the
 * structural guarantee behind docs/PLAN.md §2, "no fabricated proof". A blank
 * section is correct; a placeholder one is not.
 */

const id = () => bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey();

/** The leads table. Nothing is ever deleted; status "spam" is the bin. */
export const leads = mysqlTable(
  "leads",
  {
    id: id(),
    createdAt: timestamp("created_at").defaultNow().notNull(),

    name: varchar("name", { length: 120 }).notNull(),
    company: varchar("company", { length: 160 }),
    phone: varchar("phone", { length: 40 }).notNull(),
    email: varchar("email", { length: 160 }),
    service: varchar("service", { length: 80 }),
    message: text("message"),

    sourcePath: varchar("source_path", { length: 200 }),
    ip: varchar("ip", { length: 64 }),
    userAgent: varchar("user_agent", { length: 256 }),

    status: mysqlEnum("status", ["new", "contacted", "qualified", "closed", "spam"])
      .default("new")
      .notNull(),
    emailedAt: timestamp("emailed_at"),
    confirmedAt: timestamp("confirmed_at"),
    note: text("note"),
  },
  (t) => [index("leads_status_idx").on(t.status), index("leads_created_idx").on(t.createdAt)],
);

/**
 * Logos for the strip under the hero.
 *
 * `kind` is the important column. docs/PLAN.md §2.6 permits integration marks
 * (WhatsApp, n8n, HubSpot) in that slot but forbids showing a company as a
 * client without an engagement — a legal liability, not a style preference.
 * Separating them in the data makes the mistake impossible to make by accident.
 */
export const clients = mysqlTable(
  "clients",
  {
    id: id(),
    name: varchar("name", { length: 120 }).notNull(),
    kind: mysqlEnum("kind", ["client", "integration"]).default("integration").notNull(),
    logoUrl: varchar("logo_url", { length: 400 }),
    websiteUrl: varchar("website_url", { length: 400 }),
    sortOrder: int("sort_order").default(0).notNull(),
    published: boolean("published").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [index("clients_pub_idx").on(t.published, t.kind, t.sortOrder)],
);

/**
 * Case studies. /work carries the worked sample until these exist; the page
 * shows real case studies the moment there is a published row, which is the
 * "same URL, no redesign" promise in docs/PLAN.md §2.1.
 */
export const caseStudies = mysqlTable(
  "case_studies",
  {
    id: id(),
    slug: varchar("slug", { length: 140 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    clientName: varchar("client_name", { length: 140 }),
    industry: varchar("industry", { length: 80 }),
    summary: varchar("summary", { length: 400 }),
    challenge: text("challenge"),
    solution: text("solution"),
    outcome: text("outcome"),
    /** [{ label: "Response time", value: "under 60s" }] — capability or measured, never invented. */
    metrics: json("metrics").$type<{ label: string; value: string }[]>(),
    coverUrl: varchar("cover_url", { length: 400 }),
    sortOrder: int("sort_order").default(0).notNull(),
    published: boolean("published").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    uniqueIndex("case_studies_slug_key").on(t.slug),
    index("case_studies_pub_idx").on(t.published, t.sortOrder),
  ],
);

/** Testimonials. Empty until a real client says something real. */
export const testimonials = mysqlTable(
  "testimonials",
  {
    id: id(),
    quote: text("quote").notNull(),
    authorName: varchar("author_name", { length: 120 }).notNull(),
    authorRole: varchar("author_role", { length: 140 }),
    company: varchar("company", { length: 140 }),
    avatarUrl: varchar("avatar_url", { length: 400 }),
    sortOrder: int("sort_order").default(0).notNull(),
    published: boolean("published").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [index("testimonials_pub_idx").on(t.published, t.sortOrder)],
);

/** Founders and team — the named-humans half of the trust layer. */
export const teamMembers = mysqlTable(
  "team_members",
  {
    id: id(),
    name: varchar("name", { length: 120 }).notNull(),
    role: varchar("role", { length: 140 }),
    bio: text("bio"),
    photoUrl: varchar("photo_url", { length: 400 }),
    linkedinUrl: varchar("linkedin_url", { length: 400 }),
    email: varchar("email", { length: 160 }),
    isFounder: boolean("is_founder").default(false).notNull(),
    sortOrder: int("sort_order").default(0).notNull(),
    published: boolean("published").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [index("team_pub_idx").on(t.published, t.sortOrder)],
);

/**
 * Insights — the blog. docs/PLAN.md §4 extends the site map here.
 *
 * `directAnswer` is the passage AI search engines lift: 40–60 words of plain
 * text under the H1, answering the title's question outright. It is a separate
 * column rather than the first paragraph of the body so it can be written and
 * reviewed as what it is.
 *
 * `body` is Markdown, rendered server-side. Markdown rather than a rich-text
 * editor because GFM tables give the comparison tables the brief requires
 * without adding an editor dependency.
 */
export const insights = mysqlTable(
  "insights",
  {
    id: id(),
    slug: varchar("slug", { length: 160 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    excerpt: varchar("excerpt", { length: 400 }),
    /** 40–60 words. Rendered as the lede; the passage AI search extracts. */
    directAnswer: text("direct_answer"),
    body: text("body"),
    faq: json("faq").$type<{ q: string; a: string }[]>(),
    tags: varchar("tags", { length: 240 }),
    coverUrl: varchar("cover_url", { length: 400 }),
    /** Falls back to the founder when empty. */
    authorName: varchar("author_name", { length: 120 }),
    publishedAt: timestamp("published_at"),
    sortOrder: int("sort_order").default(0).notNull(),
    published: boolean("published").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    uniqueIndex("insights_slug_key").on(t.slug),
    index("insights_pub_idx").on(t.published, t.publishedAt),
  ],
);

/**
 * Glossary — short definition pages.
 *
 * `definition` is one sentence and doubles as the direct-answer block. These
 * are the highest-yield pages for AI citation: a question with a crisp,
 * self-contained answer is exactly what gets quoted.
 */
export const glossaryTerms = mysqlTable(
  "glossary_terms",
  {
    id: id(),
    slug: varchar("slug", { length: 160 }).notNull(),
    term: varchar("term", { length: 140 }).notNull(),
    /** One sentence. Used as the lede and as DefinedTerm.description. */
    definition: varchar("definition", { length: 500 }).notNull(),
    body: text("body"),
    faq: json("faq").$type<{ q: string; a: string }[]>(),
    /** Comma-separated slugs of related glossary terms. */
    relatedTerms: varchar("related_terms", { length: 400 }),
    /** Slug of the service pillar this belongs to, if any. */
    relatedService: varchar("related_service", { length: 140 }),
    sortOrder: int("sort_order").default(0).notNull(),
    published: boolean("published").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    uniqueIndex("glossary_slug_key").on(t.slug),
    index("glossary_pub_idx").on(t.published, t.term),
  ],
);

/**
 * The website-agent demo.
 *
 * Two tables, both there to keep the demo cheap and safe rather than to store
 * anything of ours. A crawl is cached per domain so the tenth person trying
 * the same site costs nothing, and a session row caps how much any one visitor
 * can spend of our model budget.
 */
export const demoCrawls = mysqlTable(
  "demo_crawls",
  {
    id: id(),
    /** Bare host, lowercased — the cache key. */
    domain: varchar("domain", { length: 255 }).notNull(),
    url: varchar("url", { length: 500 }).notNull(),
    title: varchar("title", { length: 300 }),
    /** Extracted text from the pages we were allowed to read. */
    content: text("content"),
    pages: int("pages").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [uniqueIndex("demo_crawls_domain_key").on(t.domain)],
);

/**
 * One row per visitor per domain. Doubles as a lead signal: someone who
 * pointed this at their own company site is further down the funnel than
 * someone who read a page.
 */
export const demoSessions = mysqlTable(
  "demo_sessions",
  {
    id: id(),
    domain: varchar("domain", { length: 255 }).notNull(),
    ip: varchar("ip", { length: 64 }).notNull(),
    messages: int("messages").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [index("demo_sessions_ip_idx").on(t.ip, t.createdAt)],
);

/** Uploaded files. Rows are the index; bytes live under UPLOAD_DIR. */
export const media = mysqlTable("media", {
  id: id(),
  key: varchar("key", { length: 200 }).notNull(),
  filename: varchar("filename", { length: 240 }).notNull(),
  mimeType: varchar("mime_type", { length: 120 }).notNull(),
  bytes: int("bytes").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Failed admin logins, for lockout. Survives restarts, unlike an in-memory map. */
export const loginAttempts = mysqlTable(
  "login_attempts",
  {
    id: id(),
    ip: varchar("ip", { length: 64 }).notNull(),
    at: timestamp("at").defaultNow().notNull(),
  },
  (t) => [index("login_attempts_ip_idx").on(t.ip, t.at)],
);

/**
 * Jessica's knowledge base — docs/CHATBOT.md.
 *
 * The site's own content (services, pricing, glossary, insights) is already
 * structured and is read directly, so this table is for what is NOT on a page:
 * the answers to questions people actually ask in a chat. Ownership of the IP,
 * what happens if a build goes wrong, whether you work weekends, why there are
 * no case studies yet.
 *
 * `question` is not a title. It is stored in the words a visitor would use,
 * because retrieval scores on overlap with what they typed — an entry titled
 * "Engagement model" never matches "do I have to pay upfront?".
 */
export const kbEntries = mysqlTable(
  "kb_entries",
  {
    id: id(),
    /** Phrased as a visitor would ask it. */
    question: varchar("question", { length: 300 }).notNull(),
    /** The answer, in Jessica's voice. Plain text, 2–5 sentences. */
    answer: text("answer").notNull(),
    /** Grouping for the admin table only; retrieval ignores it. */
    category: varchar("category", { length: 80 }),
    /**
     * Extra words a visitor might use that do not appear in the question or
     * answer — "cost", "pricing", "kitna", "rate". Comma-separated. This is
     * the cheapest way to fix a miss without rewriting the entry.
     */
    keywords: varchar("keywords", { length: 400 }),
    sortOrder: int("sort_order").default(0).notNull(),
    published: boolean("published").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [index("kb_pub_idx").on(t.published, t.sortOrder)],
);

/**
 * One row per chat conversation.
 *
 * Kept for two reasons, in this order: every unanswered question is a gap in
 * the knowledge base above, and a conversation that produced a lead is the
 * context the sales call should open with. `messages` is the whole transcript
 * as JSON — conversations are small and are always read whole, so a second
 * table of rows would buy nothing.
 */
export const chatSessions = mysqlTable(
  "chat_sessions",
  {
    id: id(),
    /** Client-generated, stored in sessionStorage. Not a security boundary. */
    sessionKey: varchar("session_key", { length: 64 }).notNull(),
    ip: varchar("ip", { length: 64 }),
    userAgent: varchar("user_agent", { length: 256 }),
    /** Where the conversation started, for attribution. */
    sourcePath: varchar("source_path", { length: 200 }),
    messages: json("messages").$type<{ role: "user" | "assistant"; content: string }[]>(),
    turns: int("turns").default(0).notNull(),
    /** Set when the conversation produced a row in `leads`. */
    leadId: bigint("lead_id", { mode: "number", unsigned: true }),
    /** What the visitor asked for: a callback, a meeting, or neither. */
    intent: mysqlEnum("intent", ["none", "callback", "meeting"]).default("none").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    uniqueIndex("chat_sessions_key").on(t.sessionKey),
    index("chat_sessions_created_idx").on(t.createdAt),
  ],
);

/**
 * How Jessica presents herself — one row, edited at /admin/jessica.
 *
 * A single row rather than a key/value bag, so every setting is a typed column
 * with a default and the read path needs no parsing or casting. There is no UI
 * to create a second row; `lib/chat/settings.ts` reads the first and falls back
 * to code defaults, which means the widget works before this table is ever
 * touched and keeps working if it is emptied.
 *
 * What is NOT here: the guardrails. Prices, case studies and contact details
 * stay in code because they are the rules that stop her inventing things, and
 * a text box in an admin panel is exactly how such a rule gets softened by
 * accident at 11pm.
 */
export const chatSettings = mysqlTable("chat_settings", {
  id: id(),

  /** Off removes her from the site entirely — no launcher, no API cost. */
  enabled: boolean("enabled").default(true).notNull(),
  name: varchar("name", { length: 60 }).default("Jessica").notNull(),
  /** Under her name in the chat header. */
  tagline: varchar("tagline", { length: 140 }),

  /** Her first message inside the chat. */
  openingMessage: text("opening_message"),

  /** The bubble that introduces her. */
  greetingTitle: varchar("greeting_title", { length: 80 }),
  greetingText: varchar("greeting_text", { length: 200 }),
  /**
   * first_visit  once in a visitor's life — the default, and the kind one
   * every_session once per tab, for a site people return to often
   * off           she waits to be clicked
   */
  greetingMode: mysqlEnum("greeting_mode", ["first_visit", "every_session", "off"])
    .default("first_visit")
    .notNull(),
  /** Seconds before the bubble appears. */
  greetingDelay: int("greeting_delay").default(4).notNull(),

  /** The starter questions. Up to four; more than that is a menu, not a hint. */
  suggestions: json("suggestions").$type<string[]>(),

  /**
   * Appended to her instructions. For tone and emphasis — "mention that we
   * work weekends", "lead with automation rather than chatbots". Not the place
   * for facts: those belong in the knowledge base, where they are retrieved
   * only when relevant instead of costing tokens on every single turn.
   */
  persona: text("persona"),

  /** Turns before she asks for a human. Guards the model bill. */
  maxTurns: int("max_turns").default(12).notNull(),

  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

/**
 * Every model call, and what it cost — the row behind /admin usage.
 *
 * One row per successful completion. Failures are not recorded because a 429
 * or a timeout consumes no tokens, and counting them would make the number
 * mean something other than spend.
 *
 * Input and output are stored separately rather than summed: they are priced
 * differently by every provider, and input is the figure that matters here
 * anyway — the context is resent on every message, so it is what decides how
 * many questions fit inside a per-minute ceiling.
 */
export const aiUsage = mysqlTable(
  "ai_usage",
  {
    id: id(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    /** Which feature spent it. Jessica and the public demo bill differently. */
    surface: mysqlEnum("surface", ["chat", "demo", "other"]).default("other").notNull(),
    provider: varchar("provider", { length: 24 }).notNull(),
    model: varchar("model", { length: 120 }),
    inputTokens: int("input_tokens").default(0).notNull(),
    outputTokens: int("output_tokens").default(0).notNull(),
  },
  (t) => [index("ai_usage_created_idx").on(t.createdAt), index("ai_usage_surface_idx").on(t.surface, t.createdAt)],
);
