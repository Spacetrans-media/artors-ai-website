/**
 * Hero copy and the sample-run ledger.
 * Copy source of truth: docs/COPY.md §1.
 */

/**
 * A run of sub-headline copy. `em` lifts the phrase to 700 so the three
 * outcomes read as a set without the paragraph needing to be long.
 */
export type SubSegment = { text: string; em?: boolean };

/**
 * Positioning note, 2026-09-06 — read before editing this file.
 *
 * The hero was repositioned from "full-service AI agency" to agentic AI and
 * multi-agent systems. Two constraints shaped the wording, and both still
 * apply:
 *
 *   1. NO SUPERLATIVES. "India's leading" was considered and dropped. Artors
 *      has no clients or case studies yet, so a superiority claim is exactly
 *      the kind of thing docs/PLAN.md §2 forbids and the kind ASCI acts on.
 *      Everything below is a statement of what we build, never of rank.
 *   2. NO GEOGRAPHIC CEILING. Clients are targeted globally, so the headline
 *      carries no country. Gurugram stays in the trust line because a real
 *      address is a trust signal, not a limit — and "remote, worldwide" is a
 *      statement of availability, not a claim about clients we have served.
 */
export const hero = {
  /** Setup line — quiet in tone, full ink. */
  headlineSetup: "Most AI answers questions.",
  /** Payoff — display size, uppercase, carries the gradient. */
  headlinePayoff: "Ours runs the work.",

  /**
   * Deliberately short. The hero states what we are and what changes;
   * the detail belongs further down the page, not in the first screen.
   */
  sub: [
    { text: "We build " },
    { text: "agentic AI", em: true },
    {
      text: " for business — teams of AI agents that handle sales, support, operations and reporting end to end, so ",
    },
    { text: "revenue goes up", em: true },
    { text: ", " },
    { text: "cost comes down", em: true },
    { text: ", and " },
    { text: "your team gets its hours back", em: true },
    { text: "." },
  ] satisfies SubSegment[],

  primaryCta: { label: "Book a Free Strategy Call", href: "/contact" },
  secondaryCta: { label: "See What We Build", href: "/services" },

  trustLine: "Gurugram, India · Working remotely worldwide · Live in days",
} as const;

export type LedgerRow = {
  /** Wall-clock stamp, rendered with tabular figures. */
  time: string;
  /** What happened. */
  event: string;
  /** The detail that makes it concrete. */
  detail: string;
  /** Which system did it — shows the stack working together, not one bot. */
  channel: string;
  /** Marks the row the whole run exists to produce. */
  highlight?: boolean;
};

export const ledger = {
  label: "Sample run",
  subject: "Clinic receptionist",
  /** Honest framing — this is a recording, not a live feed. */
  note: "Recorded",
  href: "/work",

  /**
   * Five steps, not six. Enough to show four systems handing work to
   * each other; any more and the panel starts reading as a log file.
   */
  rows: [
    {
      time: "09:42:07",
      event: "Inbound call",
      detail: "answered in 1.2s",
      channel: "Voice",
    },
    {
      time: "09:42:41",
      event: "Caller identified",
      detail: "returning patient",
      channel: "CRM",
    },
    {
      time: "09:43:02",
      event: "Intent captured",
      detail: "reschedule appointment",
      channel: "Voice",
    },
    {
      time: "09:43:31",
      event: "Appointment booked",
      detail: "Tue 16:30, confirmed",
      channel: "WhatsApp",
      highlight: true,
    },
    {
      time: "09:43:32",
      event: "CRM updated",
      detail: "record closed",
      channel: "CRM",
    },
  ] satisfies LedgerRow[],

  summary: ["5 steps", "85 seconds", "0 human minutes"],
} as const;
