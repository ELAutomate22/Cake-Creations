"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useScrolledPast } from "@/hooks/useScrolledPast";
import { business, navigation } from "@/content/site";
import { useSiteUI } from "./SiteChrome";

/**
 * The site header.
 *
 * It begins transparent so the Home hero reads full-bleed behind it, then
 * settles into a blurred, bordered state once the visitor scrolls past the
 * first stretch of the page. On every other route it starts solid, because
 * there is no hero for it to sit over.
 *
 * The mobile menu is a full-height panel with a proper focus trap — the same
 * keyboard contract as the dialogs.
 */

const FOCUSABLE = "a[href], button:not([disabled])";

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { openContact, openReview } = useSiteUI();

  // Read straight from the browser rather than mirrored into state, so the
  // header is already correct on a reload halfway down the page.
  const scrolled = useScrolledPast(64);
  // The path the menu was opened on is stored alongside it, so navigating
  // closes it by derivation rather than by an effect chasing the route.
  const [menu, setMenu] = useState({ open: false, path: pathname });
  const menuOpen = menu.open && menu.path === pathname;

  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(
    () => setMenu((current) => ({ ...current, open: false })),
    [],
  );

  // Escape, focus trap, and scroll lock while the panel is open.
  useEffect(() => {
    if (!menuOpen) return;

    document.documentElement.classList.add("dialog-open");

    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key !== "Tab" || !panel) return;

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    // Captured now: by the time the cleanup runs the ref may point elsewhere,
    // and focus needs to return to the button that opened the panel.
    const toggle = toggleRef.current;

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.documentElement.classList.remove("dialog-open");
      toggle?.focus({ preventScroll: true });
    };
  }, [menuOpen, closeMenu]);

  const solid = scrolled || !isHome || menuOpen;

  return (
    <>
      <header
        // Only colour is transitioned. backdrop-filter was in this list, which
        // meant the blur was recomputed across the full header width on every
        // frame of a 500ms transition, each time the scroll threshold was
        // crossed — one of the most expensive things a browser can animate.
        className={`fixed inset-x-0 top-0 z-[100] transition-[background-color,border-color] duration-500 ${
          solid
            ? "border-b border-espresso/10 bg-ivory/85 backdrop-blur-md"
            : "on-dark border-b border-transparent"
        }`}
      >
        <div className="shell flex h-[4.5rem] items-center justify-between gap-6 lg:h-20">
          {/* ── Wordmark ─────────────────────────────────────────────────── */}
          <Link
            href="/"
            className="group flex min-w-0 items-center gap-2.5 sm:gap-3"
            aria-label={`${business.name} — home`}
          >
            {/*
            The monogram only. The name is set in type beside it, so the full
            lockup would print the business name twice over.

            Gold reads against both header states, so it needs no colour
            treatment — unlike the text, which switches with `solid`.
          */}
            <Image
              src="/brand/monogram.png"
              alt=""
              aria-hidden="true"
              width={258}
              height={256}
              priority
              className="h-7 w-auto shrink-0 sm:h-8 lg:h-9"
            />

            {/* The two words keep their own baseline against each other, while
              the monogram is centred against the pair. */}
            <span className="flex min-w-0 items-baseline gap-2">
              <span
                className={`truncate font-serif text-lg leading-none tracking-tight transition-colors sm:text-xl lg:text-[1.375rem] ${
                  solid ? "text-espresso" : "text-ivory"
                }`}
              >
                Elshadai
              </span>
              <span
                className={`hidden truncate text-[0.625rem] uppercase tracking-[0.24em] transition-colors sm:inline ${
                  solid ? "text-cocoa-soft" : "text-ivory/70"
                }`}
              >
                Cake Creations
              </span>
            </span>
          </Link>

          {/* ── Desktop navigation ───────────────────────────────────────── */}
          <nav aria-label="Main" className="hidden items-center gap-9 md:flex">
            {navigation.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative py-1 text-[0.8125rem] uppercase tracking-[0.18em] transition-colors ${
                    solid
                      ? active
                        ? "text-espresso"
                        : "text-cocoa-soft hover:text-espresso"
                      : active
                        ? "text-ivory"
                        : "text-ivory/75 hover:text-ivory"
                  }`}
                >
                  {item.label}
                  {/* The active page keeps a hairline beneath it. */}
                  <span
                    aria-hidden="true"
                    className={`absolute -bottom-0.5 left-0 h-px w-full origin-left bg-current transition-transform duration-500 ${
                      active ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </Link>
              );
            })}

            {/*
            Reviews opens the dialog rather than scrolling to the section on
            the Home page. The header is on every page, and a link that only
            works on one of them is a link that looks broken on the others.
          */}
            <button
              type="button"
              onClick={openReview}
              className={`py-1 text-[0.8125rem] uppercase tracking-[0.18em] transition-colors ${
                solid
                  ? "text-cocoa-soft hover:text-espresso"
                  : "text-ivory/75 hover:text-ivory"
              }`}
            >
              Reviews
            </button>

            <button
              type="button"
              onClick={openContact}
              className={`border px-6 py-2.5 text-[0.8125rem] uppercase tracking-[0.18em] transition-colors ${
                solid
                  ? "border-espresso/30 text-espresso hover:bg-espresso hover:text-ivory"
                  : "border-ivory/45 text-ivory hover:bg-ivory hover:text-espresso"
              }`}
            >
              Contact
            </button>
          </nav>

          {/* ── Mobile toggle ────────────────────────────────────────────── */}
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setMenu({ open: !menuOpen, path: pathname })}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className={`-mr-2 flex h-11 w-11 items-center justify-center md:hidden ${
              solid ? "text-espresso" : "text-ivory"
            }`}
          >
            <span className="sr-only">
              {menuOpen ? "Close menu" : "Open menu"}
            </span>
            <span aria-hidden="true" className="relative block h-3 w-6">
              <span
                className={`absolute left-0 block h-px w-full bg-current transition-all duration-400 ${
                  menuOpen ? "top-1.5 rotate-45" : "top-0"
                }`}
              />
              <span
                className={`absolute left-0 block h-px bg-current transition-all duration-400 ${
                  menuOpen ? "top-1.5 w-full -rotate-45" : "top-3 w-2/3"
                }`}
              />
            </span>
          </button>
        </div>
      </header>

      {/*
        ── Mobile panel ─────────────────────────────────────────────────
        A sibling of the header rather than a child of it, and that is
        load-bearing. The header carries `backdrop-blur`, and an element with a
        backdrop-filter becomes the containing block for any fixed-position
        descendant. Inside it, this panel's `bottom-0` resolved against the
        72px-tall header instead of the viewport, so the panel was 375x0 — the
        links spilled out of a box with no height, drawing straight over the
        page with nothing behind them.

        Slightly translucent over a heavy blur rather than flat ivory, so the
        page reads as softened behind the menu instead of simply gone.
      */}
      <div
        id="mobile-menu"
        ref={panelRef}
        hidden={!menuOpen}
        className="fixed inset-x-0 top-[4.5rem] bottom-0 z-[110] bg-ivory/95 backdrop-blur-2xl md:hidden"
      >
        <nav
          aria-label="Main"
          className="shell flex h-full flex-col justify-between py-12"
        >
          <ul className="space-y-2">
            {navigation.map((item, index) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={closeMenu}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className="display block py-3 text-espresso"
                  style={
                    menuOpen
                      ? {
                          animation: `rise 520ms var(--ease-silk) ${
                            80 + index * 70
                          }ms both`,
                        }
                      : undefined
                  }
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  openReview();
                }}
                className="display block py-3 text-left text-espresso"
                style={
                  menuOpen
                    ? {
                        animation: `rise 520ms var(--ease-silk) ${
                          80 + navigation.length * 70
                        }ms both`,
                      }
                    : undefined
                }
              >
                Reviews
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  openContact();
                }}
                className="display block py-3 text-left text-espresso"
                style={
                  menuOpen
                    ? {
                        animation: `rise 520ms var(--ease-silk) ${
                          80 + (navigation.length + 1) * 70
                        }ms both`,
                      }
                    : undefined
                }
              >
                Contact
              </button>
            </li>
          </ul>

          <p
            className="text-[0.625rem] uppercase tracking-[0.24em] text-cocoa-soft"
            style={
              menuOpen
                ? { animation: "fade-in 600ms var(--ease-silk) 380ms both" }
                : undefined
            }
          >
            {business.name}
          </p>
        </nav>
      </div>
    </>
  );
}
