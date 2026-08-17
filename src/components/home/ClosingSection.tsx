"use client";

import Link from "next/link";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { closing, media } from "@/content/site";
import { CakeImage } from "@/components/ui/CakeImage";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { useSiteUI } from "@/components/layout/SiteChrome";

/**
 * The final visual chapter before the footer.
 *
 * A large photograph rises slowly behind the closing words: the heading reveals
 * upward from behind a mask, the supporting line fades in after it, and the
 * three actions arrive last. Nothing here offers to take an order — the site
 * ends on browse, review, or get in touch.
 */
export function ClosingSection() {
  const { openContact, openReview } = useSiteUI();
  const rootRef = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      gsap.fromTo(
        mediaRef.current,
        { yPercent: -8, scale: 1.1 },
        {
          yPercent: 8,
          scale: 1.16,
          ease: "none",
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        },
      );

      gsap
        .timeline({
          scrollTrigger: { trigger: rootRef.current, start: "top 65%", once: true },
        })
        .from("[data-closing-heading]", {
          yPercent: 110,
          duration: 1.15,
          ease: "power3.out",
        })
        .from(
          "[data-closing-body]",
          { opacity: 0, y: 20, duration: 0.9, ease: "power3.out" },
          0.35,
        )
        .from(
          "[data-closing-action]",
          {
            opacity: 0,
            y: 18,
            duration: 0.75,
            ease: "power3.out",
            stagger: 0.1,
          },
          0.6,
        );
    },
    { scope: rootRef },
  );

  return (
    <section
      ref={rootRef}
      className="on-dark relative flex min-h-[86svh] items-center overflow-hidden bg-espresso"
    >
      <div ref={mediaRef} className="absolute inset-0 will-change-transform">
        <CakeImage
          src={media.closing.image}
          alt={media.closing.alt}
          label="Closing cake photograph"
          className="h-full w-full"
          sizes="100vw"
          // A full-screen backdrop behind the closing words, already darkened
          // and drifting on scroll. Hovering it is just crossing the page.
          hover={false}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-espresso/70"
        />
      </div>

      <div className="shell relative z-[1] py-28 text-center">
        <h2 className="display-lg mx-auto max-w-4xl text-ivory">
          <span className="block overflow-hidden">
            <span data-closing-heading className="block">
              {closing.heading}
            </span>
          </span>
        </h2>

        <p
          data-closing-body
          className="voice mx-auto mt-7 max-w-2xl text-ivory/80"
        >
          {closing.body}
        </p>

        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <Link href="/gallery" data-closing-action className="btn btn-solid">
            View Gallery
          </Link>
          <button
            type="button"
            onClick={openReview}
            data-closing-action
            className="btn btn-outline"
          >
            Leave a Review
          </button>
          <button
            type="button"
            onClick={openContact}
            data-closing-action
            className="btn btn-outline"
          >
            Contact Us
          </button>
        </div>
      </div>
    </section>
  );
}
