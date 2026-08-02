"use client";

import Link from "next/link";
import { business, contact, navigation, resolved } from "@/content/site";
import { useSiteUI } from "./SiteChrome";
import { Wordmark } from "@/components/ui/Wordmark";

export function Footer() {
  const { openContact, openReview } = useSiteUI();
  const year = new Date().getFullYear();

  const phoneDisplay = resolved(contact.phone.display);
  const phoneDial = resolved(contact.phone.dial);
  const email = resolved(contact.email);
  const location = resolved(business.location);

  const socials = [
    { label: "Instagram", url: resolved(contact.social.instagram) },
    { label: "Facebook", url: resolved(contact.social.facebook) },
    { label: "TikTok", url: resolved(contact.social.tiktok) },
  ].filter((item): item is { label: string; url: string } => Boolean(item.url));

  return (
    <footer className="relative z-[1] border-t border-caramel/30 bg-vanilla">
      {/* A piped shell border along the top edge. */}
      <div className="piping-edge -mt-[10px] bg-ivory" aria-hidden="true" />

      <div className="mx-auto max-w-[88rem] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr] lg:gap-16">
          {/* ── Identity ───────────────────────────────────────────────── */}
          <div>
            <Wordmark className="text-espresso" />
            <p className="measure-tight mt-6 text-sm leading-relaxed text-cocoa-soft">
              {business.shortDescription}
            </p>
          </div>

          {/* ── Navigation ─────────────────────────────────────────────── */}
          <nav aria-label="Footer">
            <h2 className="text-[0.6875rem] uppercase tracking-[0.2em] text-plum">
              Explore
            </h2>
            <ul className="mt-5 space-y-3 text-sm">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-cocoa transition-colors hover:text-espresso"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={openContact}
                  className="text-cocoa transition-colors hover:text-espresso"
                >
                  Contact
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={openReview}
                  className="text-cocoa transition-colors hover:text-espresso"
                >
                  Leave a Review
                </button>
              </li>
            </ul>
          </nav>

          {/* ── Details ────────────────────────────────────────────────── */}
          <div>
            <h2 className="text-[0.6875rem] uppercase tracking-[0.2em] text-plum">
              Details
            </h2>
            <ul className="mt-5 space-y-3 text-sm">
              {phoneDial ? (
                <li>
                  <a
                    href={`tel:${phoneDial.replace(/\s+/g, "")}`}
                    className="text-cocoa transition-colors hover:text-espresso"
                  >
                    {phoneDisplay ?? phoneDial}
                  </a>
                </li>
              ) : (
                <li className="text-cocoa-soft">{contact.phone.display}</li>
              )}

              {email ? (
                <li>
                  <a
                    href={`mailto:${email}`}
                    className="break-all text-cocoa transition-colors hover:text-espresso"
                  >
                    {email}
                  </a>
                </li>
              ) : (
                <li className="text-cocoa-soft">{contact.email}</li>
              )}

              <li className="text-cocoa-soft">{location ?? business.location}</li>
            </ul>

            {socials.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                {socials.map((social) => (
                  <li key={social.label}>
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cocoa underline decoration-caramel underline-offset-4 transition-colors hover:text-espresso"
                    >
                      {social.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <hr className="icing-rule my-12" />

        {/* ── Legal ────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5 text-xs text-cocoa-soft sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {business.name}. All rights reserved.
          </p>

          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>
              <Link
                href="/privacy"
                className="transition-colors hover:text-espresso"
              >
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link
                href="/cookies"
                className="transition-colors hover:text-espresso"
              >
                Cookie Policy
              </Link>
            </li>
            <li>
              <Link
                href="/website-information"
                className="transition-colors hover:text-espresso"
              >
                Website Information
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
