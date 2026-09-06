"use client";

import f from "./botface.module.css";

/**
 * Jessica's face.
 *
 * Drawn in SVG rather than rendered in three.js, deliberately. This sits on
 * every page of the site, and a WebGL canvas plus a model file is several
 * hundred kilobytes and a live render loop for something the size of a coin —
 * on the mid-range Android most Indian visitors are using, that is a real cost
 * paid on every page load for decoration.
 *
 * The depth is faked, and faked well: layered gradients for the glossy dome,
 * an inset screen with its own reflection, a ground shadow that shrinks as she
 * floats up, and a slight tilt on hover. Everything moves with transform and
 * opacity only, so it stays on the compositor and never triggers layout.
 *
 * The expression is deliberately minimal — two eyes and a mouth on a dark
 * screen. A face with fewer features reads as friendlier and, more usefully,
 * does not fall into the uncanny valley the way a detailed one does.
 */
export default function BotFace({ waving = false }: { waving?: boolean }) {
  return (
    <span className={f.stage} data-waving={waving || undefined} aria-hidden="true">
      <svg className={f.bot} viewBox="0 0 120 108" fill="none">
        <defs>
          {/* The dome: lit from the top left, falling to a cool shadow. */}
          <radialGradient id="jShell" cx="34%" cy="24%" r="82%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="52%" stopColor="#f4f5f8" />
            <stop offset="100%" stopColor="#d3d7e0" />
          </radialGradient>

          {/* The screen is not flat black — it catches the same light. */}
          <linearGradient id="jScreen" x1="18%" y1="0%" x2="82%" y2="100%">
            <stop offset="0%" stopColor="#33384a" />
            <stop offset="45%" stopColor="#191c26" />
            <stop offset="100%" stopColor="#0d0f15" />
          </linearGradient>

          <linearGradient id="jPod" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#ccd1dc" />
          </linearGradient>

          {/* Rim light along the bottom edge — the cue that reads as roundness. */}
          <linearGradient id="jRim" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.75" />
          </linearGradient>
        </defs>

        {/* Ground shadow. Tied to the float, so she reads as leaving the surface. */}
        <ellipse className={f.shadow} cx="60" cy="99" rx="27" ry="5" fill="#0b1020" />

        {/* Antennae, behind the head so they read as attached to the back. */}
        <path
          className={f.earLeft}
          d="M38 21c-3-7-2-13 1-14s7 4 9 11z"
          fill="url(#jShell)"
        />
        <path
          className={f.earRight}
          d="M82 21c3-7 2-13-1-14s-7 4-9 11z"
          fill="url(#jShell)"
        />

        {/* The two floating pods. They bob out of phase with the head. */}
        <ellipse className={f.podLeft} cx="16" cy="62" rx="7" ry="12" fill="url(#jPod)" />
        <ellipse className={f.podRight} cx="104" cy="62" rx="7" ry="12" fill="url(#jPod)" />

        <g className={f.head}>
          {/* The squircle body. */}
          <path
            d="M60 14c22 0 33 4 38 12 4 7 4 34 0 42-5 9-16 13-38 13s-33-4-38-13c-4-8-4-35 0-42 5-8 16-12 38-12z"
            fill="url(#jShell)"
          />
          <path
            d="M60 14c22 0 33 4 38 12 4 7 4 34 0 42-5 9-16 13-38 13s-33-4-38-13c-4-8-4-35 0-42 5-8 16-12 38-12z"
            fill="url(#jRim)"
            opacity="0.5"
          />

          {/* Inset screen. */}
          <rect x="30" y="27" width="60" height="45" rx="15" fill="url(#jScreen)" />

          {/* Two specular highlights — the cheapest possible glass. */}
          <ellipse cx="45" cy="37" rx="9" ry="6" fill="#ffffff" opacity="0.1" />
          <ellipse cx="76" cy="63" rx="12" ry="5" fill="#ffffff" opacity="0.05" />

          {/* The face. Squashes on the blink. */}
          <g className={f.face}>
            <rect className={f.eye} x="43" y="42" width="9" height="9" rx="2.6" fill="#fff" />
            <rect className={f.eye} x="68" y="42" width="9" height="9" rx="2.6" fill="#fff" />
            <path
              className={f.mouth}
              d="M53 58c2 3.4 5 5 7 5s5-1.6 7-5z"
              fill="#fff"
            />
          </g>
        </g>
      </svg>
    </span>
  );
}
