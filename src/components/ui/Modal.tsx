"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * A dialog that behaves properly.
 *
 * Every overlay on this website — Contact, the review form, the gallery
 * lightbox — is built on this one component, so the keyboard and screen reader
 * behaviour is written once and is consistent everywhere:
 *
 *   • focus moves into the dialog on open and returns exactly where it was
 *   • Tab and Shift+Tab are trapped inside it
 *   • Escape closes it
 *   • the page behind cannot be scrolled
 *   • the backdrop is inert to screen readers
 *
 * It mounts through a portal so it is never trapped inside a transformed or
 * clipped ancestor.
 */

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/** Tracks how many dialogs are open, so nested ones do not unlock too early. */
let openCount = 0;

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the dialog. */
  label: string;
  children: React.ReactNode;
  /** Width utility for the panel. */
  panelClassName?: string;
  /** Alignment of the panel within the viewport. */
  align?: "center" | "stretch";
};

export function Modal({
  open,
  onClose,
  label,
  children,
  panelClassName = "max-w-2xl",
  align = "center",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const titleId = useId();

  // Escape, and the focus trap.
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;

    returnFocusRef.current = document.activeElement as HTMLElement | null;

    openCount += 1;
    document.documentElement.classList.add("dialog-open");

    /*
     * Reveal the panel one frame after the portal commits, so the opening
     * transition has a starting state to move away from.
     *
     * A timer runs the same reveal as a fallback. Everything the dialog is —
     * visible, and holding focus — hangs off this one call, so if the frame
     * never arrives the dialog is open but invisible and unfocusable, with the
     * page behind it locked. An animation frame is not guaranteed: browsers
     * withhold it from pages that are not being painted. A dialog is not
     * something to gamble on a frame.
     */
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;

      setVisible(true);

      const panel = panelRef.current;
      if (!panel) return;
      const first = panel.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel).focus({ preventScroll: true });
    };

    const raf = requestAnimationFrame(reveal);
    const fallback = setTimeout(reveal, 80);

    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fallback);
      document.removeEventListener("keydown", onKeyDown);

      openCount = Math.max(0, openCount - 1);
      if (openCount === 0) {
        document.documentElement.classList.remove("dialog-open");
      }

      setVisible(false);
      // Returning focus is what stops a keyboard user being dumped at the top
      // of the page every time they close something.
      returnFocusRef.current?.focus({ preventScroll: true });
    };
  }, [open, onKeyDown]);

  // A dialog is only ever opened by a client interaction, so there is nothing
  // to render on the server and no mounted flag to track.
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120]"
      // The backdrop is presentational; the dialog below carries the semantics.
      role="presentation"
    >
      <div
        className="modal-backdrop"
        data-open={visible}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        // Explicitly above the backdrop, so the ordering is stated rather than
        // left to depend on which element happens to come later in the markup.
        className={`fixed inset-0 z-10 flex justify-center overflow-y-auto p-4 sm:p-6 ${
          align === "center" ? "items-center" : "items-stretch"
        }`}
        onClick={(event) => {
          // Only a click on the padding itself closes; clicks inside the panel
          // must not bubble out and dismiss it.
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          aria-labelledby={titleId}
          tabIndex={-1}
          data-open={visible}
          className={`modal-panel w-full ${panelClassName}`}
        >
          <span id={titleId} className="sr-only">
            {label}
          </span>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
