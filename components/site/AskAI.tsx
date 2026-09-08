import { SITE_URL } from "@/lib/seo/site";
import s from "./askai.module.css";

/**
 * "Not sure yet? Ask an AI about us."
 *
 * Three deep links that open ChatGPT, Claude or Perplexity with a question
 * about Artors already typed in. No JavaScript — they are anchors, so this
 * costs nothing on a page that already carries a chat widget.
 *
 * WHY IT IS WORTH HAVING, beyond looking confident: people now check companies
 * by asking an assistant rather than reading an about page, and this both
 * meets that behaviour and creates the query. It is the same bet the glossary
 * and llms.txt make — that being legible to AI is becoming a distribution
 * channel — except here the visitor is the one asking.
 *
 * THE RISK, stated plainly: Artors is new. An assistant answering from memory
 * will say it has never heard of us, which is a worse first impression than no
 * button at all. The prompt is therefore built to make browsing the obvious
 * move — it opens with the bare URL, asks for a summary of that page, and only
 * then asks the judgement question. All three of these products fetch a URL
 * when handed one; that is what turns "who?" into a real answer read off this
 * site's own pages.
 */

const PROMPT = `Read ${SITE_URL} and tell me what Artors does, what kind of AI agents and automation they build, and whether they would be a sensible partner for a business like mine.`;

type Destination = {
  label: string;
  /** Query-param entry point. Each takes the prompt as `q`. */
  href: (prompt: string) => string;
  icon: React.ReactNode;
};

const DESTINATIONS: Destination[] = [
  {
    label: "Ask ChatGPT",
    href: (p) => `https://chatgpt.com/?q=${encodeURIComponent(p)}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M22.28 9.82a5.99 5.99 0 0 0-.52-4.91 6.05 6.05 0 0 0-6.51-2.9A6 6 0 0 0 4.98 4.18a5.99 5.99 0 0 0-4 2.9 6.05 6.05 0 0 0 .74 7.1 5.98 5.98 0 0 0 .51 4.91 6.05 6.05 0 0 0 6.52 2.9A5.98 5.98 0 0 0 13.26 24a6.06 6.06 0 0 0 5.77-4.21 5.99 5.99 0 0 0 4-2.9 6.06 6.06 0 0 0-.75-7.07Zm-9.02 12.6a4.48 4.48 0 0 1-2.88-1.04l.14-.08 4.78-2.76a.79.79 0 0 0 .39-.68v-6.74l2.02 1.17a.07.07 0 0 1 .04.06v5.58a4.5 4.5 0 0 1-4.5 4.49ZM3.6 18.3a4.47 4.47 0 0 1-.54-3.01l.14.09 4.78 2.76a.78.78 0 0 0 .78 0l5.84-3.37v2.33a.08.08 0 0 1-.03.06L9.74 19.95a4.5 4.5 0 0 1-6.14-1.64ZM2.34 7.9a4.49 4.49 0 0 1 2.35-1.98v5.68a.77.77 0 0 0 .38.67l5.81 3.35-2.02 1.17a.07.07 0 0 1-.07 0L3.96 14a4.5 4.5 0 0 1-1.65-6.13Zm16.6 3.86-5.83-3.4L15.12 7.2a.07.07 0 0 1 .07 0l4.83 2.79a4.49 4.49 0 0 1-.68 8.1v-5.67a.79.79 0 0 0-.4-.67Zm2.01-3.02-.14-.09-4.77-2.78a.78.78 0 0 0-.79 0L9.42 9.24V6.91a.07.07 0 0 1 .03-.06l4.83-2.79a4.49 4.49 0 0 1 6.67 4.65ZM8.32 12.87 6.3 11.7a.07.07 0 0 1-.04-.06V6.07a4.49 4.49 0 0 1 7.37-3.45l-.14.08L8.7 5.46a.79.79 0 0 0-.39.68l-.01 6.73Zm1.1-2.36 2.6-1.5 2.61 1.5v3l-2.6 1.5-2.61-1.5v-3Z" />
      </svg>
    ),
  },
  {
    label: "Ask Claude",
    href: (p) => `https://claude.ai/new?q=${encodeURIComponent(p)}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M4.71 15.23l4.6-2.58.08-.22-.08-.13h-.22l-.75-.05-2.57-.07-2.23-.09-2.16-.12-.54-.11L.33 11.2l.05-.33.45-.3.65.05 1.43.1 2.15.15 1.56.09 2.31.24h.37l.05-.15-.13-.09-.1-.1-2.29-1.55-2.48-1.64-1.3-.94-.7-.48-.36-.44-.15-.99.64-.71.87.06.22.06.88.68 1.88 1.46 2.46 1.8.36.3.14-.1.02-.07-.16-.27-1.35-2.44L9.1 3.5l-.64-1.03-.17-.62a2.98 2.98 0 01-.1-.73l.73-.99L9.32 0l.97.13.41.36.6 1.38.98 2.18 1.52 2.96.44.88.24.81.09.25h.15v-.14l.13-1.66.23-2.04.23-2.62.08-.74.38-.91.75-.5.59.28.48.69-.07.45-.29 1.87-.56 2.93-.37 1.96h.21l.25-.24 1-1.32 1.67-2.1.74-.83.87-.92.55-.44h1.05l.77 1.15-.35 1.19-1.08 1.37-.9 1.16-1.28 1.73-.8 1.38.07.11.19-.02 2.87-.61 1.55-.28 1.85-.32.84.39.09.4-.33.81-1.98.49-2.32.46-3.46.82-.04.03.05.06 1.56.15.66.03h1.63l3.03.23.79.52.48.64-.08.49-1.22.62-1.65-.4-3.84-.9-1.32-.34h-.18v.11l1.1 1.07 2.01 1.82 2.52 2.34.13.58-.33.46-.34-.05-2.24-1.68-.86-.76-1.96-1.65h-.13v.17l.45.66 2.38 3.58.13 1.1-.18.36-.61.22-.67-.13-1.39-1.94-1.43-2.19-1.15-1.96-.14.08-.68 7.3-.32.37-.73.28-.61-.46-.32-.75.32-1.48.39-1.93.31-1.53.29-1.9.17-.63-.01-.05h-.14l-1.44 1.97-2.18 2.95-1.73 1.85-.41.16-.72-.37.07-.66.4-.6 2.4-3.05 1.45-1.9.94-1.09-.01-.16h-.06L5.5 17.29l-1.36.18-.58-.55.07-.9.28-.29 2.29-1.57z" />
      </svg>
    ),
  },
  {
    label: "Ask Perplexity",
    href: (p) => `https://www.perplexity.ai/search?q=${encodeURIComponent(p)}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
        <path d="M12 3.5v17M12 8.5 5.5 3.9v6.6H3v7h2.5v4.6L12 17.4M12 8.5l6.5-4.6v6.6H21v7h-2.5v4.6L12 17.4" />
      </svg>
    ),
  },
];

export default function AskAI() {
  return (
    <section className={s.band} aria-labelledby="askai-title">
      <p className={s.title} id="askai-title">
        Not sure yet?
      </p>
      <p className={s.sub}>
        Ask an AI what we do. It reads this site and tells you straight — we do not get to
        edit the answer.
      </p>

      <div className={s.row}>
        {DESTINATIONS.map((d) => (
          <a
            key={d.label}
            href={d.href(PROMPT)}
            target="_blank"
            rel="noopener noreferrer"
            className={s.pill}
          >
            <span className={s.icon}>{d.icon}</span>
            {d.label}
          </a>
        ))}
      </div>
    </section>
  );
}
