/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ELSHADAI CAKE CREATIONS — CENTRAL CONTENT FILE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * This is the ONLY file you need to edit to change the words, contact details,
 * cake listings and media on the website. Nothing here requires coding
 * knowledge — replace the text between the quote marks.
 *
 * Anything written like [THIS] is a placeholder waiting for real information.
 * Search this file for "[" to find everything still to be filled in.
 *
 * IMPORTANT: The business name must always read exactly:
 *     Elshadai Cake Creations
 *
 * IMPORTANT: This business sells CAKES ONLY. Do not add cupcakes, cookies,
 * brownies, pastries, dessert tables or any other sweet product to this file.
 */

/* ═══════════════════════════════════════════════════════════════════════════
   1. BUSINESS IDENTITY
   ═══════════════════════════════════════════════════════════════════════════ */

export const business = {
  /** The exact business name. Do not abbreviate or re-spell. */
  name: "Elshadai Cake Creations",

  /** Shown in the hero, under the business name. Replace when confirmed. */
  brandStatement: "[BRAND STATEMENT TO BE PROVIDED LATER]",

  /** One-line description used in the footer and search results. */
  shortDescription:
    "Personalised and classic cakes created for meaningful occasions.",

  /** Longer description used on the Home page and in structured data. */
  longDescription: "[BUSINESS DESCRIPTION]",

  /** Town or city the business operates from. */
  location: "[BUSINESS LOCATION]",

  /** The area cakes can be delivered to or collected from. */
  serviceArea: "[SERVICE AREA]",

  /** Public website address once the domain is live. Used for SEO links. */
  url: "https://www.elshadaicakecreations.co.uk",
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   2. CONTACT DETAILS
   ═══════════════════════════════════════════════════════════════════════════

   Leave a value as its [PLACEHOLDER] and that contact method is hidden from
   the website automatically — no broken links will ever appear.

   Phone and WhatsApp numbers:
     - `display` is what visitors read, e.g. "07123 456 789"
     - `dial`    is what the phone actually calls, in international format
                 with no spaces, e.g. "+447123456789"
   ═══════════════════════════════════════════════════════════════════════════ */

export const contact = {
  /** The person customers will be speaking to. */
  person: "[CONTACT PERSON]",

  phone: {
    display: "[PHONE NUMBER]",
    dial: "[PHONE NUMBER]",
  },

  email: "[EMAIL ADDRESS]",

  whatsapp: {
    display: "[WHATSAPP NUMBER]",
    /** International format, digits only, no "+" — e.g. "447123456789" */
    dial: "[WHATSAPP NUMBER]",
  },

  /** When customers can expect a reply, e.g. "Monday to Saturday, 9am – 6pm". */
  responseHours: "[RESPONSE HOURS]",

  /** How and where cakes may be collected. */
  collection: "[COLLECTION INFORMATION]",

  /** Whether delivery is offered, and on what terms. */
  delivery: "[DELIVERY INFORMATION]",

  /** How much notice is needed before a celebration date. */
  noticePeriod: "[NOTICE PERIOD]",

  social: {
    instagram: "[INSTAGRAM URL]",
    facebook: "[FACEBOOK URL]",
    tiktok: "[TIKTOK URL]",
  },
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   3. MEDIA — INTRO AND HERO VIDEO
   ═══════════════════════════════════════════════════════════════════════════

   Put your files in the `public/media/` folder and reference them here.

   The cinematic opening sequence:
     introVideo        the cake being cut (desktop / landscape)
     introVideoMobile  an upright crop of the same sequence, for phones
     introPoster       a still image shown while the video loads

   If `introVideo` is left empty (""), the website automatically plays a
   coded cake-cut and curtain-opening animation instead. Nothing breaks.
   ═══════════════════════════════════════════════════════════════════════════ */

export const media = {
  intro: {
    video: "",
    videoMobile: "",

    /**
     * The cake the opening sequence is built around.
     * Currently your silver-drip Christmas cake with the piped tree.
     */
    poster: "/media/intro-cake.webp",
    posterFallback: "/media/intro-cake.jpg",
    posterAlt:
      "A tall white buttercream cake with a silver chocolate drip, a piped buttercream Christmas tree set with silver pearls, and a silver glitter Merry Christmas topper",

    /** Seconds into the video at which the curtains begin to open. */
    splitAtSeconds: 3.6,
    /** Total length of the sequence in seconds. */
    durationSeconds: 6,
  },

  hero: {
    video: "",
    videoMobile: "",
    poster: "",
    /** Describes the video for screen readers and search engines. */
    alt: "[CAKE DESCRIPTION]",
  },
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   4. HOME PAGE — BUSINESS INTRODUCTION
   ═══════════════════════════════════════════════════════════════════════════ */

export const introduction = {
  eyebrow: "About the cakes",
  heading: "Cakes made for the people they are made for",
  body: "Every occasion deserves a cake created with care. Elshadai Cake Creations combines thoughtful design, careful detail and a personal approach to create classic and personalised cakes for meaningful celebrations.",
  /** Optional second paragraph. Leave as "" to hide it. */
  bodySecondary: "[BUSINESS DESCRIPTION]",

  /** Two supporting photographs. Leave `src` empty to show a labelled frame. */
  primaryImage: {
    src: "",
    alt: "[CAKE DESCRIPTION]",
    caption: "[CAKE NAME]",
  },
  detailImage: {
    src: "",
    alt: "[CAKE DESCRIPTION]",
    caption: "[CAKE DESCRIPTION]",
  },
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   5. HOME PAGE — FEATURED CAKE CAROUSEL
   ═══════════════════════════════════════════════════════════════════════════

   EXACTLY THREE items. The website shows three indicator dots to match.
   Do not add a fourth item and do not remove one.
   ═══════════════════════════════════════════════════════════════════════════ */

export const featuredCakes = [
  {
    id: "personalised",
    name: "Personalised Cakes",
    category: "Designed around you",
    description:
      "Designed around a chosen person, age, theme, colour scheme, interest or celebration.",
    occasion: "For any celebration",
    flavour: "[FLAVOUR INFORMATION]",
    image: { src: "", alt: "[CAKE DESCRIPTION]" },
    /** Opens the Gallery filtered to this category. Leave "" to hide the link. */
    galleryFilter: "personalised",
  },
  {
    id: "classic",
    name: "Classic Cakes",
    category: "Timeless and refined",
    description:
      "Timeless and elegant cake designs with refined decoration and traditional presentation.",
    occasion: "For understated celebrations",
    flavour: "[FLAVOUR INFORMATION]",
    image: { src: "", alt: "[CAKE DESCRIPTION]" },
    galleryFilter: "classic",
  },
  {
    id: "occasion",
    name: "Occasion Cakes",
    category: "Created for the day",
    description:
      "Cakes created for weddings, birthdays, christenings, anniversaries, graduations and other events.",
    occasion: "For milestone moments",
    flavour: "[FLAVOUR INFORMATION]",
    image: { src: "", alt: "[CAKE DESCRIPTION]" },
    galleryFilter: "all",
  },
] as const;

/* ═══════════════════════════════════════════════════════════════════════════
   6. HOME PAGE — PERSONALISED VS CLASSIC
   ═══════════════════════════════════════════════════════════════════════════ */

export const cakeTypes = {
  eyebrow: "Two directions",
  heading: "Personalised and classic",
  standfirst:
    "Both are created for the same reason — a day that matters. They simply take a different route to get there.",

  personalised: {
    title: "Personalised Cakes",
    body: "A personalised cake is built around the celebration itself. The design begins with the person, the moment and the details that make it theirs.",
    points: [
      "A person, and what they love",
      "The occasion being marked",
      "A chosen theme or story",
      "Favourite colours",
      "Interests and hobbies",
      "An age, a name or a message",
      "Decoration matched to the event styling",
    ],
    image: { src: "", alt: "[CAKE DESCRIPTION]" },
  },

  classic: {
    title: "Classic Cakes",
    body: "A classic cake lets craftsmanship speak quietly. The focus moves to finish, proportion and the kind of decoration that never dates.",
    points: [
      "Timeless presentation",
      "Elegant, considered finishes",
      "Traditional decoration",
      "Floral styling",
      "Minimalist design",
      "Refined, restrained colour",
      "Simple detail, carefully executed",
    ],
    image: { src: "", alt: "[CAKE DESCRIPTION]" },
  },

  closing:
    "Personalised or classic, a cake can be created for any of the occasions below.",
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   7. CAKE OCCASIONS
   ═══════════════════════════════════════════════════════════════════════════

   Set `available: false` for any occasion not yet offered or not yet
   photographed. Only occasions marked `true` appear on the website.
   ═══════════════════════════════════════════════════════════════════════════ */

export const occasions = [
  { id: "birthday", label: "Birthday cakes", available: true },
  { id: "wedding", label: "Wedding cakes", available: true },
  { id: "christening", label: "Christening cakes", available: true },
  { id: "baptism", label: "Baptism cakes", available: true },
  { id: "anniversary", label: "Anniversary cakes", available: true },
  { id: "engagement", label: "Engagement cakes", available: true },
  { id: "baby-shower", label: "Baby shower cakes", available: true },
  { id: "gender-reveal", label: "Gender reveal cakes", available: false },
  { id: "graduation", label: "Graduation cakes", available: true },
  { id: "retirement", label: "Retirement cakes", available: false },
  { id: "religious", label: "Religious celebration cakes", available: true },
  { id: "family", label: "Family celebration cakes", available: true },
  { id: "corporate", label: "Corporate celebration cakes", available: false },
  { id: "seasonal", label: "Seasonal celebration cakes", available: false },
] as const;

/* ═══════════════════════════════════════════════════════════════════════════
   8. HOME PAGE — WHAT MAKES AN ELSHADAI CAKE SPECIAL
   ═══════════════════════════════════════════════════════════════════════════ */

export const benefits = {
  eyebrow: "The difference",
  heading: "What makes an Elshadai cake special?",
  items: [
    {
      title: "Personalised Designs",
      body: "Cakes can reflect the celebration, chosen style, colours, theme and personality of the occasion.",
    },
    {
      title: "Classic Options",
      body: "Customers may also choose timeless, refined cakes that focus on traditional or elegant presentation.",
    },
    {
      title: "Attention to Detail",
      body: "Decorations, textures, finishes and presentation are carefully considered.",
    },
    {
      title: "Created for the Occasion",
      body: "Each cake is created to complement the event and the person or people being celebrated.",
    },
    {
      title: "Carefully Presented",
      body: "Every cake is designed to feel polished and visually memorable.",
    },
    {
      title: "Reliable Communication",
      body: "Customers can contact the business directly using the listed contact channels.",
    },
  ],
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   9. HOME PAGE — CLOSING SECTION
   ═══════════════════════════════════════════════════════════════════════════ */

export const closing = {
  heading: "Cakes created for memorable occasions",
  body: "Discover personalised and classic cakes shaped by care, creativity and attention to detail.",
  backgroundImage: { src: "", alt: "" },
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   10. GALLERY PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export const gallery = {
  heading: "Our Cake Creations",
  standfirst:
    "Explore a collection of personalised and classic cakes created for meaningful occasions.",
  heroImage: { src: "", alt: "" },
  emptyMessage:
    "Cakes for this occasion will be added here soon. Please look at the other categories in the meantime.",
} as const;

/**
 * GALLERY CAKES
 *
 * Add one entry per cake photograph.
 *
 *   src       image file in `public/cakes/`, e.g. "/cakes/rose-christening.jpg"
 *   alt       a plain description for visitors who cannot see the image
 *   name      the cake's title, shown in the lightbox
 *   style     "personalised" or "classic"
 *   occasion  must match an `id` from the occasions list above
 *   size      "tall" | "wide" | "regular" — controls the layout shape
 *
 * The category filters build themselves from these entries. An occasion with
 * no cakes never appears as a filter, so no empty category can be reached.
 *
 * The list below is intentionally EMPTY. Add your real cakes here.
 */
export const galleryCakes: GalleryCake[] = [
  // Example of the shape to copy — delete this comment block once you add real cakes:
  //
  // {
  //   id: "amelia-first-birthday",
  //   src: "/cakes/amelia-first-birthday.jpg",
  //   alt: "A two-tier pale pink cake with hand-piped detail and a single candle",
  //   name: "Amelia's First Birthday",
  //   style: "personalised",
  //   occasion: "birthday",
  //   description: "Soft pink buttercream with hand-piped shell detail.",
  //   flavour: "Vanilla sponge with raspberry",
  //   size: "tall",
  // },
];

export type GalleryCake = {
  id: string;
  src: string;
  alt: string;
  name: string;
  style: "personalised" | "classic";
  occasion: string;
  description?: string;
  flavour?: string;
  size?: "tall" | "wide" | "regular";
};

/* ═══════════════════════════════════════════════════════════════════════════
   11. REVIEW FORM OPTIONS
   ═══════════════════════════════════════════════════════════════════════════

   Cake types offered in the "Leave a Review" form.
   Every option must be a CAKE. Never add desserts or other sweet products.
   ═══════════════════════════════════════════════════════════════════════════ */

export const cakeTypeOptions = [
  "Birthday cake",
  "Wedding cake",
  "Christening cake",
  "Anniversary cake",
  "Engagement cake",
  "Baby shower cake",
  "Graduation cake",
  "Celebration cake",
  "Other cake",
] as const;

export const cakeStyleOptions = ["Personalised", "Classic", "Not sure"] as const;

export const reviewConsentText =
  "I agree that my name, rating, cake type and review may be displayed publicly on the Elshadai Cake Creations website. My email address will remain private.";

/* ═══════════════════════════════════════════════════════════════════════════
   12. DEMONSTRATION CONTENT
   ═══════════════════════════════════════════════════════════════════════════

   While `showSampleReviews` is true, the review section displays clearly
   labelled example reviews so the layout can be seen before real customers
   have written any. They are never saved to the database, never counted in
   the public average, and never included in search-engine review data.

   SET THIS TO false BEFORE LAUNCH.
   ═══════════════════════════════════════════════════════════════════════════ */

export const showSampleReviews = true;

export const sampleReviews = [
  {
    id: "sample-1",
    customer_name: "Sample review",
    cake_type: "Christening cake",
    cake_style: "Classic",
    occasion: "Christening",
    rating: 5,
    review_text:
      "This is an example review showing how a customer's words will appear. Replace it by turning off sample content in the content file once real reviews arrive.",
    created_at: "2026-01-01T00:00:00.000Z",
    owner_response: null,
  },
  {
    id: "sample-2",
    customer_name: "Sample review",
    cake_type: "Birthday cake",
    cake_style: "Personalised",
    occasion: "21st birthday",
    rating: 5,
    review_text:
      "A second example review, included only to show the layout with more than one card. It is not a real customer and is never counted in the public rating.",
    created_at: "2026-01-02T00:00:00.000Z",
    owner_response: "This is an example of how a reply from the owner appears.",
  },
] as const;

/* ═══════════════════════════════════════════════════════════════════════════
   13. NAVIGATION
   ═══════════════════════════════════════════════════════════════════════════ */

export const navigation = [
  { label: "Home", href: "/" },
  { label: "Gallery", href: "/gallery" },
] as const;

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS — no need to edit below this line
   ═══════════════════════════════════════════════════════════════════════════ */

/** True when a value is still an unfilled [PLACEHOLDER]. */
export function isPlaceholder(value: string | undefined | null): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  return trimmed === "" || (trimmed.startsWith("[") && trimmed.endsWith("]"));
}

/** Returns the value only if it has been filled in, otherwise undefined. */
export function resolved(value: string | undefined | null): string | undefined {
  return isPlaceholder(value) ? undefined : (value as string).trim();
}

/** Occasions currently offered, in the order listed above. */
export const availableOccasions = occasions.filter((o) => o.available);

/** Looks up an occasion's readable label from its id. */
export function occasionLabel(id: string): string {
  return occasions.find((o) => o.id === id)?.label ?? id;
}
