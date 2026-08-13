/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ELSHADAI CAKE CREATIONS — WEBSITE CONTENT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Every piece of wording, contact detail and cake listing on the website comes
 * from this one file. Nothing here requires coding knowledge — replace the text
 * between the quote marks.
 *
 * Anything written like [THIS] is a placeholder waiting for real information.
 * Search this file for "[" to find everything still to be filled in. The
 * website is built to show placeholders honestly rather than invent details.
 *
 * IMPORTANT: The business name must always read exactly:
 *     Elshadai Cake Creations
 *
 * IMPORTANT: This business sells CAKES ONLY. Do not add cupcakes, cookies,
 * brownies, pastries, dessert tables or any other product to this file.
 *
 * IMPORTANT: This website does not take orders. There is deliberately no
 * ordering, booking, quoting or enquiry form anywhere in it. Customers get in
 * touch using the contact details below.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/* ═══════════════════════════════════════════════════════════════════════════
   1. BUSINESS IDENTITY
   ═══════════════════════════════════════════════════════════════════════════ */

export const business = {
  /** The exact business name. Do not abbreviate or re-spell. */
  name: "Elshadai Cake Creations",

  /** Shown in the hero, beneath the business name. */
  brandStatement: "[BRAND STATEMENT TO BE PROVIDED LATER]",

  /** One line, used in the footer and in search results. */
  shortDescription:
    "Personalised and classic cakes created for meaningful occasions.",

  /** Longer description, used on the Home page and in structured data. */
  longDescription: "[BUSINESS DESCRIPTION]",

  /** Town or city the business works from. */
  location: "[BUSINESS LOCATION]",

  /** The area cakes can be delivered to or collected from. */
  serviceArea: "[SERVICE AREA]",

  /** Public web address once the domain is live. Used for SEO links. */
  url: "https://www.elshadaicakecreations.co.uk",
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   2. CONTACT DETAILS
   ═══════════════════════════════════════════════════════════════════════════
   Shown in the Contact dialog and the footer.

   Leave any value as its [PLACEHOLDER] and the website simply will not show
   that row. Nothing breaks, and nothing is invented.
   ═══════════════════════════════════════════════════════════════════════════ */

export const contact = {
  person: "[CONTACT PERSON]",
  phone: "[PHONE NUMBER]",
  email: "[EMAIL ADDRESS]",
  whatsapp: "[WHATSAPP NUMBER]",
  location: "[BUSINESS LOCATION]",
  collection: "[COLLECTION INFORMATION]",
  delivery: "[DELIVERY INFORMATION]",
  serviceArea: "[SERVICE AREA]",
  responseHours: "[RESPONSE HOURS]",

  social: {
    instagram: "[INSTAGRAM URL]",
    facebook: "[FACEBOOK URL]",
    tiktok: "[TIKTOK URL]",
  },
} as const;

/**
 * True when a content value has been filled in with something real.
 *
 * The website uses this everywhere so a placeholder is never presented to a
 * customer as though it were a phone number.
 */
export function isProvided(value: string | undefined | null): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  return !(trimmed.startsWith("[") && trimmed.endsWith("]"));
}

/** Contact details that have actually been supplied. */
export const resolved = {
  hasPhone: isProvided(contact.phone),
  hasEmail: isProvided(contact.email),
  hasWhatsapp: isProvided(contact.whatsapp),
  hasInstagram: isProvided(contact.social.instagram),
  hasFacebook: isProvided(contact.social.facebook),
  hasTiktok: isProvided(contact.social.tiktok),
} as const;

/** Strips spaces and punctuation so a number can be used in a tel: link. */
export function telHref(value: string): string {
  return `tel:${value.replace(/[^\d+]/g, "")}`;
}

