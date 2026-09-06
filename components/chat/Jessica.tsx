"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import BotFace from "./BotFace";
import s from "./jessica.module.css";

/**
 * Jessica — the assistant, mounted once in the site layout.
 *
 * Three decisions worth knowing about:
 *
 * 1. She does not open by herself. An assistant that ambushes a reader three
 *    seconds in is the most disliked pattern on the web, and the launcher is
 *    visible enough without it.
 * 2. The transcript lives in sessionStorage, so moving between pages does not
 *    restart the conversation. It is per tab and dies with it — the server
 *    keeps its own copy for the team, and the visitor's browser does not need
 *    to remember them tomorrow.
 * 3. The lead form is a real form rendered by this component, never a request
 *    for details typed into the chat. The model decides WHEN to ask; it never
 *    handles WHAT is collected. That keeps validation, the honeypot and the
 *    field names out of a language model's reach.
 */

type Msg = { role: "user" | "assistant"; content: string };
type Intent = "callback" | "meeting";

/**
 * What the widget renders before /api/chat/config answers, and what it falls
 * back to if that request fails. She is never blank and never broken.
 */
type Config = {
  enabled: boolean;
  name: string;
  tagline: string;
  openingMessage: string;
  greetingTitle: string;
  greetingText: string;
  greetingMode: "first_visit" | "every_session" | "off";
  greetingDelay: number;
  suggestions: string[];
  maxTurns: number;
};

const FALLBACK: Config = {
  enabled: true,
  name: "Jessica",
  tagline: "Artors — usually replies instantly",
  openingMessage:
    "Hi, I am Jessica. I can tell you what we build, how projects run, and what it would take for your business. What are you trying to fix?",
  greetingTitle: "Ask Jessica",
  greetingText: "I am online — how can I help you today?",
  greetingMode: "first_visit",
  greetingDelay: 4,
  suggestions: [
    "What does Artors do?",
    "What would it cost?",
    "Can you automate WhatsApp enquiries?",
    "I want to speak to someone",
  ],
  maxTurns: 12,
};

const STORAGE_KEY = "artors.jessica.v1";

/**
 * Whether this person has been greeted already.
 *
 * Which store it lives in is the setting: localStorage means once in a
 * visitor's life, sessionStorage means once per tab. A first-time visitor does
 * not know there is an assistant here, so she introduces herself; someone who
 * has been before already knows, and greeting them on every visit is how a
 * helpful widget turns into an irritating one.
 */
const SEEN_KEY = "artors.jessica.seen";

/**
 * Which store holds the "already greeted" flag depends on the mode chosen in
 * the admin: localStorage outlives the tab, sessionStorage does not.
 */
function store(mode: Config["greetingMode"]): Storage | null {
  try {
    return mode === "every_session" ? sessionStorage : localStorage;
  } catch {
    return null;
  }
}

function hasGreeted(mode: Config["greetingMode"]): boolean {
  try {
    return store(mode)?.getItem(SEEN_KEY) === "1";
  } catch {
    // Private windows and locked-down browsers throw on access. Treating that
    // as "not yet greeted" is the right failure: a new visitor still gets the
    // introduction, and the cost of being wrong is one bubble.
    return false;
  }
}

function markGreeted(mode: Config["greetingMode"]): void {
  try {
    store(mode)?.setItem(SEEN_KEY, "1");
  } catch {
    /* nothing to do; she simply greets again next time */
  }
}

