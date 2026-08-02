"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { media } from "@/content/site";

/**
 * Runs before the browser paints on the client, and does nothing on the server.
 *
 * This matters here: when the sequence has already been seen this session it
 * must be taken down BEFORE the first paint, otherwise the visitor sees a
 * flash of cake on every page they return to.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * THE OPENING SEQUENCE
 * ────────────────────────────────────────────────────────────────────────────
 * A cake is presented, an elegant knife descends and cuts cleanly down through
 * its centre, and the screen then opens along that cut like a pair of theatre
 * curtains to reveal the Home page underneath.
 *
 * The split is genuine: the photograph is rendered twice, each copy clipped to
 * one half of the screen and offset so the two halves reconstruct a single
 * seamless image. When they travel apart, the cut the knife made becomes the
 * seam the page opens along.
 *
 * If a cake-cut VIDEO is supplied in `src/content/site.ts` it plays instead of
 * the drawn knife, and the curtains open at `media.intro.splitAtSeconds`.
 * Everything else — the split, the skip control, the reduced-motion path —
 * behaves identically either way.
 */

/** Marks the intro as seen so it plays once per browsing session, not per page. */
const SESSION_KEY = "elshadai-intro-seen";

type Phase = "establishing" | "cutting" | "splitting" | "done";

/** Timings in milliseconds, measured from the moment the sequence begins. */
const TIMELINE = {
  establishing: 900, //  the cake alone, with a slow push-in
  cutting: 2100, //      the knife descends and the cut traces down
  settle: 350, //        a beat once the cut is complete
  splitting: 1300, //    the curtains open
} as const;

const CUT_STARTS_AT = TIMELINE.establishing;
const SPLIT_STARTS_AT =
  TIMELINE.establishing + TIMELINE.cutting + TIMELINE.settle;
const SEQUENCE_ENDS_AT = SPLIT_STARTS_AT + TIMELINE.splitting;

