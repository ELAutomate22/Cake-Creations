import { IntroSequence } from "@/components/intro/IntroSequence";
import { Hero } from "@/components/home/Hero";
import { Introduction } from "@/components/home/Introduction";
import { FeaturedCarousel } from "@/components/home/FeaturedCarousel";
import { CakeTypes } from "@/components/home/CakeTypes";
import { Benefits } from "@/components/home/Benefits";
import { ReviewsSection } from "@/components/reviews/ReviewsSection";
import { ClosingSection } from "@/components/home/ClosingSection";

/** Reviews are read on each request so a new one appears without a rebuild. */
export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
      {/*
        The opening sequence belongs to the Home page — it plays before the
        website "opens". Rendering it here rather than in the shared layout
        means the Gallery and the policy pages never carry the overlay markup.
      */}
      <IntroSequence />

      <Hero />
      <Introduction />
      <FeaturedCarousel />
      <CakeTypes />
      <Benefits />
      <ReviewsSection />
      <ClosingSection />
    </>
  );
}
