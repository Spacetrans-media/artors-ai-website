"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * The site-wide GSAP scrolltelling layer. Mounted once in the root layout.
 *
 * The whole page rides the scrollbar: reveals are scrubbed in BOTH
 * directions (scroll back up and the page un-builds), the hero hands off
 * as you leave it, and two sections pin as set pieces — the dark Proof
 * band and the FLOW process sequence.
 *
 * Perf contract (docs/DESIGN.md §4 still holds):
 *  - transform/opacity/color only, no layout properties
 *  - no free-running rAF loops: everything is ScrollTrigger- or
 *    pointer-event-driven
 *  - all of it behind prefers-reduced-motion: no-preference; with reduced
 *    motion (or no JS) the page renders complete and static, because base
 *    CSS never hides content
 *
 * Choreography, each with its one-sentence reason:
 *  - scrubbed .float-in       → the page assembles under your thumb
 *  - hero exit               → the opening literally hands off to the page
 *  - [data-fx=statement]     → the claim inks in as you read
 *  - Proof pin (desktop)     → the trust content is a held beat, not a blur
 *  - FLOW pin (desktop)      → the four steps play as a sequence
 *  - [data-fx=bar|pct]       → numbers earn their size on arrival
 *  - [data-fx=marks]         → the client strip drifts laterally: texture
 *  - .btn magnetic pull      → primary actions answer the cursor
 */
