import { Hero } from "@/components/home/Hero";
import { Introduction } from "@/components/home/Introduction";
import { FeaturedCarousel } from "@/components/home/FeaturedCarousel";
import { EditorialShowcase } from "@/components/home/EditorialShowcase";
import { TwoDirections } from "@/components/home/TwoDirections";
import { Occasions } from "@/components/home/Occasions";
import { Benefits } from "@/components/home/Benefits";
import { ReviewsSection } from "@/components/reviews/ReviewsSection";
import { ClosingSection } from "@/components/home/ClosingSection";
import { RevealScope } from "@/components/motion/RevealScope";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { pickBrandStatement } from "@/lib/brand-statement";

/**
 * Reviews are read on each request, so a new one appears without a rebuild.
 * The hero's rotating statement rides on the same per-request rendering.
 */
export const dynamic = "force-dynamic";

/**
 * The Home page.
 *
 * Ordered as one continuous story rather than a stack of separate blocks: the
 * hero gives way to the introduction, the three featured cakes lead into the
 * showcase, the two cake directions are told at length, then occasions,
 * reasons, what customers said, and a closing invitation.
 */
export default function HomePage() {
  return (
    <RevealScope>
      <ScrollProgress />

      {/* Chosen here, on the server, so it is correct in the first byte of
          HTML rather than swapped in after the page has appeared. */}
      <Hero statement={pickBrandStatement()} />
      <Introduction />
      <FeaturedCarousel />
      <EditorialShowcase />
      <TwoDirections />
      <Occasions />
      <Benefits />
      <ReviewsSection />
      <ClosingSection />
    </RevealScope>
  );
}
