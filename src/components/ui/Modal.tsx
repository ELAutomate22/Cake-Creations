"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * The accessible dialog used for the contact details, the review form and the
 * gallery lightbox.
 *
 * Handles the things that are easy to forget and obvious when missing:
 * focus moves into the dialog on open and returns to whatever opened it on
 * close, Tab cycles within the dialog rather than escaping to the page behind,
 * Escape closes, and the page underneath cannot scroll while it is open.
 */

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

type ModalProps = {
  open: boolean;
  onClose: () => void;
  /** Accessible name. Rendered visibly unless `hideTitle` is set. */
  title: string;
  hideTitle?: boolean;
  description?: string;
  children: React.ReactNode;
  /** "panel" is the standard centred card; "full" is used by the lightbox. */
  variant?: "panel" | "full";
  /** Additional classes for the dialog surface itself. */
  className?: string;
};

export function Modal({
  open,
  onClose,
  title,
  hideTitle = false,
  description,
  children,
  variant = "panel",
  className = "",
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  const close = useCallback(() => onClose(), [onClose]);

  // Remember what had focus, move focus in, and give it back on close.
  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Focus the first useful control, falling back to the dialog itself.
    const dialog = dialogRef.current;
    const first = dialog?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? dialog)?.focus();

    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  // Stop the page behind from scrolling, without the layout shifting sideways
  // as the scrollbar disappears.
  useEffect(() => {
    if (!open) return;

    const { body } = document;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;

    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [open]);

  // Escape closes; Tab is kept inside the dialog.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
        return;
      }

      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, close]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const isFull = variant === "full";

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center"
      // The backdrop is presentational; the dialog below carries the semantics.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={
          isFull
            ? "absolute inset-0 bg-espresso/95 backdrop-blur-sm"
            : "absolute inset-0 bg-espresso/55 backdrop-blur-[3px]"
        }
        style={{ animation: "fade-in 220ms ease both" }}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={[
          "relative outline-none",
          isFull
            ? "flex h-full w-full flex-col"
            : "max-h-[92vh] w-[min(34rem,calc(100vw-2rem))] overflow-y-auto subtle-scroll border border-caramel/40 bg-ivory shadow-[0_40px_90px_-20px_rgb(42_29_23/0.45)]",
          className,
        ].join(" ")}
        style={{
          animation: isFull
            ? "fade-in 220ms ease both"
            : "rise 320ms var(--ease-silk) both",
        }}
      >
        <h2 id={titleId} className={hideTitle ? "sr-only" : "sr-only"}>
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className="sr-only">
            {description}
          </p>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
