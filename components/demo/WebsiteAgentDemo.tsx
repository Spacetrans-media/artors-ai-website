"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import BotFace from "@/components/chat/BotFace";
import d from "./demo.module.css";

/**
 * The website-agent demo.
 *
 * Three states, deliberately: enter a URL, watch it read the site, talk to the
 * result. No account, no trial clock, no billing — the whole point is that the
 * payoff lands in about thirty seconds, while the visitor is still on the page
 * and still interested. The CTA sits directly under the conversation because
 * that is the moment the question "can I have this?" occurs to them.
 */

type Phase = "idle" | "reading" | "ready" | "error";
type Msg = { role: "user" | "assistant"; content: string };

const READING_STEPS = [
  "Fetching the page…",
  "Checking robots.txt…",
  "Reading the pages we are allowed to…",
  "Building the agent…",
];

export default function WebsiteAgentDemo() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [site, setSite] = useState<{
    domain: string;
    title: string;
    pages: number;
    excerpt: string;
  } | null>(null);
  // The agent starts closed inside the preview, exactly as it would on their
  // own site — seeing the launcher first is part of what is being demonstrated.
  const [chatOpen, setChatOpen] = useState(false);
  const [step, setStep] = useState(0);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [limitHit, setLimitHit] = useState<string | null>(null);

  const streamRef = useRef<HTMLDivElement>(null);

  // Step the progress copy while the crawl runs. Cleared on unmount and on
  // completion — nothing keeps ticking once the work is done.
  useEffect(() => {
    if (phase !== "reading") return;
    const id = setInterval(() => setStep((s) => (s + 1) % READING_STEPS.length), 1400);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || phase === "reading") return;

    setPhase("reading");
    setError(null);
    setStep(0);

    try {
      const res = await fetch("/api/demo/crawl", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        setPhase("error");
        return;
      }
      setSite({
        domain: json.domain,
        title: json.title,
        pages: json.pages ?? 0,
        excerpt: json.excerpt ?? "",
      });
      setChatOpen(false);
      setMessages([
        {
          role: "assistant",
          content: `I have read ${json.pages ?? "a few"} pages of ${json.title || json.domain}. Ask me anything a customer might — what you do, who you serve, how to get in touch.`,
        },
      ]);
      setPhase("ready");
    } catch {
      setError("We could not reach that site. Check the address and try again.");
      setPhase("error");
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const question = draft.trim();
    if (!question || sending || !site || limitHit) return;

    const next: Msg[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setDraft("");
    setSending(true);

    try {
      const res = await fetch("/api/demo/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          domain: site.domain,
          // The greeting is ours, not a turn the model needs.
          messages: next.filter((m, i) => i > 0),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 429) setLimitHit(json.error);
        setMessages([
          ...next,
          { role: "assistant", content: json.error ?? "Something went wrong." },
        ]);
        return;
      }
      setMessages([...next, { role: "assistant", content: json.reply }]);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Something went wrong. Try again in a moment." },
      ]);
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setPhase("idle");
    setChatOpen(false);
    setSite(null);
    setMessages([]);
    setDraft("");
    setError(null);
    setLimitHit(null);
  }

  /* ---------------------------------------------------------- entry form -- */
  if (phase === "idle" || phase === "reading" || phase === "error") {
    return (
      <div className={d.panel}>
        <form onSubmit={start} className={d.entry}>
          <label htmlFor="demo-url" className={d.entryLabel}>
            Your website address
          </label>
          <div className={d.entryRow}>
            <input
              id="demo-url"
              className={d.entryInput}
              type="text"
              inputMode="url"
              autoComplete="url"
              placeholder="yourcompany.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={phase === "reading"}
            />
            <button type="submit" className={d.entryButton} disabled={phase === "reading"}>
              {phase === "reading" ? "Reading…" : "Build the agent"}
            </button>
          </div>

          {phase === "reading" && (
            <p className={d.progress} aria-live="polite">
              <span className={d.spinner} aria-hidden="true" />
              {READING_STEPS[step]}
            </p>
          )}

          {phase === "error" && error && (
            <p className={d.error} role="alert">
              {error}
            </p>
          )}

          <p className={d.entryNote}>
            We read a handful of your public pages, and we honour your robots.txt. Nothing is
            stored beyond a short cache, and we never ask for a login.
          </p>
        </form>
      </div>
    );
  }

  /* ----------------------------------------------------------- the preview -- */
  /**
   * Their own site, with the agent sitting on it.
   *
   * A chat box on our page asks the visitor to imagine the result. A browser
   * frame with their domain in the address bar, their own words on the page
   * and the launcher in the corner shows it — and the thing they are looking
   * at is genuinely working, not a picture of one.
   *
   * The page behind is a representation, not an iframe: almost every real site
   * sets X-Frame-Options or a frame-ancestors policy, so embedding theirs
   * would show a blank box on the majority of attempts. What is drawn instead
   * is all real — their title, their favicon, their text, read minutes ago.
   */
  return (
    <div className={d.previewWrap}>
      <div className={d.browser}>
        <div className={d.chrome}>
          <span className={d.lights} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className={d.urlBar}>
            {/* Their real favicon. If it 404s the element hides itself rather
                than leaving a broken-image icon in the address bar. */}
            <img
              src={`https://${site?.domain}/favicon.ico`}
              alt=""
              className={d.favicon}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            {site?.domain}
          </span>
          <button type="button" className={d.reset} onClick={reset}>
            Try another
          </button>
        </div>

        <div className={d.viewport}>
          <div className={d.page} aria-hidden="true">
            <p className={d.pageTitle}>{site?.title || site?.domain}</p>
            <p className={d.pageText}>{site?.excerpt}</p>
          </div>

          {/* The agent, docked exactly where it would sit on their site. */}
          {!chatOpen && (
            <button
              type="button"
              className={`${d.launcher} jessicaLauncher`}
              onClick={() => setChatOpen(true)}
              aria-label="Open the agent"
            >
              <BotFace waving />
              <span className={d.presence} aria-hidden="true" />
            </button>
          )}

          {chatOpen && (
            <div className={d.widget}>
              <div className={d.chatHead}>
                <div>
                  <p className={d.chatLabel}>Agent for</p>
                  <p className={d.chatSite}>{site?.title || site?.domain}</p>
                </div>
                <button
                  type="button"
                  className={d.close}
                  onClick={() => setChatOpen(false)}
                  aria-label="Close"
                >
                  <svg viewBox="0 0 12 12" stroke="currentColor" strokeWidth={1.8} fill="none">
                    <path d="M1 1l10 10M11 1L1 11" />
                  </svg>
                </button>
              </div>

              <div className={d.stream} ref={streamRef} aria-live="polite">
                {messages.map((m, i) => (
                  <div key={i} className={m.role === "user" ? d.rowUser : d.rowBot}>
                    <div className={m.role === "user" ? d.bubbleUser : d.bubbleBot}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className={d.rowBot}>
                    <div className={d.bubbleBot}>
                      <span className={d.dots} aria-label="Thinking">
                        <span />
                        <span />
                        <span />
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={send} className={d.composer}>
                <input
                  className={d.composerInput}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={
                    limitHit ? "Demo limit reached" : "Ask it something a customer would…"
                  }
                  disabled={sending || Boolean(limitHit)}
                  aria-label="Your question"
                />
                <button
                  type="submit"
                  className={d.composerButton}
                  disabled={sending || Boolean(limitHit) || !draft.trim()}
                >
                  Ask
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      <div className={d.cta}>
        <p className={d.ctaText}>
          {limitHit
            ? "That is the demo's limit — the real thing has none."
            : `That is ${site?.domain} with an agent on it, answering from the ${site?.pages} pages we just read. The real one knows your whole site, your prices and your calendar.`}
        </p>
        <Link href="/contact" className={d.ctaLink}>
          Put this on your site
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path d="M3 11L11 3M11 3H4M11 3v7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
