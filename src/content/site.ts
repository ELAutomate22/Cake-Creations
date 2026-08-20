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

  /**
   * A single fixed line beneath the business name in the hero.
   *
   * Leave this as a placeholder and the hero rotates through
   * `brandStatements` below instead, showing a different one on every visit.
   * Fill it in and that one line is used every time, permanently.
   */
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

/**
 * Lines that rotate beneath the business name in the hero.
 *
 * One is chosen at random on every visit, and never the same one twice in a
 * row. Add, remove or rewrite freely — the hero uses however many are here.
 *
 * Two rules if you write your own. Keep them short, because this sits under a
 * large heading and a long line wraps awkwardly on a phone. And keep them to
 * things that are true of the design and the care taken: no promises about
 * ingredients, hygiene, delivery or awards that the business would have to
 * stand behind.
 */
export const brandStatements: string[] = [
  "Every celebration deserves a cake of its own.",
  "Designed around the day it is made for.",
  "The centrepiece, not the afterthought.",
  "Personalised and classic cakes, finished by hand.",
  "Made for the moment you will want to remember.",
  "A cake worth gathering around.",
  "Classic when you want it, personal when it counts.",
  "Cakes that look like the occasion they are for.",
  "Where the detail is the whole point.",
  "Handmade for milestones, large and small.",
  "Designed to be admired before it is cut.",
  "For birthdays, weddings, and everything in between.",
  "Finished by hand, down to the last pearl.",
  "A cake as considered as the celebration.",
  "Made once, for one occasion, for you.",
  "Your celebration, given its centrepiece.",
  "The part of the day everyone photographs.",
  "Created for the people being celebrated.",
  "Personalised or classic. Always considered.",
  "One cake, shaped entirely around one day.",
];

/* ═══════════════════════════════════════════════════════════════════════════
   2. CONTACT DETAILS
   ═══════════════════════════════════════════════════════════════════════════
   Shown in the Contact dialog and the footer.

   Leave any value as its [PLACEHOLDER] and the website simply will not show
   that row. Nothing breaks, and nothing is invented.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * A number to call, and optionally whose it is.
 *
 * `label` is what tells a visitor who they are ringing when there is more than
 * one number. Leave it as its placeholder and the number is still shown, just
 * without a name against it.
 */
export type PhoneNumber = { number: string; label: string };

