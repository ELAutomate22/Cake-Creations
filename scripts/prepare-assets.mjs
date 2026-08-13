/**
 * Asset preparation for Elshadai Cake Creations.
 *
 * Reads full-resolution photographs from `assets-source/` and writes optimised,
 * responsive versions into `public/`. Your originals are never modified, so the
 * highest quality copy is always preserved.
 *
 *   1. put your cake photographs in  assets-source/
 *   2. run                           npm run assets
 *   3. add each cake to              src/content/site.ts
 *
 * Files named hero-* or closing-* go to public/media/.
 * Everything else is treated as a cake and goes to public/cakes/.
 */

import { existsSync } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE = path.join(ROOT, "assets-source");
const PUBLIC = path.join(ROOT, "public");

/** Widths generated for each photograph, in CSS pixels. */
const WIDTHS = [640, 1080, 1600, 2400];

/** Tuned to keep icing detail while staying light over the wire. */
const WEBP = { quality: 82, effort: 5 };
const JPEG = { quality: 84, mozjpeg: true, progressive: true };

async function makeBlurPlaceholder(file) {
  const buffer = await sharp(file)
    .resize(20, null, { fit: "inside" })
    .blur(1.2)
    .webp({ quality: 30 })
    .toBuffer();
  return `data:image/webp;base64,${buffer.toString("base64")}`;
}

async function processPhoto(file, outDir, baseName) {
  const { width: sourceWidth, height: sourceHeight } =
    await sharp(file).metadata();

  const generated = [];

  for (const width of WIDTHS) {
    if (width > sourceWidth) continue;

    const resized = sharp(file).resize(width, null, { withoutEnlargement: true });

    await resized.clone().webp(WEBP).toFile(path.join(outDir, `${baseName}-${width}.webp`));
    await resized.clone().jpeg(JPEG).toFile(path.join(outDir, `${baseName}-${width}.jpg`));

    generated.push(width);
  }

  // A full-size fallback at the original dimensions.
  await sharp(file).webp(WEBP).toFile(path.join(outDir, `${baseName}.webp`));
  await sharp(file).jpeg(JPEG).toFile(path.join(outDir, `${baseName}.jpg`));

  return {
    name: baseName,
    width: sourceWidth,
    height: sourceHeight,
    widths: generated,
    blurDataURL: await makeBlurPlaceholder(file),
  };
}

async function main() {
  if (!existsSync(SOURCE)) {
    console.log("No assets-source/ folder found. Nothing to do.");
    return;
  }

  await mkdir(path.join(PUBLIC, "media"), { recursive: true });
  await mkdir(path.join(PUBLIC, "cakes"), { recursive: true });

  const entries = await readdir(SOURCE, { withFileTypes: true });
  const photos = entries.filter(
    (entry) => entry.isFile() && /\.(png|jpe?g|webp|tiff?)$/i.test(entry.name),
  );

  if (photos.length === 0) {
    console.log("No photographs found in assets-source/.");
    console.log("Drop your cake photographs in there and run this again.");
    return;
  }

  const manifest = {};

  for (const photo of photos) {
    const file = path.join(SOURCE, photo.name);
    const baseName = photo.name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const isMedia = /^(hero|closing)/.test(baseName);
    const folder = isMedia ? "media" : "cakes";
    const outDir = path.join(PUBLIC, folder);

    const result = await processPhoto(file, outDir, baseName);
    manifest[baseName] = { ...result, path: `/${folder}/${baseName}` };

    console.log(
      `  ${photo.name}  ->  /${folder}/${baseName}  (${result.width}x${result.height}, ${result.widths.length + 1} sizes)`,
    );
  }

  await writeFile(
    path.join(ROOT, "src", "content", "asset-manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8",
  );

  console.log(`\nDone. ${photos.length} photograph(s) processed.`);
  console.log("Now reference them in src/content/site.ts.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
