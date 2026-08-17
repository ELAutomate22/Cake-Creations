/**
 * Photograph curation for Elshadai Cake Creations.
 *
 * The originals are phone photographs in a mix of shapes, and every slot on the
 * website has its own shape: the hero fills the screen, the gallery mixes tall,
 * wide and feature tiles, the introduction has a small square detail. Handing
 * the same file to all of them and letting `object-fit: cover` decide would put
 * the crop wherever the middle of the frame happens to be, which is rarely
 * where the cake is.
 *
 * So each photograph is framed here, once, for the slot it was chosen for.
 *
 *   aspect  the slot's width ÷ height
 *   scale   how much of the largest possible crop to take (1 = all of it).
 *           Lower values push in on the cake and lose the room behind it.
 *   cx, cy  where that crop sits, 0 = hard left / top, 1 = hard right / bottom
 *
 * Output lands in assets-source/, which `npm run assets` then turns into the
 * responsive sizes actually served. Originals are never touched.
 *
 *   node scripts/curate-photos.mjs
 *   npm run assets
 */

import { existsSync } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE =
  "C:/Users/Andrei/Documents/Claude Code/Christina Sites/Cake Creations - kept assets/Photos";
const OUT = path.join(ROOT, "assets-source");

/**
 * The chosen photographs.
 *
 * `from` is an index into the source folder listed alphabetically — the WhatsApp
 * filenames carry no meaning, so the index is recorded here along with a
 * description of the cake so a human can tell which is which.
 */
const SELECTION = [
  // ── Full-bleed ────────────────────────────────────────────────────────────
  /*
   * The hero is the one slot that needs the same cake framed twice.
   *
   * Every photograph here is a tightly-held portrait of a single cake, and the
   * hero has to fill everything from a 21:9 desktop to a 9:19.5 phone. One file
   * cannot do both: cropped for the phone it becomes a close-up of the topper
   * on a desktop, and cropped for the desktop it becomes a narrow vertical
   * sliver on a phone. So the hero gets a portrait frame and a landscape frame
   * of the same cake, and Hero.tsx picks between them at the breakpoint.
   *
   * This cake was chosen for it because the window behind carries the width —
   * the landscape frame has somewhere to go.
   */
  {
    from: 20,
    name: "hero-lakeside",
    about: "Three-tier marble wedding cake, portrait frame for phones",
    aspect: 4 / 5,
    scale: 1,
    cx: 0.5,
    cy: 0.42,
  },
  {
    from: 26,
    name: "hero-plum-gold",
    about: "Plum and ivory three-tier cake, framed loosely so none of it is lost",
    aspect: 4 / 5,
    scale: 0.95,
    cx: 0.55,
    cy: 0.4,
  },
  {
    from: 19,
    name: "closing-wedding",
    about: "Navy and gold two-tier wedding cake against gold drapery",
    aspect: 4 / 5,
    scale: 1,
    cx: 0.5,
    cy: 0.4,
  },

  // ── Introduction ──────────────────────────────────────────────────────────
  {
    from: 16,
    name: "ivory-rose-birthday",
    about: "Ivory and red birthday cake with fresh roses, styled with a vase",
    aspect: 4 / 5,
    scale: 0.92,
    cx: 0.46,
    cy: 0.4,
  },
  {
    from: 35,
    name: "gold-leaf-detail",
    about: "Copper and gold chevron texture, close detail",
    aspect: 1,
    scale: 0.45,
    cx: 0.5,
    cy: 0.32,
  },

  // ── Featured carousel ─────────────────────────────────────────────────────
  {
    from: 12,
    name: "quilted-handbag",
    about: "Black quilted handbag cake with gold hardware and a gold 40",
    aspect: 4 / 5,
    scale: 0.8,
    cx: 0.5,
    cy: 0.46,
  },
  {
    from: 26,
    name: "plum-gold-tiers",
    about: "Plum and ivory three-tier celebration cake with a gold fan topper",
    aspect: 4 / 5,
    scale: 0.74,
    cx: 0.57,
    cy: 0.34,
  },

  // ── Personalised and classic ──────────────────────────────────────────────
  {
    from: 41,
    name: "stout-birthday",
    about: "Navy and ivory birthday cake themed on a favourite stout",
    aspect: 3 / 5,
    scale: 1,
    cx: 0.5,
    cy: 0.45,
  },
  {
    from: 11,
    name: "pearl-rose-thirty",
    about: "Blush pink 30th cake with piped pearls and sugar roses",
    aspect: 4 / 5,
    scale: 0.95,
    cx: 0.5,
    cy: 0.42,
  },

  // ── Editorial showcase ────────────────────────────────────────────────────
  {
    from: 8,
    name: "ivory-teal-forty",
    about: "Ivory and teal 40th cake with navy and gold spheres",
    aspect: 4 / 5,
    scale: 0.92,
    cx: 0.48,
    cy: 0.5,
  },
  {
    from: 17,
    name: "gilded-cross-christening",
    about: "White christening cake, gold cross, gilded spheres, dried flowers",
    aspect: 4 / 5,
    scale: 1,
    cx: 0.5,
    cy: 0.42,
  },
  {
    from: 10,
    name: "silver-christmas",
    about: "Ivory Christmas cake with a silver drip and piped tree",
    aspect: 4 / 5,
    scale: 0.95,
    cx: 0.5,
    cy: 0.45,
  },

  // ── Gallery only ──────────────────────────────────────────────────────────
  {
    from: 14,
    name: "quilted-handbag-wide",
    about: "Black quilted handbag cake, gold chain strap, three-quarter view",
    aspect: 16 / 10,
    scale: 0.86,
    cx: 0.55,
    cy: 0.3,
  },
  {
    from: 4,
    name: "gold-script-birthday",
    about: "Cream ribbed buttercream cake with gold script and paper florals",
    aspect: 4 / 5,
    scale: 0.9,
    cx: 0.5,
    cy: 0.38,
  },
  {
    from: 24,
    name: "ruby-christmas",
    about: "Ruby red Christmas cake with an ivory drip and baubles",
    aspect: 4 / 5,
    scale: 0.95,
    cx: 0.5,
    cy: 0.45,
  },
  {
    from: 30,
    name: "rose-copper-rosette",
    about: "Copper cake with textured lace piping and rose buttercream swirls",
    aspect: 4 / 5,
    scale: 0.95,
    cx: 0.46,
    cy: 0.16,
  },
  {
    from: 2,
    name: "jungle-dinosaur",
    about: "Green ombre dinosaur cake with sugar palm trees",
    aspect: 4 / 5,
    scale: 0.85,
    cx: 0.56,
    cy: 0.34,
  },
  {
    from: 27,
    name: "pastel-baby-celebration",
    about: "Yellow and sage baby celebration cake with a piped shell border",
    aspect: 4 / 5,
    scale: 0.8,
    cx: 0.5,
    cy: 0.36,
  },
  {
    from: 32,
    name: "amethyst-gold-tiers",
    about: "Purple and ivory three-tier cake with gold leaf and pearls",
    aspect: 3 / 5,
    scale: 0.85,
    cx: 0.56,
    cy: 0.38,
  },
  {
    from: 35,
    name: "copper-gold-chevron",
    about: "Copper and ivory cake with a gold chevron band and rosettes",
    aspect: 4 / 5,
    scale: 0.78,
    cx: 0.5,
    cy: 0.22,
  },
];