/** Builds a wa.me link from a WhatsApp number. */
export function whatsappHref(value: string): string {
  return `https://wa.me/${value.replace(/[^\d]/g, "")}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. MEDIA
   ═══════════════════════════════════════════════════════════════════════════
   Put photographs in `assets-source/` and run:  npm run assets

   Files named hero-* go to public/media/. Everything else goes to
   public/cakes/. The pipeline writes several sizes plus a blurred placeholder.

   Leave a `src` empty ("") and the website shows a labelled frame in its place
   rather than a broken image.
   ═══════════════════════════════════════════════════════════════════════════ */

export const media = {
  hero: {
    /** An optional short cake video for the hero. Leave "" to use the photo. */
    video: "",
    /** The hero photograph. */
    image: "",
    alt: "[CAKE DESCRIPTION]",
  },

  /** The large photograph in the closing section before the footer. */
  closing: {
    image: "",
    alt: "[CAKE DESCRIPTION]",
  },
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   4. HOME — BUSINESS INTRODUCTION
   ═══════════════════════════════════════════════════════════════════════════ */

export const introduction = {
  eyebrow: "About the cakes",
  heading: "Cakes made for the people they are made for",
  body: "Every occasion deserves a cake created with care. Elshadai Cake Creations combines thoughtful design, careful detail and a personal approach to create classic and personalised cakes for meaningful celebrations.",
  /** An optional second paragraph. Leave "" to hide it. */
  bodySecondary: "[BUSINESS DESCRIPTION]",

  /** The dominant photograph. */
  primaryImage: {
    src: "",
    alt: "[CAKE DESCRIPTION]",
    caption: "[CAKE NAME]",
  },
  /** A smaller detail shot, overlapping the main photograph. */
  detailImage: {
    src: "",
    alt: "[CAKE DESCRIPTION]",
  },
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   5. HOME — THE THREE FEATURED CAKES
   ═══════════════════════════════════════════════════════════════════════════
   Exactly three. The carousel is built around three and shows three
   indicators. Do not add a fourth.
   ═══════════════════════════════════════════════════════════════════════════ */

export const featured = [
  {
    id: "personalised",
    eyebrow: "Personalised cakes",
    title: "Personalised Cakes",
    statement: "Designed around you",
    description:
      "Designed around a chosen person, age, theme, colour scheme, interest or celebration.",
    occasion: "For any celebration",
    flavour: "[FLAVOUR INFORMATION]",
    image: { src: "", alt: "[CAKE DESCRIPTION]" },
    galleryFilter: "personalised",
  },
  {
    id: "classic",
    eyebrow: "Classic cakes",
    title: "Classic Cakes",
    statement: "Timeless and refined",
    description:
      "Timeless and elegant cake designs with refined decoration and traditional presentation.",
    occasion: "For understated celebrations",
    flavour: "[FLAVOUR INFORMATION]",
    image: { src: "", alt: "[CAKE DESCRIPTION]" },
    galleryFilter: "classic",
  },
  {
    id: "occasion",
    eyebrow: "Occasion cakes",
    title: "Occasion Cakes",
    statement: "Created for the day",
    description:
      "Cakes created for weddings, birthdays, christenings, anniversaries, graduations and other events.",
    occasion: "For milestone moments",
    flavour: "[FLAVOUR INFORMATION]",
    image: { src: "", alt: "[CAKE DESCRIPTION]" },
    galleryFilter: "all",
  },
] as const;

/* ═══════════════════════════════════════════════════════════════════════════
   6. HOME — PERSONALISED AND CLASSIC
   ═══════════════════════════════════════════════════════════════════════════ */

export const twoDirections = {
  eyebrow: "Two directions",
  heading: "Personalised and classic",
  standfirst:
    "Both are created for the same reason — a day that matters. They simply take a different route to get there.",

  personalised: {
    number: "01",
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
    number: "02",
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
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   7. HOME — OCCASIONS
   ═══════════════════════════════════════════════════════════════════════════
   Only occasions with a photograph are shown as a full visual entry. The rest
   are listed as text, so the section never displays an empty category.
   ═══════════════════════════════════════════════════════════════════════════ */

export const occasions = {
  eyebrow: "For the occasion",
  heading: "Every celebration has its cake",
  standfirst:
    "Personalised or classic, a cake can be created for any of the occasions below.",

  items: [
    { id: "birthday", label: "Birthday cakes", image: { src: "", alt: "[CAKE DESCRIPTION]" } },
    { id: "wedding", label: "Wedding cakes", image: { src: "", alt: "[CAKE DESCRIPTION]" } },
    { id: "christening", label: "Christening cakes", image: { src: "", alt: "[CAKE DESCRIPTION]" } },
    { id: "baptism", label: "Baptism cakes", image: { src: "", alt: "[CAKE DESCRIPTION]" } },
    { id: "anniversary", label: "Anniversary cakes", image: { src: "", alt: "[CAKE DESCRIPTION]" } },
    { id: "engagement", label: "Engagement cakes", image: { src: "", alt: "[CAKE DESCRIPTION]" } },
    { id: "baby-shower", label: "Baby shower cakes", image: { src: "", alt: "[CAKE DESCRIPTION]" } },
    { id: "gender-reveal", label: "Gender reveal cakes", image: { src: "", alt: "[CAKE DESCRIPTION]" } },
    { id: "graduation", label: "Graduation cakes", image: { src: "", alt: "[CAKE DESCRIPTION]" } },
    { id: "retirement", label: "Retirement cakes", image: { src: "", alt: "[CAKE DESCRIPTION]" } },
    { id: "religious", label: "Religious celebration cakes", image: { src: "", alt: "[CAKE DESCRIPTION]" } },
    { id: "family", label: "Family celebration cakes", image: { src: "", alt: "[CAKE DESCRIPTION]" } },
    { id: "corporate", label: "Corporate celebration cakes", image: { src: "", alt: "[CAKE DESCRIPTION]" } },
    { id: "seasonal", label: "Seasonal cakes", image: { src: "", alt: "[CAKE DESCRIPTION]" } },
  ],
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   8. HOME — WHY CHOOSE ELSHADAI CAKE CREATIONS
   ═══════════════════════════════════════════════════════════════════════════
   Deliberately about design and service. No ingredient, hygiene or delivery
   claims that cannot be supported.
   ═══════════════════════════════════════════════════════════════════════════ */

export const benefits = {
  eyebrow: "The difference",
  heading: "What makes an Elshadai cake special?",

  items: [
    {
      number: "01",
      title: "Personalised Designs",
      body: "Cakes can reflect the celebration, chosen style, colours, theme and personality of the occasion.",
    },
    {
      number: "02",
      title: "Classic Options",
      body: "Customers may also choose timeless, refined cakes that focus on traditional or elegant presentation.",
    },
    {
      number: "03",
      title: "Attention to Detail",
      body: "Decorations, textures, finishes and presentation are carefully considered.",
    },
    {
      number: "04",
      title: "Created for the Occasion",
      body: "Each cake is created to complement the event and the person or people being celebrated.",
    },
    {
      number: "05",
      title: "Carefully Presented",
      body: "Every cake is designed to feel polished and visually memorable.",
    },
    {
      number: "06",
      title: "Direct Communication",
      body: "Customers can contact the business directly using the listed contact channels.",
    },
  ],
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   9. HOME — EDITORIAL SHOWCASE
   ═══════════════════════════════════════════════════════════════════════════
   Three large photographs that move sideways as the page scrolls on desktop,
   and swipe normally on phones.
   ═══════════════════════════════════════════════════════════════════════════ */

export const showcase = {
  eyebrow: "A closer look",
  heading: "Three ways a cake begins",

  panels: [
    {
      id: "personalised",
      word: "Personalised",
      caption: "[CAKE NAME]",
      description: "[CAKE DESCRIPTION]",
      image: { src: "", alt: "[CAKE DESCRIPTION]" },
    },
    {
      id: "classic",
      word: "Classic",
      caption: "[CAKE NAME]",
      description: "[CAKE DESCRIPTION]",
      image: { src: "", alt: "[CAKE DESCRIPTION]" },
    },
    {
      id: "occasion",
      word: "Occasion",
      caption: "[CAKE NAME]",
      description: "[CAKE DESCRIPTION]",
      image: { src: "", alt: "[CAKE DESCRIPTION]" },
    },
  ],
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   10. HOME — CLOSING SECTION
   ═══════════════════════════════════════════════════════════════════════════ */

export const closing = {
  heading: "Cakes created for memorable occasions",
  body: "Discover personalised and classic cakes shaped by care, creativity and attention to detail.",
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   11. GALLERY
   ═══════════════════════════════════════════════════════════════════════════
   Add a cake by copying one entry and filling it in.

   style     "personalised" or "classic"
   occasion  one of the occasion ids in section 7, or ""
   size      "regular" | "tall" | "wide" | "feature"
             Controls how much room the cake takes in the layout. Use "feature"
             sparingly — one every six or seven cakes reads best.
   ═══════════════════════════════════════════════════════════════════════════ */

export type CakeStyle = "personalised" | "classic";
export type CakeSize = "regular" | "tall" | "wide" | "feature";

export type GalleryCake = {
  id: string;
  title: string;
  style: CakeStyle;
  occasion: string;
  description: string;
  flavour: string;
  image: { src: string; alt: string };
  size: CakeSize;
};

export const gallery = {
  eyebrow: "The collection",
  heading: "Our Cake Creations",
  standfirst:
    "Explore a collection of personalised and classic cakes created for meaningful occasions.",

  /**
   * Cakes shown in the Gallery.
   *
   * This starts empty on purpose. Add photographs to `assets-source/`, run
   * `npm run assets`, then add an entry here for each cake. Until then the
   * Gallery shows a short note rather than pretending to have work in it.
   */
  cakes: [] as GalleryCake[],
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   12. REVIEWS
   ═══════════════════════════════════════════════════════════════════════════ */

export const reviews = {
  eyebrow: "In their words",
  heading: "What customers say",
  emptyMessage: "No reviews yet — yours would be the first.",

  /** Wording on the review form. */
  form: {
    heading: "Leave a review",
    standfirst:
      "Thank you for taking the time. Your review appears on the website straight away.",
    consentLabel:
      "I am happy for my first name, rating and review to be shown publicly on this website.",
    successMessage: "Thank you. Your review has been published.",
  },
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   13. NAVIGATION AND LEGAL
   ═══════════════════════════════════════════════════════════════════════════ */

export const navigation = [
  { href: "/", label: "Home" },
  { href: "/gallery", label: "Gallery" },
] as const;

export const legal = {
  privacyUpdated: "[DATE]",
  cookiesUpdated: "[DATE]",
} as const;