export default function PageFx() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      const MOTION = "(prefers-reduced-motion: no-preference)";

      /**
       * Re-measure the pins when the viewport WIDTH changes.
       *
       * Pinning makes ScrollTrigger write an inline width onto the pinned
       * section and onto the .pin-spacer it wraps it in. Those are absolute
       * pixel values captured at setup. Narrow the window afterwards and
       * nothing re-measures them: the section stays at its old width, sticks
       * out past the viewport, and the page grows a horizontal scrollbar that
       * has no business being there.
       *
       * Height is deliberately ignored. Mobile browsers fire resize every time
       * the address bar slides away, and refreshing the pins on each of those
       * would be both pointless and visibly janky.
       */
      let lastWidth = document.documentElement.clientWidth;
      let frame = 0;

      const refreshIfWidthChanged = () => {
        const width = document.documentElement.clientWidth;
        if (width === lastWidth) return;
        lastWidth = width;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => ScrollTrigger.refresh());
      };

      /**
       * A ResizeObserver rather than the resize event, and clientWidth rather
       * than innerWidth.
       *
       * The observer fires on anything that actually changes the layout box —
       * a dragged window, a rotated phone, devtools docking, a scrollbar
       * appearing — including cases that never emit a window resize. And
       * clientWidth is what the layout is really measured against, while
       * innerWidth includes the scrollbar and does not always track.
       */
      const observer = new ResizeObserver(refreshIfWidthChanged);
      observer.observe(document.documentElement);

      /** Elements owned by a dedicated branch — generic reveals skip them. */
      const isOwned = (el: HTMLElement) =>
        el.dataset.fx === "flowcol" ||
        el.dataset.fx === "bandhead" ||
        el.closest('[data-fx="proof"]') !== null;

      // ── Shared: scrubbed reveals + statements + hero + strip ─
      mm.add(MOTION, () => {
        const readIndex = (el: Element) =>
          parseFloat(getComputedStyle(el as HTMLElement).getPropertyValue("--i")) || 0;

        // Scrubbed section reveals — reversible, tied to the scrollbar.
        gsap.utils
          .toArray<HTMLElement>(".float-in")
          .filter((el) => !isOwned(el))
          .forEach((el) => {
            const i = readIndex(el);
            gsap.fromTo(
              el,
              { opacity: 0, y: 56 + i * 14 },
              {
                opacity: 1,
                y: 0,
                ease: "power2.out",
                scrollTrigger: {
                  trigger: el,
                  start: "top 96%",
                  end: "top 58%",
                  scrub: 0.6,
                },
              }
            );
          });

        // Statement word-fills: dull → ink, bracketed words → accent.
        // Literal colors on purpose: GSAP's interpolator can't parse
        // color-mix()/var() (tokens: --ink #0a0a0a, --accent #2b5cff).
        gsap.utils.toArray<HTMLElement>('[data-fx="statement"]').forEach((h) => {
          const words = h.querySelectorAll<HTMLElement>('[data-fx="word"]');
          if (!words.length) return;
          gsap.fromTo(
            words,
            { color: "rgba(10, 10, 10, 0.22)" },
            {
              color: (idx, el) =>
                (el as HTMLElement).dataset.accent ? "#2b5cff" : "#0a0a0a",
              ease: "none",
              stagger: 0.05,
              scrollTrigger: { trigger: h, start: "top 82%", end: "top 32%", scrub: 0.4 },
            }
          );
        });

        // Hero exit — copy rises away, the ledger sinks and recedes, so
        // the opening visibly hands the page over as you scroll.
        const hero = document.querySelector<HTMLElement>('[data-fx="hero"]');
        if (hero) {
          const exit = gsap.timeline({
            scrollTrigger: {
              trigger: hero,
              start: "top top",
              end: "bottom 38%",
              scrub: 0.5,
            },
          });
          const copy = hero.querySelector<HTMLElement>('[data-fx="herocopy"]');
          const panel = hero.querySelector<HTMLElement>('[data-fx="ledger"]');
          if (copy) exit.to(copy, { y: -72, opacity: 0.28, ease: "none" }, 0);
          if (panel) exit.to(panel, { y: 48, scale: 0.965, opacity: 0.3, ease: "none" }, 0);
        }

        // Client strip drifts laterally as it passes — quiet texture.
        gsap.utils.toArray<HTMLElement>('[data-fx="marks"]').forEach((el) => {
          gsap.fromTo(
            el,
            { x: 36 },
            {
              x: -24,
              ease: "none",
              scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.8 },
            }
          );
        });

        // CTA band headline scales up into place.
        gsap.utils.toArray<HTMLElement>('[data-fx="bandhead"]').forEach((el) => {
          gsap.fromTo(
            el,
            { scale: 0.92, y: 44, opacity: 0 },
            {
              scale: 1,
              y: 0,
              opacity: 1,
              ease: "power2.out",
              scrollTrigger: { trigger: el, start: "top 92%", end: "top 45%", scrub: 0.5 },
            }
          );
        });
      });

      // ── Desktop set pieces: Proof pin + FLOW pin ────────────
      mm.add(`${MOTION} and (min-width: 810px)`, () => {
        // Proof (the dark band): pins briefly while the statement lands
        // and the three cells arrive one by one — a held beat.
        const proofSec = document.querySelector<HTMLElement>('[data-fx="proof"]');
        if (proofSec) {
          const head = proofSec.querySelectorAll<HTMLElement>(".float-in:not([data-fx='proofcell'])");
          const cells = proofSec.querySelectorAll<HTMLElement>('[data-fx="proofcell"]');
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: proofSec,
              start: "top top",
              end: "+=1000",
              pin: true,
              scrub: 0.6,
              anticipatePin: 1,
            },
          });
          if (head.length) {
            tl.fromTo(
              head,
              { y: 44, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.5, stagger: 0.15, ease: "power2.out" },
              0
            );
          }
          cells.forEach((cell, i) => {
            tl.fromTo(
              cell,
              { y: 70, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" },
              0.55 + i * 0.45
            );
          });
          tl.to({}, { duration: 0.4 });
        }

        // FLOW: the section locks and the four steps play through under
        // the scrollbar — settle, bar draws, number counts.
        const section = document.querySelector<HTMLElement>('[data-fx="process"]');
        if (section) {
          const cols = section.querySelectorAll<HTMLElement>('[data-fx="flowcol"]');
          if (cols.length) {
            const tl = gsap.timeline({
              scrollTrigger: {
                trigger: section,
                start: "top top",
                end: "+=1600",
                pin: true,
                scrub: 0.6,
                anticipatePin: 1,
              },
            });
            cols.forEach((col, i) => {
              const at = i * 0.9;
              tl.fromTo(
                col,
                { y: 90, opacity: 0.12 },
                { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" },
                at
              );
              const bar = col.querySelector<HTMLElement>('[data-fx="bar"]');
              if (bar) {
                tl.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "none" }, at + 0.35);
              }
              const pct = col.querySelector<HTMLElement>('[data-fx="pct"]');
              if (pct) {
                const target = parseFloat(pct.dataset.pct || "0");
                const state = { v: 0 };
                tl.to(
                  state,
                  {
                    v: target,
                    duration: 0.5,
                    ease: "none",
                    onUpdate: () => {
                      pct.textContent = `${Math.round(state.v)}%`;
                    },
                  },
                  at + 0.35
                );
              }
            });
            tl.to({}, { duration: 0.5 });
          }
        }
      });

      // ── Mobile: unpinned scrubbed equivalents ───────────────
      mm.add(`${MOTION} and (max-width: 809px)`, () => {
        // Proof children scrub in like everything else (no pin).
        gsap.utils
          .toArray<HTMLElement>('[data-fx="proof"] .float-in')
          .forEach((el, i) => {
            gsap.fromTo(
              el,
              { y: 52 + i * 8, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                ease: "power2.out",
                scrollTrigger: { trigger: el, start: "top 96%", end: "top 60%", scrub: 0.6 },
              }
            );
          });

        gsap.utils.toArray<HTMLElement>('[data-fx="flowcol"]').forEach((col) => {
          gsap.fromTo(
            col,
            { y: 44, opacity: 0.15 },
            {
              y: 0,
              opacity: 1,
              ease: "none",
              scrollTrigger: { trigger: col, start: "top 92%", end: "top 55%", scrub: 0.5 },
            }
          );
        });
        gsap.utils.toArray<HTMLElement>('[data-fx="bar"]').forEach((bar) => {
          gsap.fromTo(
            bar,
            { scaleX: 0 },
            {
              scaleX: 1,
              ease: "none",
              scrollTrigger: { trigger: bar, start: "top 95%", end: "top 60%", scrub: 0.4 },
            }
          );
        });
        gsap.utils.toArray<HTMLElement>('[data-fx="pct"]').forEach((el) => {
          const target = parseFloat(el.dataset.pct || "0");
          const state = { v: 0 };
          gsap.to(state, {
            v: target,
            duration: 1.1,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
            onUpdate: () => {
              el.textContent = `${Math.round(state.v)}%`;
            },
          });
        });
      });

      // ── Magnetic buttons (desktop pointers only) ────────────
      mm.add(`${MOTION} and (pointer: fine)`, () => {
        const cleanups: Array<() => void> = [];
        gsap.utils.toArray<HTMLElement>(".btn").forEach((btn) => {
          const xTo = gsap.quickTo(btn, "x", { duration: 0.35, ease: "power3.out" });
          const yTo = gsap.quickTo(btn, "y", { duration: 0.35, ease: "power3.out" });

          const onMove = (e: PointerEvent) => {
            const r = btn.getBoundingClientRect();
            xTo(gsap.utils.clamp(-6, 6, (e.clientX - (r.left + r.width / 2)) * 0.14));
            yTo(gsap.utils.clamp(-5, 5, (e.clientY - (r.top + r.height / 2)) * 0.22));
          };
          const onLeave = () => {
            xTo(0);
            yTo(0);
          };

          btn.addEventListener("pointermove", onMove);
          btn.addEventListener("pointerleave", onLeave);
          cleanups.push(() => {
            btn.removeEventListener("pointermove", onMove);
            btn.removeEventListener("pointerleave", onLeave);
          });
        });
        return () => cleanups.forEach((fn) => fn());
      });

      // useGSAP reverts everything it created; the window listeners are ours.
      return () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
      };
    },
    { scope: ref }
  );

  // Scope anchor only — renders nothing visible. Selectors above reach
  // the whole document via gsap.utils.toArray on purpose.
  return <div ref={ref} aria-hidden="true" />;
}
