/**
 * /tools — interactive calculators.
 *
 * Copy lives here rather than in the database because the calculators are
 * bespoke components, not rows: the maths is code, so a collection would add
 * an editing surface for the text while the part that matters stayed in the
 * repo anyway.
 *
 * Editorial rule these follow, from docs/PLAN.md §2: the calculators must not
 * overstate. They report what something costs a business TODAY, using numbers
 * the visitor supplied and assumptions shown on screen. They never claim a
 * saving Artors would deliver, because that number would be invented and the
 * visitor would be right not to believe it.
 */

export type Tool = {
  slug: string;
  /** The interactive component to mount. */
  component: "missed-call" | "automation-roi" | "website-agent";
  title: string;
  /** Browser + search title, kept under 60 characters. */
  metaTitle: string;
  metaDescription: string;
  /** 40–60 words under the H1. The passage AI search extracts. */
  directAnswer: string;
  intro: string;
  /** Markdown, rendered under the calculator. */
  body: string;
  faq: { q: string; a: string }[];
  related: { label: string; href: string }[];
};

export const tools: Tool[] = [
  {
    slug: "website-agent",
    component: "website-agent",
    title: "Build an AI agent for your website",
    metaTitle: "Free AI Website Agent Demo | Artors",
    metaDescription:
      "Paste your website address and talk to an AI agent that has read your own pages. No sign-up, no trial, nothing stored — it takes about thirty seconds.",
    directAnswer:
      "To see whether an AI agent would work on your website, point one at your own pages rather than a demo script. Enter your address below and this reads a handful of your public pages, then answers questions about your business the way a visitor would ask them — in about thirty seconds, with no sign-up.",
    intro:
      "Most AI demos answer questions about a fictional company. This one answers questions about yours. Enter your address, give it half a minute, then ask it what a customer would ask.",
    body: `## What it just did

Four steps, and none of them are clever:

1. **Fetched your homepage** and checked your robots.txt first — if you ask crawlers to stay out of a section, we stayed out.
2. **Followed your internal links**, shallowest first, because /about and /services describe a business better than a 2019 blog post does.
3. **Stripped the markup** down to the readable text.
4. **Handed that text to a language model** with one instruction: answer only from this, and admit it when the answer is not there.

That last rule is the whole thing. A model asked about your delivery radius without being given your delivery radius will invent one, confidently. Grounding is what separates a system you can put in front of customers from one you cannot.

## Why the answers are thinner than the real thing

This demo reads about a dozen pages and forgets everything afterwards. A deployed agent knows your whole site, your price list, your stock, your calendar — and it can act: book the appointment, raise the ticket, write the enquiry into your CRM.

The gap between them is not model quality. It is connections.

## If the demo came back empty

That happens with sites rendered entirely in JavaScript. The crawler sees an empty shell where a visitor sees a page.

Worth knowing, because **search engines and AI assistants see roughly what our crawler saw.** If we found nothing readable, that is a discoverability problem you had before today, and it is worth fixing regardless of whether you ever buy an AI agent.

## What we did not do

No account, no email gate, no card. We did not store your pages beyond a short cache, and we did not read anything your robots.txt asked us to leave alone.`,
    faq: [
      {
        q: "Do you store my website content?",
        a: "Only briefly, as a cache, so that trying the same site again does not mean crawling it a second time. It is public content from your own pages, and it is not used for anything else.",
      },
      {
        q: "Why did it only read a few pages?",
        a: "The demo caps the crawl deliberately — it is meant to prove the idea in thirty seconds, not to index your site. A real deployment reads everything and keeps it up to date.",
      },
      {
        q: "It could not read my site. Why?",
        a: "Usually one of two reasons: the site is rendered entirely in JavaScript, so a crawler sees an empty page, or the robots.txt asks crawlers not to read it. The first is worth fixing — search engines see much the same thing.",
      },
      {
        q: "Do you honour robots.txt?",
        a: "Yes. We read it before anything else and skip whatever it disallows. Plenty of tools in this category do not; we publish a security page, so we do.",
      },
      {
        q: "Can the real one do more than answer questions?",
        a: "That is the point of it. A deployed agent books appointments, qualifies enquiries against your criteria, routes to the right person and writes the result into your CRM. Answering questions is the easy part.",
      },
    ],
    related: [
      { label: "Conversational AI — voice and chat", href: "/services/conversational-ai" },
      { label: "What is retrieval-augmented generation?", href: "/glossary/rag" },
      { label: "AI agent, chatbot or automation: which do you need?", href: "/insights/ai-agent-chatbot-or-automation" },
    ],
  },

  {
    slug: "missed-call-cost-calculator",
    component: "missed-call",
    title: "Missed call cost calculator",
    metaTitle: "Missed Call Cost Calculator | Artors",
    metaDescription:
      "Work out what unanswered calls cost your business each month. Enter your call volume, how many go unanswered and your average deal value — the result is instant and nothing is stored.",
    directAnswer:
      "To calculate what missed calls cost you, multiply your monthly unanswered calls by the share that would have become customers, then by your average deal value. A business taking 40 calls a day and missing a fifth of them is usually losing more per month than a system to answer them would cost.",
    intro:
      "Every business knows some calls go unanswered. Very few have put a number on it. Enter yours below — the calculation happens in your browser and nothing is sent anywhere.",
    body: `## How this is calculated

Four numbers, multiplied:

1. **Calls a month** — your daily call volume across the working days you set.
2. **Unanswered** — the share nobody picks up: after hours, during lunch, while the line is already busy.
3. **Would have converted** — of those unanswered callers, the share that would have become customers had someone answered.
4. **Average deal value** — what one of those customers is worth to you.

The result is what those calls are worth in revenue you did not get a chance to win.

## Getting the inputs right

**Call volume** is usually available from your phone provider or CRM. Estimating from memory tends to undercount, because the calls you remember are the ones you answered.

**The unanswered share** is the number most businesses guess badly. If you have never measured it, look at a single busy Monday rather than a monthly average — most missed calls cluster into the hours when you were already busy, which is exactly when the caller was ready to buy.

**The conversion share** should be your realistic rate for answered enquiries, not your best month. If half the people who reach you become customers, use half. A caller who could not reach you is not less interested than one who could — they simply called someone else.

## What the number does and does not mean

It is an estimate of missed opportunity, not a bill. Some of those callers rang back. Some were not real prospects. Some would have been lost anyway.

It is still worth calculating, because the figure is almost always larger than people expect, and because it makes a decision concrete that was previously a feeling. If the monthly figure comfortably exceeds what a system to answer those calls would cost, the decision answers itself. If it does not, you have saved yourself a project.

## What to do about it

A call that is answered in twenty seconds by a system that can book, qualify or route is worth more than one that goes to voicemail — voicemail conversion is very low, because a caller who wanted an answer now will usually try the next number instead.

The realistic options are more staff on the phones, an answering service, or a voice system that handles the predictable calls and hands the rest to a person. Which one makes sense depends on your volume and how much of it is genuinely repetitive.`,
    faq: [
      {
        q: "What counts as a missed call?",
        a: "Any call nobody spoke to: rang out, went to voicemail, hit a busy line, or came in after hours. If the caller did not reach a person or a system that could help them, count it.",
      },
      {
        q: "Is my data stored?",
        a: "No. The calculation runs entirely in your browser. Nothing is sent to a server and nothing is recorded — you can check that in your browser's network tab.",
      },
      {
        q: "What if I do not know my numbers?",
        a: "Estimate, and estimate conservatively. The purpose is to find out whether the figure is in the thousands or the lakhs, which decides whether this is worth acting on. Precision beyond that does not change the decision.",
      },
      {
        q: "Do voicemails not convert?",
        a: "Some do, but far fewer than most businesses assume. A caller with an immediate need usually rings the next number on the list rather than waiting for a call back, which is why speed of answer matters more than the quality of the callback.",
      },
    ],
    related: [
      { label: "Conversational AI — voice and chat", href: "/services/conversational-ai" },
      { label: "What is voice AI?", href: "/glossary/voice-ai" },
      { label: "Why Hindi and Hinglish break most voice AI", href: "/insights/why-hindi-and-hinglish-break-voice-ai" },
    ],
  },

  {
    slug: "automation-roi-calculator",
    component: "automation-roi",
    title: "Automation ROI calculator",
    metaTitle: "Automation ROI Calculator | Artors",
    metaDescription:
      "Find out what a repetitive process costs your business each year in staff time. Enter hours, headcount and hourly cost — the result is instant and nothing is stored.",
    directAnswer:
      "To find what a manual process costs, multiply the hours a week spent on it by the number of people doing it, by their hourly cost, by the working weeks in your year. Include the time spent correcting mistakes — for most repetitive processes that correction time is a third of the total and is the part automation removes most reliably.",
    intro:
      "Before automating anything, it helps to know what the process costs you today. Enter your numbers below — the calculation happens in your browser and nothing is sent anywhere.",
    body: `## How this is calculated

Hours a week, times the people doing it, times their hourly cost, times the working weeks in your year. Time spent fixing mistakes is added, because it is part of the true cost and it is usually invisible in job descriptions.

The result is what the process costs you annually in staff time at today's rates.

## Getting the hourly cost right

Use fully loaded cost, not salary. Salary divided by hours understates what an hour actually costs you once you include employer contributions, equipment, workspace and management time. A common rule of thumb is somewhere between 1.25 and 1.4 times base salary, but use your own figure if you have one.

If you are unsure, running the calculation twice — once at salary rate and once at 1.3 times — gives you the range, and the range is usually enough to make the decision.

## Why the correction time matters

Most estimates of a manual process count the time to do it and ignore the time to fix it. Re-keying data between systems produces errors at a rate that surprises people, and each one costs more to find and correct than it did to create.

That correction work is also the part automation removes most reliably. A system that moves a record between two places does not mistype it on a Friday afternoon.

## What this number is not

It is not your saving. Automating a process rarely removes 100% of the time it takes — there are exceptions to handle, approvals to give, and the system itself needs occasional attention. A realistic expectation for a well-chosen process is that most of the routine time goes and some supervision remains.

It is also not the whole benefit. The measurable second-order effects are usually consistency, speed and visibility: the work happens at the same pace regardless of who is in the office, and because a system that runs a process also records it, you can finally measure it.

## How to read the result

Compare the annual figure against what building the system would cost. If the process costs several times a build in a single year, the case is straightforward. If it is close, the deciding factor is usually not money — it is whether the process is stable enough to be worth encoding, which is a question about your business rather than about software.`,
    faq: [
      {
        q: "Does automation remove all of this cost?",
        a: "No, and any vendor saying it does is overselling. A well-chosen process usually loses most of its routine time while keeping some supervision and exception handling. Treat the figure as the size of the prize, not the cheque.",
      },
      {
        q: "What hourly cost should I use?",
        a: "Fully loaded cost rather than salary — salary alone understates what an hour costs once contributions, equipment and management time are included. Many businesses use roughly 1.25 to 1.4 times base salary.",
      },
      {
        q: "Is my data stored?",
        a: "No. Everything is calculated in your browser. Nothing is sent to a server and nothing is recorded.",
      },
      {
        q: "What if several people spend different amounts of time on it?",
        a: "Use the average per person and the headcount. If one person carries most of it, run the calculation for that person alone first — the figure is often large enough on its own to answer the question.",
      },
    ],
    related: [
      { label: "Business Process Automation", href: "/services/business-process-automation" },
      { label: "What is business process automation?", href: "/glossary/business-process-automation" },
      { label: "How to choose the first process to automate", href: "/insights/how-to-choose-the-first-process-to-automate" },
    ],
  },
];

export function getTool(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug);
}