export function IntroSequence() {
  /**
   * Starts true so the overlay is present in the server-rendered HTML. That is
   * what stops the Home page being glimpsed before the sequence takes over —
   * there is no moment where the page is on screen without it.
   */
  const [active, setActive] = useState(true);
  const [phase, setPhase] = useState<Phase>("establishing");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);

  const hasVideo = Boolean(media.intro.video);

  /** Ends the sequence and hands the page back to the visitor. */
  const finish = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];

    setPhase("done");
    setActive(false);

    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Private browsing can refuse sessionStorage. The intro simply plays
      // again next time, which is harmless.
    }

    document.body.style.removeProperty("overflow");
  }, []);

  /** Skip Intro — jumps straight to the curtain opening rather than cutting hard. */
  const skip = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase("splitting");
    timers.current.push(setTimeout(finish, TIMELINE.splitting));
  }, [finish]);

  useIsomorphicLayoutEffect(() => {
    // Decide whether to play at all. This runs before the browser paints, so a
    // visitor returning to the Home page later in the same session never sees
    // the overlay at all — it is gone before anything is drawn.
    let alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      alreadySeen = false;
    }

    if (alreadySeen) {
      setActive(false);
      return;
    }

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    setReducedMotion(prefersReduced);
    document.body.style.overflow = "hidden";

    const schedule = (fn: () => void, delay: number) => {
      timers.current.push(setTimeout(fn, delay));
    };

    if (prefersReduced) {
      // No knife, no push-in. A brief hold on the cake, then an unhurried
      // split reveal — the same idea, without the movement.
      setPhase("establishing");
      schedule(() => setPhase("splitting"), 650);
      schedule(finish, 650 + 900);
    } else if (hasVideo) {
      // The video drives the cut; the curtains open at the configured moment.
      setPhase("cutting");
      schedule(() => setPhase("splitting"), media.intro.splitAtSeconds * 1000);
      schedule(finish, media.intro.splitAtSeconds * 1000 + TIMELINE.splitting);
      // Safety net: if the video never plays, do not strand the visitor.
      schedule(finish, media.intro.durationSeconds * 1000 + 2500);
    } else {
      schedule(() => setPhase("cutting"), CUT_STARTS_AT);
      schedule(() => setPhase("splitting"), SPLIT_STARTS_AT);
      schedule(finish, SEQUENCE_ENDS_AT);
    }

    const capturedTimers = timers.current;
    return () => {
      capturedTimers.forEach(clearTimeout);
      document.body.style.removeProperty("overflow");
    };
  }, [finish, hasVideo]);

  // Escape skips, and focus starts on the skip control so keyboard users are
  // never trapped watching an animation they cannot dismiss.
  useEffect(() => {
    if (!active) return;

    skipRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
        if (event.key !== "Escape") return; // let the button handle its own keys
        event.preventDefault();
        skip();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, skip]);

  if (!active) return null;

  const splitting = phase === "splitting";
  const cutting = phase === "cutting" || splitting;

  /** Shared styling for the two halves of the screen. */
  const panelBase: React.CSSProperties = {
    position: "absolute",
    top: 0,
    height: "100%",
    width: "50%",
    overflow: "hidden",
    backgroundColor: "var(--color-ivory)",
    transition: splitting
      ? `transform ${TIMELINE.splitting}ms var(--ease-curtain)`
      : "none",
    willChange: "transform",
  };

  /**
   * The inner wrapper is a full viewport wide inside a half-width panel, and is
   * pulled left on the right-hand panel. The two clipped copies therefore line
   * up into one continuous image.
   */
  const innerBase: React.CSSProperties = {
    position: "absolute",
    top: 0,
    height: "100%",
    width: "200%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const cakeVisual = (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3vh 4vw",
      }}
    >
      {hasVideo ? (
        <video
          ref={videoRef}
          src={media.intro.video}
          poster={media.intro.poster}
          autoPlay
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          onError={finish}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            transform: cutting ? "scale(1.03)" : "scale(1)",
            transition: "transform 3s var(--ease-silk)",
          }}
        />
      ) : posterFailed ? (
        // The photograph could not load. Rather than a blank screen, the
        // wordmark carries the opening on its own.
        <div className="flex h-full w-full items-center justify-center">
          <span className="display text-espresso whitespace-nowrap">
            Elshadai
          </span>
        </div>
      ) : (
        <picture>
          <source srcSet={media.intro.poster} type="image/webp" />
          <img
            src={media.intro.posterFallback}
            alt=""
            aria-hidden="true"
            onError={() => setPosterFailed(true)}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              // A very slow push-in, so the cake feels alive before it is cut.
              transform: reducedMotion
                ? "none"
                : cutting
                  ? "scale(1.04)"
                  : "scale(1)",
              transition: "transform 3.4s var(--ease-silk)",
              filter: "drop-shadow(0 30px 60px rgb(42 29 23 / 0.18))",
            }}
          />
        </picture>
      )}
    </div>
  );

  return (
    <div
      id="intro-overlay"
      role="dialog"
      aria-label="Opening sequence"
      aria-modal="true"
      className="on-dark fixed inset-0 z-[100]"
      style={{
        // Once the halves have travelled apart the overlay stops intercepting
        // clicks, so the page beneath is usable the moment it is revealed.
        pointerEvents: splitting ? "none" : "auto",
      }}
    >
      {/* ── Left half ───────────────────────────────────────────────────── */}
      <div
        style={{
          ...panelBase,
          left: 0,
          transform: splitting ? "translateX(-100%)" : "translateX(0)",
        }}
      >
        <div style={{ ...innerBase, left: 0 }}>{cakeVisual}</div>
      </div>

      {/* ── Right half ──────────────────────────────────────────────────── */}
      <div
        style={{
          ...panelBase,
          left: "50%",
          transform: splitting ? "translateX(100%)" : "translateX(0)",
        }}
      >
        <div style={{ ...innerBase, left: "-100%" }}>{cakeVisual}</div>
      </div>

      {/* ── The cut ─────────────────────────────────────────────────────── */}
      {!reducedMotion && !hasVideo && (
        <>
          {/* A hairline of light tracing down the centre, following the blade. */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              width: "2px",
              marginLeft: "-1px",
              height: cutting ? "100%" : "0%",
              transition: `height ${TIMELINE.cutting}ms cubic-bezier(0.45, 0, 0.55, 1)`,
              background:
                "linear-gradient(to bottom, transparent, rgb(251 247 241 / 0.95) 12%, rgb(255 255 255 / 0.85) 88%, transparent)",
              boxShadow: "0 0 18px rgb(255 255 255 / 0.75)",
              opacity: splitting ? 0 : 1,
            }}
          />

          {/* The knife. */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              marginLeft: "-30px",
              width: "60px",
              height: "62vh",
              transform: cutting
                ? "translateY(78vh)"
                : "translateY(-70vh)",
              transition: `transform ${TIMELINE.cutting}ms cubic-bezier(0.45, 0, 0.55, 1)`,
              opacity: splitting ? 0 : 1,
              willChange: "transform",
            }}
          >
            <CakeKnife />
          </div>
        </>
      )}

      {/* ── Skip ────────────────────────────────────────────────────────── */}
      <button
        ref={skipRef}
        type="button"
        onClick={skip}
        className="absolute bottom-8 right-6 z-10 border border-espresso/25 bg-ivory/85 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-espresso backdrop-blur-sm transition-colors hover:bg-espresso hover:text-ivory sm:bottom-10 sm:right-10"
        style={{
          opacity: splitting ? 0 : 1,
          transition: "opacity 300ms ease, background-color 200ms ease, color 200ms ease",
          pointerEvents: splitting ? "none" : "auto",
        }}
      >
        Skip intro
      </button>

      {/* Tells screen readers what is happening without describing decoration. */}
      <p className="sr-only" role="status">
        Opening sequence playing. Select Skip intro, or press Escape, to go
        straight to the website.
      </p>
    </div>
  );
}

/** A long, elegant cake knife drawn to match the restrained palette. */
function CakeKnife() {
  return (
    <svg
      viewBox="0 0 60 620"
      width="60"
      height="100%"
      preserveAspectRatio="xMidYMax meet"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="knife-blade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8d949b" />
          <stop offset="28%" stopColor="#eef1f4" />
          <stop offset="52%" stopColor="#c3cad1" />
          <stop offset="74%" stopColor="#f6f8fa" />
          <stop offset="100%" stopColor="#7d848b" />
        </linearGradient>
        <linearGradient id="knife-handle" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2a1d17" />
          <stop offset="35%" stopColor="#5d453a" />
          <stop offset="70%" stopColor="#3a2921" />
          <stop offset="100%" stopColor="#241812" />
        </linearGradient>
      </defs>

      {/* Handle */}
      <rect x="21" y="0" width="18" height="196" rx="9" fill="url(#knife-handle)" />
      {/* Bolster */}
      <rect x="18" y="192" width="24" height="15" rx="3" fill="#9aa1a8" />
      {/* Blade, tapering to a point */}
      <path
        d="M22 207 H38 L35 566 Q30 604 25 566 Z"
        fill="url(#knife-blade)"
      />
      {/* A highlight along the spine to give the steel some life */}
      <path
        d="M28.5 212 L30.5 560"
        stroke="#ffffff"
        strokeOpacity="0.75"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
