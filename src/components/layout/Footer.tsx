"use client";

import Link from "next/link";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import {
  business,
  contact,
  isProvided,
  navigation,
  resolved,
  telHref,
} from "@/content/site";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { useSiteUI } from "./SiteChrome";

/**
 * The footer.
 *
 * An oversized "Elshadai" sits behind the content and drifts upward as the
 * footer comes into view — the last quiet flourish of the page rather than a
 * piece of animation in its own right.
 *
 * Contact rows only appear once real details exist in the content file, so the
 * footer never shows a customer a placeholder in the shape of a phone number.
 */
export function Footer() {
  // `details` are the live contact values from the admin; `contact` in the
  // content file still supplies what the admin does not manage.
  const { openContact, openReview, contact: details } = useSiteUI();
  const hasEmail = isProvided(details.email);
  const rootRef = useRef<HTMLElement>(null);
  const wordmarkRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion() || !wordmarkRef.current) return;

      gsap.fromTo(
        wordmarkRef.current,
        { yPercent: 14 },
        {
          yPercent: -6,
          ease: "none",
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top bottom",
            end: "bottom bottom",
            scrub: true,
          },
        },
      );
    },
    { scope: rootRef },
  );

  const year = new Date().getFullYear();

  return (
    <footer
      ref={rootRef}
      className="on-dark relative overflow-hidden bg-espresso pt-24 pb-10"
    >
      {/* The oversized wordmark, sitting behind everything. */}
      <span
        ref={wordmarkRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 select-none text-center font-serif leading-none text-ivory/[0.05]"
        style={{ fontSize: "clamp(5rem, 21vw, 20rem)" }}
      >
        Elshadai
      </span>

      <div className="shell relative">
        <div className="grid gap-14 lg:grid-cols-[1.4fr_1fr_1fr]">
          {/* ── Identity ───────────────────────────────────────────────── */}
          <div>
            <p className="font-serif text-2xl leading-none">{business.name}</p>
            <p className="voice measure mt-5 text-ivory/70">
              {business.shortDescription}
            </p>
          </div>

          {/* ── Navigation ─────────────────────────────────────────────── */}
          <nav aria-label="Footer">
            <h2 className="eyebrow text-ivory/50">Explore</h2>
            {/*
              The padding is the tap target.

              A line of small text is about 17px tall, and a finger needs at
              least 24px square to hit it reliably — WCAG 2.2 asks for that as
              a minimum. The rows are padded and the spacing between them
              reduced to compensate, so the target grows without the footer
              stretching.
            */}
            <ul className="mt-5 space-y-0.5">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-block py-1.5 text-sm text-ivory/80 transition-colors hover:text-ivory"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={openContact}
                  className="inline-block py-1.5 text-sm text-ivory/80 transition-colors hover:text-ivory"
                >
                  Contact
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={openReview}
                  className="inline-block py-1.5 text-sm text-ivory/80 transition-colors hover:text-ivory"
                >
                  Leave a Review
                </button>
              </li>
            </ul>
          </nav>

          {/* ── Details ────────────────────────────────────────────────── */}
          <div>
            <h2 className="eyebrow text-ivory/50">Get in touch</h2>
            <ul className="mt-5 space-y-0.5 text-sm text-ivory/80">
              {details.phones.map((entry) => (
                <li key={entry.number}>
                  <a
                    href={telHref(entry.number)}
                    className="inline-block py-1.5 transition-colors hover:text-ivory"
                  >
                    {entry.number}
                  </a>
                  {isProvided(entry.label) && (
                    <span className="ml-2 text-ivory/50">{entry.label}</span>
                  )}
                </li>
              ))}
              {hasEmail && (
                <li>
                  <a
                    href={`mailto:${details.email}`}
                    className="inline-block break-all py-1.5 transition-colors hover:text-ivory"
                  >
                    {details.email}
                  </a>
                </li>
              )}
              {isProvided(contact.location) && <li>{contact.location}</li>}

              {/* Nothing real to show yet — say so rather than invent it. */}
              {details.phones.length === 0 &&
                !hasEmail &&
                !isProvided(contact.location) && (
                  <li className="text-ivory/45">
                    Contact details to be provided.
                  </li>
                )}
            </ul>

            {(resolved.hasInstagram ||
              resolved.hasFacebook ||
              resolved.hasTiktok) && (
              <ul className="mt-6 flex gap-5 text-sm text-ivory/80">
                {resolved.hasInstagram && (
                  <li>
                    <a
                      href={contact.social.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:text-ivory"
                    >
                      Instagram
                    </a>
                  </li>
                )}
                {resolved.hasFacebook && (
                  <li>
                    <a
                      href={contact.social.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:text-ivory"
                    >
                      Facebook
                    </a>
                  </li>
                )}
                {resolved.hasTiktok && (
                  <li>
                    <a
                      href={contact.social.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:text-ivory"
                    >
                      TikTok
                    </a>
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>

        <div className="rule mt-16 opacity-40" />

        <div className="mt-8 flex flex-col gap-4 text-xs text-ivory/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {business.name}. All rights reserved.
          </p>
          <ul className="flex flex-wrap gap-x-6">
            <li>
              <Link href="/terms" className="inline-block py-1.5 transition-colors hover:text-ivory/80">
                Terms &amp; Conditions
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="inline-block py-1.5 transition-colors hover:text-ivory/80">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/order-policy" className="inline-block py-1.5 transition-colors hover:text-ivory/80">
                Order &amp; Cancellation Policy
              </Link>
            </li>
            <li>
              <Link href="/cookies" className="inline-block py-1.5 transition-colors hover:text-ivory/80">
                Cookie Policy
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