/** The crop rectangle for one entry, in source pixels. */
function cropRect(width, height, { aspect, scale, cx, cy }) {
  // The largest rectangle of this aspect that fits inside the photograph.
  let boxWidth = width;
  let boxHeight = Math.round(width / aspect);
  if (boxHeight > height) {
    boxHeight = height;
    boxWidth = Math.round(height * aspect);
  }

  boxWidth = Math.round(boxWidth * scale);
  boxHeight = Math.round(boxHeight * scale);

  // Slack left over once the box is placed, distributed by cx / cy.
  const left = Math.round((width - boxWidth) * cx);
  const top = Math.round((height - boxHeight) * cy);

  return {
    left: Math.max(0, Math.min(left, width - boxWidth)),
    top: Math.max(0, Math.min(top, height - boxHeight)),
    width: boxWidth,
    height: boxHeight,
  };
}

/**
 * The wordmark used in the header.
 *
 * The supplied logo is the EC monogram sitting above the words ELSHADAI CAKE
 * CREATIONS. Only the monogram is taken, for two reasons: the header already
 * sets the business name in type beside it, so the full lockup would print the
 * name twice, and the ELSHADAI line in the artwork is near-black — invisible
 * against the transparent header while it sits over the hero.
 *
 * Written straight to public/ rather than through `npm run assets`, because
 * that pipeline flattens to JPEG and the monogram needs its transparency.
 */
async function buildMonogram() {
  const source = path.join(SOURCE, "Logo.png");
  if (!existsSync(source)) {
    console.log("  no Logo.png found — skipping the monogram");
    return;
  }

  const outDir = path.join(ROOT, "public", "brand");
  await mkdir(outDir, { recursive: true });

  // The upper band of the artwork holds the monogram. Cropping and trimming
  // are separate passes: sharp applies trim before extract within one pipeline,
  // which would make the extract window refer to an image that no longer exists.
  const band = await sharp(source)
    .extract({ left: 0, top: 60, width: 1536, height: 560 })
    .png()
    .toBuffer();

  const trimmed = await sharp(band).trim({ threshold: 1 }).png().toBuffer();

  // Rendered around 30px tall, so 256 covers well past three times that.
  await sharp(trimmed)
    .resize({ height: 256, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, "monogram.png"));

  const { width, height } = await sharp(
    path.join(outDir, "monogram.png"),
  ).metadata();
  console.log(`  Logo.png  ->  /brand/monogram.png  (${width}x${height})`);
}

async function main() {
  await mkdir(OUT, { recursive: true });

  await buildMonogram();

  const files = (await readdir(SOURCE))
    .filter((file) => /\.jpe?g$/i.test(file))
    .sort();

  const notes = [];

  for (const entry of SELECTION) {
    const file = path.join(SOURCE, files[entry.from]);
    const { width, height } = await sharp(file).metadata();
    const rect = cropRect(width, height, entry);

    await sharp(file)
      .extract(rect)
      // Kept lossless here; `npm run assets` does the lossy pass once, so the
      // photographs are never compressed twice.
      .jpeg({ quality: 100, chromaSubsampling: "4:4:4" })
      .toFile(path.join(OUT, `${entry.name}.jpg`));

    notes.push({
      name: entry.name,
      about: entry.about,
      original: files[entry.from],
      source: `${width}x${height}`,
      cropped: `${rect.width}x${rect.height}`,
      aspect: entry.aspect.toFixed(3),
    });

    console.log(
      `  ${files[entry.from]}  ->  ${entry.name}.jpg  (${rect.width}x${rect.height})`,
    );
  }

  await writeFile(
    path.join(OUT, "SELECTION.json"),
    JSON.stringify(notes, null, 2) + "\n",
    "utf8",
  );

  console.log(`\n${SELECTION.length} photograph(s) framed. Now run: npm run assets`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