export const contact = {
  person: "[CONTACT PERSON]",

  /**
   * The welcome line at the top of the Contact dialog.
   *
   * Keep it to what is true of how the business works. It is the first thing
   * read after the name, so it should invite a call rather than promise
   * anything about prices, timings or availability.
   */
  message:
    "Every cake begins with a conversation — the occasion, the person, and the date it is needed. A call is the quickest way to start one.",

  /**
   * Numbers people can call. Add or remove entries freely.
   *
   * Write each one the way it should be read on the page, spaces and all —
   * the link that actually dials strips everything but the digits, so the
   * display format is yours to choose.
   */
  phones: [
    { number: "+44 7534 634714", label: "[NAME FOR THIS NUMBER]" },
    { number: "+44 7773 556005", label: "[NAME FOR THIS NUMBER]" },
  ] as PhoneNumber[],

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
  /** Only the numbers that have actually been filled in. */
  phones: contact.phones.filter((entry) => isProvided(entry.number)),
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
    /**
     * The hero photograph.
     *
     * It is shown whole rather than cropped to fill the screen, standing in a
     * band down the middle of the hero with its left and right edges dissolving
     * into the background colour.
     *
     * `imageWide` is an optional second framing of the same cake for large
     * screens. It is not needed while the photograph is shown contained — that
     * was a workaround for filling the full width — so it is left empty.
     */
    image: "/media/hero-plum-gold.jpg",
    imageWide: "",
    alt: "A three-tier plum and ivory celebration cake finished with gold leaf, piped pearls and a gold fan topper",
  },

  /** The large photograph in the closing section before the footer. */
  closing: {
    image: "/media/closing-wedding.jpg",
    alt: "A navy and gold two-tier wedding cake dressed with a sugar rose, photographed against gold drapery",
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

  /** The one photograph in this section. */
  primaryImage: {
    src: "/cakes/ivory-rose-birthday.jpg",
    alt: "An ivory and ruby birthday cake dressed with fresh roses and piped pearls",
    caption: "Ivory & Rose Birthday Cake",
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
    image: {
      src: "/cakes/quilted-handbag.jpg",
      alt: "A hand-sculpted quilted handbag cake with gold hardware and a gilded forty",
    },
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
    image: {
      src: "/cakes/gold-script-birthday.jpg",
      alt: "A cream ribbed buttercream cake with a gold script drawing and paper florals",
    },
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
    // Not the plum tiers any more — that cake now opens the page in the hero,
    // and showing it twice on one screenful reads as a short portfolio.
    image: {
      src: "/cakes/pastel-baby-celebration.jpg",
      alt: "A yellow and sage baby celebration cake with a hand-piped shell border and a named plaque",
    },
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
    image: {
      src: "/cakes/stout-birthday.jpg",
      alt: "A navy and ivory birthday cake themed around a favourite stout, topped with a gold fan",
    },
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
    image: {
      src: "/cakes/pearl-rose-thirty.jpg",
      alt: "A blush thirtieth birthday cake with a piped pearl number and sugar roses",
    },
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
      caption: "Ivory & Teal Fortieth",
      description:
        "Ribbed teal panels, a gilded forty and a cluster of navy and gold spheres.",
      image: {
        src: "/cakes/ivory-teal-forty.jpg",
        alt: "An ivory fortieth birthday cake with ribbed teal panels and navy and gold spheres",
      },
    },
    {
      id: "classic",
      word: "Classic",
      caption: "Gilded Cross Christening",
      description:
        "A single ivory tier marked with a burnished gold cross and a drift of gilded spheres.",
      image: {
        src: "/cakes/gilded-cross-christening.jpg",
        alt: "A white christening cake finished with a gold cross and gilded spheres",
      },
    },
    {
      id: "occasion",
      word: "Occasion",
      caption: "Silver Christmas",
      description:
        "An ivory cake with a poured silver drip and a hand-piped Christmas tree.",
      image: {
        src: "/cakes/silver-christmas.jpg",
        alt: "An ivory Christmas cake with a poured silver drip and a hand-piped tree",
      },
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
   * To add one: put the photograph in `assets-source/`, run `npm run assets`,
   * then copy an entry below and fill it in. The `size` must match the shape
   * the photograph was cropped to — "regular" and "feature" are 4:5, "tall" is
   * 3:5 and "wide" is 16:10 — otherwise the tile crops the cake again.
   *
   * The order below is the order they appear in, arranged so the two feature
   * tiles and the one wide tile are spaced out rather than bunched together.
   */
  cakes: [
    {
      id: "gilded-cross-christening",
      title: "Gilded Cross Christening Cake",
      style: "classic",
      occasion: "christening",
      description:
        "A single tier in soft ivory, marked with a burnished gold cross and a drift of gilded spheres, finished with a hand-lettered topper.",
      flavour: "[FLAVOUR INFORMATION]",
      image: {
        src: "/cakes/gilded-cross-christening.jpg",
        alt: "A white christening cake finished with a gold cross, gilded spheres and a hand-lettered topper",
      },
      size: "feature",
    },
    {
      id: "pearl-rose-thirtieth",
      title: "Pearl & Rose Thirtieth",
      style: "classic",
      occasion: "birthday",
      description:
        "A blush buttercream tier with the number thirty picked out in piped pearls, crowned with sugar roses.",
      flavour: "[FLAVOUR INFORMATION]",
      image: {
        src: "/cakes/pearl-rose-thirty.jpg",
        alt: "A blush thirtieth birthday cake with a piped pearl number and sugar roses",
      },
      size: "regular",
    },
    {
      id: "stout-birthday",
      title: "Stout Birthday Cake",
      style: "personalised",
      occasion: "birthday",
      description:
        "Built around a favourite drink: ribbed ivory over deep navy, a hand-finished emblem and a gold palm fan above.",
      flavour: "[FLAVOUR INFORMATION]",
      image: {
        src: "/cakes/stout-birthday.jpg",
        alt: "A navy and ivory birthday cake themed around a favourite stout, topped with a gold fan",
      },
      size: "tall",
    },
    {
      id: "quilted-handbag",
      title: "Quilted Handbag Cake",
      style: "personalised",
      occasion: "birthday",
      description:
        "Sculpted by hand into a quilted clutch, complete with a gold chain strap, a working-looking clasp and a gilded forty.",
      flavour: "[FLAVOUR INFORMATION]",
      image: {
        src: "/cakes/quilted-handbag-wide.jpg",
        alt: "A hand-sculpted quilted handbag cake with a gold chain strap, seen from three quarters",
      },
      size: "wide",
    },
    {
      id: "ivory-rose-birthday",
      title: "Ivory & Rose Birthday Cake",
      style: "classic",
      occasion: "birthday",
      description:
        "Ivory over ruby, studded with piped pearls and finished with cream and crimson roses.",
      flavour: "[FLAVOUR INFORMATION]",
      image: {
        src: "/cakes/ivory-rose-birthday.jpg",
        alt: "An ivory and ruby birthday cake dressed with fresh roses and piped pearls",
      },
      size: "regular",
    },
    {
      id: "ivory-teal-fortieth",
      title: "Ivory & Teal Fortieth",
      style: "personalised",
      occasion: "birthday",
      description:
        "Ribbed teal panels framing a gilded forty, with a cluster of navy, white and gold spheres.",
      flavour: "[FLAVOUR INFORMATION]",
      image: {
        src: "/cakes/ivory-teal-forty.jpg",
        alt: "An ivory fortieth birthday cake with ribbed teal panels and navy and gold spheres",
      },
      size: "regular",
    },
    {
      id: "lakeside-wedding",
      title: "Lakeside Wedding Tiers",
      style: "classic",
      occasion: "wedding",
      description:
        "Three tiers moving from marbled grey through a monogrammed terracotta band to soft stone, dressed in dusty roses.",
      flavour: "[FLAVOUR INFORMATION]",
      image: {
        src: "/media/hero-lakeside.jpg",
        alt: "A three-tier marble wedding cake with a monogrammed terracotta tier and dusty sugar roses",
      },
      size: "feature",
    },
    {
      id: "gold-script-birthday",
      title: "Gold Script Birthday Cake",
      style: "classic",
      occasion: "birthday",
      description:
        "Ribbed cream buttercream carrying a gold script line drawing, finished with paper florals in red and blush.",
      flavour: "[FLAVOUR INFORMATION]",
      image: {
        src: "/cakes/gold-script-birthday.jpg",
        alt: "A cream ribbed buttercream cake with a gold script drawing and paper florals",
      },
      size: "regular",
    },
    {
      id: "amethyst-gold-tiers",
      title: "Amethyst & Gold Tiers",
      style: "personalised",
      occasion: "birthday",
      description:
        "Ribbed amethyst alternating with ivory, scattered with gold leaf and edged in piped pearls.",
      flavour: "[FLAVOUR INFORMATION]",
      image: {
        src: "/cakes/amethyst-gold-tiers.jpg",
        alt: "A three-tier purple and ivory cake with gold leaf and piped pearl detail",
      },
      size: "tall",
    },
    {
      id: "navy-gold-wedding",
      title: "Navy & Gold Wedding Cake",
      style: "classic",
      occasion: "wedding",
      description:
        "Two tiers washed from navy into brushed gold, banded in crystal and finished with a single sugar rose.",
      flavour: "[FLAVOUR INFORMATION]",
      image: {
        src: "/media/closing-wedding.jpg",
        alt: "A navy and gold two-tier wedding cake dressed with a sugar rose",
      },
      size: "regular",
    },
    {
      id: "plum-gold-tiers",
      title: "Plum & Gold Celebration Cake",
      style: "personalised",
      occasion: "birthday",
      description:
        "Three tiers alternating ribbed plum and ivory, gilded at the edges and topped with a gold fan.",
      flavour: "[FLAVOUR INFORMATION]",
      image: {
        src: "/cakes/plum-gold-tiers.jpg",
        alt: "A three-tier plum and ivory celebration cake finished with gold leaf and piped pearls",
      },
      size: "regular",
    },
    {
      id: "copper-gold-chevron",
      title: "Copper & Gold Chevron Cake",
      style: "classic",
      occasion: "birthday",
      description:
        "A stencilled chevron band over copper buttercream, split by a torn edge of gold leaf and crowned with rosettes.",
      flavour: "[FLAVOUR INFORMATION]",
      image: {
        src: "/cakes/copper-gold-chevron.jpg",
        alt: "A copper and ivory cake with a stencilled chevron band, gold leaf edge and piped rosettes",
      },
      size: "regular",
    },
    {
      id: "rose-copper-rosette",
      title: "Rose & Copper Rosette Cake",
      style: "classic",
      occasion: "birthday",
      description:
        "Lace-textured copper icing half covered by a spill of rose, slate and cream buttercream swirls.",
      flavour: "[FLAVOUR INFORMATION]",
      image: {
        src: "/cakes/rose-copper-rosette.jpg",
        alt: "A copper cake with lace-textured piping and a spill of rose and slate buttercream swirls",
      },
      size: "regular",
    },
    {
      id: "pastel-baby-celebration",
      title: "Pastel Baby Celebration Cake",
      style: "personalised",
      occasion: "baby-shower",
      description:
        "Sunlit yellow over sage, with a hand-piped shell border and the name written across a soft plaque.",
      flavour: "[FLAVOUR INFORMATION]",
      image: {
        src: "/cakes/pastel-baby-celebration.jpg",
        alt: "A yellow and sage baby celebration cake with a hand-piped shell border and a named plaque",
      },
      size: "regular",
    },
    {
      id: "jungle-dinosaur",
      title: "Jungle Dinosaur Cake",
      style: "personalised",
      occasion: "birthday",
      description:
        "A green ombré tier under a modelled jungle scene — sugar palms and three hand-shaped dinosaurs.",
      flavour: "[FLAVOUR INFORMATION]",
      image: {
        src: "/cakes/jungle-dinosaur.jpg",
        alt: "A green ombre cake topped with hand-modelled dinosaurs and sugar palm trees",
      },
      size: "regular",
    },
    {
      id: "silver-christmas",
      title: "Silver Christmas Cake",
      style: "classic",
      occasion: "seasonal",
      description:
        "An ivory tier under a poured silver drip, with a Christmas tree piped by hand and dusted in pearls.",
      flavour: "[FLAVOUR INFORMATION]",
      image: {
        src: "/cakes/silver-christmas.jpg",
        alt: "An ivory Christmas cake with a poured silver drip and a hand-piped tree",
      },
      size: "regular",
    },
    {
      id: "ruby-christmas",
      title: "Ruby Christmas Cake",
      style: "personalised",
      occasion: "seasonal",
      description:
        "Deep ruby beneath an ivory drip, finished with baubles in red, white and gold and a winter topper.",
      flavour: "[FLAVOUR INFORMATION]",
      image: {
        src: "/cakes/ruby-christmas.jpg",
        alt: "A ruby red Christmas cake with an ivory drip, baubles and a winter topper",
      },
      size: "regular",
    },
  ] as GalleryCake[],
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
