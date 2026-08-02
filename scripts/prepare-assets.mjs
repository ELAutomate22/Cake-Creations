/**
 * Asset preparation for Elshadai Cake Creations.
 *
 * Reads full-resolution photographs from `assets-source/` and writes optimised,
 * responsive versions into `public/`. Originals are never modified, so the
 * highest quality copy is always preserved.
 *
 * Run with:  npm run assets
 */

import { existsSync } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE = path.join(ROOT, "assets-source");
const PUBLIC = path.join(ROOT, "public");

/** Widths generated for each photograph, in CSS pixels. */
const WIDTHS = [640, 1080, 1600];

/** Quality settings tuned to keep cake detail while staying light. */
const WEBP = { quality: 82, effort: 5 };
const JPEG = { quality: 84, mozjpeg: true, progressive: true };

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

/**
 * Produces a tiny blurred version of an image, inlined as a data URI.
 * Used as the low-quality placeholder shown while the real photo loads.
 */
async function makeBlurPlaceholder(file) {
  const buffer = await sharp(file)
    .resize(20, null, { fit: "inside" })
    .blur(1.2)
    .webp({ quality: 30 })
    .toBuffer();
  return `data:image/webp;base64,${buffer.toString("base64")}`;
}

/** Writes responsive WebP and JPEG derivatives for one source photograph. */
async function processPhoto(file, outDir, baseName) {
  const image = sharp(file);
  const { width: sourceWidth, height: sourceHeight } = await image.metadata();

  const generated = [];

  for (const width of WIDTHS) {
    // Never upscale beyond the original resolution.
    if (width > sourceWidth) continue;

    const resized = sharp(file).resize(width, null, { withoutEnlargement: true });

    await resized
      .clone()
      .webp(WEBP)
      .toFile(path.join(outDir, `${baseName}-${width}.webp`));

    await resized
      .clone()
      .jpeg(JPEG)
      .toFile(path.join(outDir, `${baseName}-${width}.jpg`));

    generated.push(width);
  }

  // Always emit a full-size fallback at the original dimensions.
  await sharp(file)
    .webp(WEBP)
    .toFile(path.join(outDir, `${baseName}.webp`));
  await sharp(file)
    .jpeg(JPEG)
    .toFile(path.join(outDir, `${baseName}.jpg`));

  const blurDataURL = await makeBlurPlaceholder(file);

  return {
    name: baseName,
    width: sourceWidth,
    height: sourceHeight,
    widths: generated,
    blurDataURL,
  };
}

async function main() {
  if (!existsSync(SOURCE)) {
    console.log(`No assets-source/ folder found. Nothing to do.`);
    return;
  }

  await ensureDir(path.join(PUBLIC, "media"));
  await ensureDir(path.join(PUBLIC, "cakes"));

  const entries = await readdir(SOURCE, { withFileTypes: true });
  const photos = entries.filter(
    (entry) => entry.isFile() && /\.(png|jpe?g|webp|tiff?)$/i.test(entry.name),
  );

  if (photos.length === 0) {
    console.log("No source photographs found in assets-source/.");
    return;
  }

  const manifest = {};

  for (const photo of photos) {
    const file = path.join(SOURCE, photo.name);
    const baseName = photo.name
      .replace(/\.[^.]+$/, "")
      .replace(/-original$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Anything named intro-* or hero-* belongs in media/, the rest are cakes.
    const isMedia = /^(intro|hero)/.test(baseName);
    const outDir = path.join(PUBLIC, isMedia ? "media" : "cakes");

    const result = await processPhoto(file, outDir, baseName);
    manifest[baseName] = {
      ...result,
      path: `/${isMedia ? "media" : "cakes"}/${baseName}`,
    };

    console.log(
      `  ${photo.name}  ->  ${result.widths.length + 1} sizes  (${result.width}x${result.height})`,
    );
  }

  await writeFile(
    path.join(ROOT, "src", "content", "asset-manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8",
  );

  console.log(`\nDone. ${photos.length} photograph(s) processed.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
