"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { business, navigation } from "@/content/site";
import { useSiteUI } from "./SiteChrome";
import { Wordmark } from "@/components/ui/Wordmark";

/**
 * The site header.
 *
 * Sits transparently over the hero to begin with, then settles onto a softly
 * blurred ivory background once the visitor scrolls. Contact is a dialog rather
 * than a page, so it is a button here rather than a link.
 */
export function Header() {
  const pathname = usePathname();
  const { openContact } = useSiteUI();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // The header only overlays the hero on the Home page; elsewhere it is solid
  // from the outset so the links are always legible.
  const overlaysHero = pathname === "/";
  const solid = scrolled || !overlaysHero || menuOpen;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu whenever the visitor navigates. Adjusting during
  // render rather than in an effect means the menu is already closed on the
  // first render of the new page, instead of flashing open and then shutting.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  // While the mobile menu is open: lock the page, trap Tab, and close on Escape.
  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
        return;
      }

      if (event.key !== "Tab") return;

      const panel = menuRef.current;
      if (!panel) return;

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    menuRef.current?.querySelector<HTMLElement>("a[href]")?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const linkColour = solid ? "text-cocoa" : "text-ivory";

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        solid
          ? "border-b border-caramel/30 bg-ivory/88 backdrop-blur-md shadow-[0_1px_24px_rgb(42_29_23/0.06)]"
          : "border-b border-transparent bg-transparent",
        solid ? "" : "on-dark",
      ].join(" ")}
    >
      <div className="mx-auto flex h-[68px] max-w-[88rem] items-center justify-between px-5 sm:h-[76px] sm:px-8 lg:px-12">
        {/* ── Wordmark ─────────────────────────────────────────────────── */}
        <Link
          href="/"
          className="group flex items-center gap-3"
          aria-label={`${business.name} — home`}
        >
          <Wordmark
            className={`transition-colors duration-500 ${
              solid ? "text-espresso" : "text-ivory"
            }`}
          />
        </Link>

        {/* ── Desktop navigation ───────────────────────────────────────── */}
        <nav
          aria-label="Main"
          className="hidden items-center gap-9 md:flex"
        >
          {navigation.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative py-1 text-[0.8125rem] uppercase tracking-[0.18em] transition-colors duration-300 ${linkColour} ${
                  active ? "" : "opacity-75 hover:opacity-100"
                }`}
              >
                {item.label}
                {/* A fine icing line marks the page you are on. */}
                <span
                  aria-hidden="true"
                  className={`absolute -bottom-0.5 left-0 h-px w-full origin-left transition-transform duration-400 ${
                    solid ? "bg-plum" : "bg-ivory"
                  } ${active ? "scale-x-100" : "scale-x-0"}`}
                />
              </Link>
            );
          })}

          <button
            type="button"
            onClick={openContact}
            className={`border px-5 py-2 text-[0.8125rem] uppercase tracking-[0.18em] transition-all duration-300 ${
              solid
                ? "border-espresso/30 text-espresso hover:bg-espresso hover:text-ivory"
                : "border-ivory/50 text-ivory hover:bg-ivory hover:text-espresso"
            }`}
          >
            Contact
          </button>
        </nav>

        {/* ── Mobile toggle ────────────────────────────────────────────── */}
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          className={`-mr-2 p-2 md:hidden ${linkColour}`}
        >
          <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          <svg
            width="26"
            height="26"
            viewBox="0 0 26 26"
            fill="none"
            aria-hidden="true"
          >
            <path
              d={menuOpen ? "M6 6 L20 20" : "M4 8 H22"}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="transition-all duration-300"
            />
            <path
              d={menuOpen ? "M20 6 L6 20" : "M4 18 H22"}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="transition-all duration-300"
            />
            {!menuOpen && (
              <path
                d="M4 13 H16"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </div>

      {/* ── Mobile menu ──────────────────────────────────────────────────── */}
      <div
        id="mobile-menu"
        ref={menuRef}
        hidden={!menuOpen}
        className="border-t border-caramel/30 bg-ivory md:hidden"
      >
        <nav aria-label="Main" className="px-5 py-4">
          {navigation.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between border-b border-caramel/25 py-4 text-lg text-espresso"
              >
                <span className="font-serif">{item.label}</span>
                {active && (
                  <span className="text-[0.625rem] uppercase tracking-[0.2em] text-plum">
                    Viewing
                  </span>
                )}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              openContact();
            }}
            className="mt-5 w-full bg-espresso px-6 py-4 text-sm uppercase tracking-[0.18em] text-ivory"
          >
            Contact
          </button>
        </nav>
      </div>
    </header>
  );
}
