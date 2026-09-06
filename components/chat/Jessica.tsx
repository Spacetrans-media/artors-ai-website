"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
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

const GREETING =
  "Hi, I am Jessica. I can tell you what we build, how projects run, and what it would take for your business. What are you trying to fix?";

const CHIPS = [
  "What does Artors do?",
  "What would it cost?",
  "Can you automate WhatsApp enquiries?",
  "I want to speak to someone",
];

const STORAGE_KEY = "artors.jessica.v1";

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
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: GREETING }]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [action, setAction] = useState<Intent | null>(null);
  const [captured, setCaptured] = useState(false);
  const [sessionKey, setSessionKey] = useState("");

  const streamRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

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

  return (
    <>
      <button
        type="button"
        className={s.launcher}
        data-open={open}
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 80);
        }}
        aria-label="Chat with Jessica"
        aria-expanded={open}
      >
        <span className={s.avatar} aria-hidden="true">
          J
        </span>
        Ask Jessica
        {messages.length === 1 && <span className={s.ping} aria-hidden="true" />}
      </button>

      {open && (
        <div className={s.panel} role="dialog" aria-label="Chat with Jessica">
          <div className={s.head}>
            <span className={s.headAvatar} aria-hidden="true">
              J
            </span>
            <div className={s.headText}>
              <p className={s.headName}>Jessica</p>
              <p className={s.headSub}>Artors — usually replies instantly</p>
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
                {CHIPS.map((c) => (
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
              placeholder="Ask me anything about Artors…"
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
