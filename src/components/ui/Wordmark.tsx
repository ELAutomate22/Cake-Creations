import { business } from "@/content/site";

/**
 * The typographic wordmark.
 *
 * No logo file has been supplied yet, so the name is set in the display serif
 * with a fine piped rule beneath it. When a logo arrives, replace the contents
 * of this component with an <Image> — every place the wordmark appears will
 * update at once.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex flex-col leading-none ${className}`}>
      <span className="font-serif text-[1.375rem] tracking-[0.01em] sm:text-[1.5rem]">
        Elshadai
      </span>

      <span className="mt-[3px] flex items-center gap-1.5" aria-hidden="true">
        <span className="h-px flex-1 bg-current opacity-40" />
        <span className="text-[0.5rem] uppercase tracking-[0.28em] opacity-80">
          Cake Creations
        </span>
        <span className="h-px flex-1 bg-current opacity-40" />
      </span>

      {/* The full name for screen readers and search engines. */}
      <span className="sr-only">{business.name}</span>
    </span>
  );
}
