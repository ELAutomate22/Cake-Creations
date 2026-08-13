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

/** Reviews are read on each request, so a new one appears without a rebuild. */
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

      <Hero />
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