function newSessionKey(): string {
  // crypto.randomUUID is not available on http:// origins in some browsers,
  // and this is an identifier rather than a secret, so a fallback is fine.
  try {
    return crypto.randomUUID().replace(/-/g, "");
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
}

export default function Jessica() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [action, setAction] = useState<Intent | null>(null);
  const [captured, setCaptured] = useState(false);
  const [sessionKey, setSessionKey] = useState("");
  const [greeting, setGreeting] = useState(false);
  const [waving, setWaving] = useState(false);
  const [cfg, setCfg] = useState<Config | null>(null);

  const streamRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  /**
   * Load how she should present herself.
   *
   * Nothing renders until this resolves — a launcher that appears and then
   * vanishes because the admin switched her off is worse than one that appears
   * a moment later. The response is edge-cached, so it is usually instant. If
   * it fails outright she falls back to the built-in copy rather than
   * disappearing, because a working assistant with stale wording beats none.
   */
  useEffect(() => {
    let cancelled = false;
    fetch("/api/chat/config")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((c: Partial<Config>) => {
        if (!cancelled) setCfg({ ...FALLBACK, ...c });
      })
      .catch(() => {
        if (!cancelled) setCfg(FALLBACK);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Her opening line, once config has landed and only for a fresh conversation.
  useEffect(() => {
    if (!cfg) return;
    setMessages((prev) =>
      prev.length ? prev : [{ role: "assistant", content: cfg.openingMessage }],
    );
  }, [cfg]);

  // Restore the conversation, or start one. Wrapped because a browser with
  // storage blocked throws on access rather than returning null.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.sessionKey && Array.isArray(parsed.messages) && parsed.messages.length) {
          setSessionKey(parsed.sessionKey);
          setMessages(parsed.messages);
          setCaptured(Boolean(parsed.captured));
          return;
        }
      }
    } catch {
      /* storage unavailable — a fresh conversation still works */
    }
    setSessionKey(newSessionKey());
  }, []);

  useEffect(() => {
    if (!sessionKey) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionKey, messages, captured }));
    } catch {
      /* not worth telling the visitor about */
    }
  }, [sessionKey, messages, captured]);

  useEffect(() => {
    if (!open) return;
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, action, open]);

  /**
   * She introduces herself, on whichever schedule the admin chose.
   *
   * "first_visit" writes to localStorage, so it happens once in a visitor's
   * life. "every_session" writes to sessionStorage, so it happens once per tab
   * for a site people come back to. Either way the flag is written the moment
   * the bubble appears rather than when it is dismissed — moving to a second
   * page mid-greeting still counts, because a bubble that reappears on every
   * page is exactly why people close these unread.
   */
  useEffect(() => {
    if (!cfg || open || cfg.greetingMode === "off") return;
    if (hasGreeted(cfg.greetingMode)) return;

    const id = setTimeout(() => {
      setGreeting(true);
      setWaving(true);
      markGreeted(cfg.greetingMode);
      // Stop waving after the gesture finishes so she settles into the idle.
      setTimeout(() => setWaving(false), 2000);
    }, cfg.greetingDelay * 1000);
    return () => clearTimeout(id);
  }, [open, cfg]);

  // Escape closes, matching the lead modal.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const ask = useCallback(
    async (question: string) => {
      if (!question.trim() || sending) return;

      const next: Msg[] = [...messages, { role: "user", content: question.trim() }];
      setMessages(next);
      setDraft("");
      setSending(true);
      setAction(null);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sessionKey,
            sourcePath: pathname,
            // The greeting is ours, not a turn the model needs to see.
            messages: next.slice(1),
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setMessages([
            ...next,
            {
              role: "assistant",
              content: "Something went wrong there. Try again in a moment.",
            },
          ]);
          return;
        }
        setMessages([...next, { role: "assistant", content: json.reply }]);
        if (json.action && !captured) setAction(json.action);
      } catch {
        setMessages([
          ...next,
          {
            role: "assistant",
            content:
              "I could not reach the team just now. Try again, or email us at ai@artors.in.",
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [messages, pathname, sending, sessionKey, captured],
  );

  // Config decides whether she exists at all, so wait for it rather than
  // flashing a launcher the admin has switched off.
  if (!cfg || !cfg.enabled) return null;

  return (
    <>
      <div className={s.dock} data-open={open || undefined}>
        {greeting && (
          <div className={s.greeting}>
            <button
              type="button"
              className={s.greetingBody}
              onClick={() => {
                setGreeting(false);
                setOpen(true);
                setTimeout(() => inputRef.current?.focus(), 80);
              }}
            >
              <span className={s.greetingTitle}>
                <span className={s.online} aria-hidden="true" />
                {cfg.greetingTitle}
              </span>
              <span className={s.greetingText}>{cfg.greetingText}</span>
            </button>
            <button
              type="button"
              className={s.greetingClose}
              onClick={() => setGreeting(false)}
              aria-label="Dismiss"
            >
              <svg viewBox="0 0 10 10" stroke="currentColor" strokeWidth={1.6} fill="none">
                <path d="M1 1l8 8M9 1L1 9" />
              </svg>
            </button>
          </div>
        )}

        <button
          type="button"
          className={`${s.launcher} jessicaLauncher`}
          onClick={() => {
            setGreeting(false);
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 80);
          }}
          aria-label={`Chat with ${cfg.name}`}
          aria-expanded={open}
        >
          <BotFace waving={waving} />
          <span className={s.presence} aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div className={s.panel} role="dialog" aria-label={`Chat with ${cfg.name}`}>
          <div className={s.head}>
            <span className={s.headAvatar}>
              <BotFace />
            </span>
            <div className={s.headText}>
              <p className={s.headName}>{cfg.name}</p>
              <p className={s.headSub}>{cfg.tagline}</p>
            </div>
            <button
              type="button"
              className={s.close}
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              <svg viewBox="0 0 12 12" stroke="currentColor" strokeWidth={1.8} fill="none">
                <path d="M1 1l10 10M11 1L1 11" />
              </svg>
            </button>
          </div>

          <div className={s.stream} ref={streamRef} aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? s.rowUser : s.rowBot}>
                <div className={m.role === "user" ? s.bubbleUser : s.bubbleBot}>{m.content}</div>
              </div>
            ))}

            {sending && (
              <div className={s.rowBot}>
                <div className={s.bubbleBot}>
                  <span className={s.dots} aria-label="Typing">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              </div>
            )}

            {messages.length === 1 && !sending && (
              <div className={s.chips}>
                {cfg.suggestions.map((c) => (
                  <button key={c} type="button" className={s.chip} onClick={() => ask(c)}>
                    {c}
                  </button>
                ))}
              </div>
            )}

            {action && !captured && (
              <CaptureForm
                intent={action}
                sessionKey={sessionKey}
                sourcePath={pathname}
                onDone={() => {
                  setCaptured(true);
                  setAction(null);
                  setMessages((prev) => [
                    ...prev,
                    {
                      role: "assistant",
                      content:
                        "Got it — that is with the team now, and someone will be in touch. Anything else while you are here?",
                    },
                  ]);
                }}
              />
            )}
          </div>

          <form
            className={s.composer}
            onSubmit={(e) => {
              e.preventDefault();
              ask(draft);
            }}
          >
            <input
              ref={inputRef}
              className={s.input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Ask ${cfg.name} anything…`}
              disabled={sending}
              aria-label="Your message"
            />
            <button type="submit" className={s.send} disabled={sending || !draft.trim()}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M2 8h11M9 4l4 4-4 4" />
              </svg>
              <span className="sr-only">Send</span>
            </button>
          </form>

          <p className={s.footer}>Powered by Artors AI</p>
        </div>
      )}
    </>
  );
}

/**
 * The ask. Phone is required and email is not, because in Indian B2B a number
 * gets answered and an address often does not.
 */
function CaptureForm({
  intent,
  sessionKey,
  sourcePath,
  onDone,
}: {
  intent: Intent;
  sessionKey: string;
  sourcePath: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/chat/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionKey,
          sourcePath,
          intent,
          name: String(data.get("name") ?? ""),
          phone: String(data.get("phone") ?? ""),
          email: String(data.get("email") ?? ""),
          preferred: String(data.get("preferred") ?? ""),
          website: String(data.get("website") ?? ""),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError("That did not go through. Check the number and try again.");
        return;
      }
      onDone();
    } catch {
      setError("That did not go through. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={s.capture} onSubmit={submit}>
      <p className={s.captureTitle}>
        {intent === "meeting" ? "Book a consultation call" : "We will call you back"}
      </p>

      <input className={s.field} name="name" placeholder="Your name" required maxLength={120} />
      <input
        className={s.field}
        name="phone"
        type="tel"
        inputMode="tel"
        placeholder="Phone number"
        required
        maxLength={40}
      />
      <input
        className={s.field}
        name="email"
        type="email"
        placeholder="Email (optional)"
        maxLength={160}
      />
      <input
        className={s.field}
        name="preferred"
        placeholder={
          intent === "meeting" ? "When suits you? e.g. Thursday afternoon" : "Best time to call"
        }
        maxLength={120}
      />

      <input
        className={s.honey}
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <button type="submit" className={s.submit} disabled={busy}>
        {busy ? "Sending…" : intent === "meeting" ? "Request the call" : "Request a callback"}
      </button>

      {error && <p className={s.captureNote}>{error}</p>}
      <p className={s.captureNote}>
        We use this to get back to you about your enquiry, nothing else.
      </p>
    </form>
  );
}
