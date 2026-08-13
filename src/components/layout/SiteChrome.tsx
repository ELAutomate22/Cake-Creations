"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { ContactModal } from "@/components/contact/ContactModal";
import { ReviewFormModal } from "@/components/reviews/ReviewFormModal";
import { ScrollTrigger } from "@/lib/motion";

/**
 * Site-wide furniture: header, footer, and the two dialogs that can be opened
 * from more than one place.
 *
 * Contact and Leave a Review are reachable from the header, the footer and the
 * closing section, so their open state lives here rather than being duplicated
 * into every section that needs a button.
 */

type SiteUI = {
  openContact: () => void;
  openReview: () => void;
  /** Bumped whenever a review is published, so lists know to refresh. */
  reviewsVersion: number;
};

const SiteUIContext = createContext<SiteUI | null>(null);

export function useSiteUI(): SiteUI {
  const context = useContext(SiteUIContext);
  if (!context) {
    throw new Error("useSiteUI must be used inside SiteChrome");
  }
  return context;
}

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const [contactOpen, setContactOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewsVersion, setReviewsVersion] = useState(0);

  const openContact = useCallback(() => setContactOpen(true), []);
  const openReview = useCallback(() => setReviewOpen(true), []);

  const onReviewPublished = useCallback(() => {
    setReviewsVersion((version) => version + 1);
  }, []);

  // Late-loading photographs change the page height, which would otherwise
  // leave every scroll trigger measuring against a stale layout.
  useEffect(() => {
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  const value = useMemo(
    () => ({ openContact, openReview, reviewsVersion }),
    [openContact, openReview, reviewsVersion],
  );

  return (
    <SiteUIContext.Provider value={value}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <Header />

      <main id="main" className="relative z-[1]">
        {children}
      </main>

      <Footer />

      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
      <ReviewFormModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onPublished={onReviewPublished}
      />
    </SiteUIContext.Provider>
  );
}
