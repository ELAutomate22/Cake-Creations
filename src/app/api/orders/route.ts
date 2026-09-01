import { NextResponse } from "next/server";
import {
  orderSubmissionSchema,
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_REFERENCE_IMAGES,
} from "@/lib/orders/schema";
import { nextOrderNumber } from "@/lib/orders/reference";
import { clientIp, fingerprint, sanitiseText } from "@/lib/reviews/sanitise";
import { isDatabaseConfigured, query } from "@/lib/d1/client";
import { deleteObject, isStorageConfigured, putObject } from "@/lib/r2/client";
import { sendOwnerAlert } from "@/lib/email/resend";
import { ownerNightAlertEmail } from "@/lib/email/templates";
import { appBaseUrl } from "@/lib/stripe/client";

/**
 * Cake requests.
 *
 * A request is not an order. Nothing here takes a payment, quotes a price or
 * confirms a date — it records what the customer asked for and hands back a
 * reference. No email is sent: that is Phase 2, and it is deliberate rather
 * than unfinished.
 *
 * The order of work matters. Everything is validated before a single byte is
 * stored, so a rejected submission leaves nothing behind; and if the database
 * write fails after the images are in R2, those objects are deleted again
 * rather than left orphaned in a bucket nothing points at.
 *
 *   1. rate limit, against a salted hash of the submitter
 *   2. the honeypot
 *   3. full schema validation, conditional requirements included
 *   4. image validation — type, extension, size, count
 *   5. upload to R2 under a key the server chooses
 *   6. write the order, its image rows and its first activity entry
 */

export const runtime = "nodejs";

/** How many requests one submitter may send, and over what window. */
const RATE_LIMIT = { max: 5, windowHours: 24 };

/** The wording accepted at submission, recorded against the order. */
const POLICY_VERSION = "2026-08-29";

function problem(message: string, status: number, field?: string) {
  return NextResponse.json({ ok: false, message, field }, { status });
}

/** Checks the bytes actually look like the image type they claim to be. */
function looksLikeImage(bytes: Uint8Array, mimeType: string): boolean {
  if (bytes.length < 12) return false;

  // JPEG: FF D8 FF
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (mimeType === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  }

  // WebP: "RIFF" .... "WEBP"
  if (mimeType === "image/webp") {
    const ascii = (index: number) => String.fromCharCode(bytes[index]);
    return (
      ascii(0) + ascii(1) + ascii(2) + ascii(3) === "RIFF" &&
      ascii(8) + ascii(9) + ascii(10) + ascii(11) === "WEBP"
    );
  }

  return false;
}

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}


/**
 * Whether a moment falls in the hours nobody is watching the admin.
 *
 * Nine at night until eight in the morning, in London — not in whatever zone
 * the server happens to run in, which is UTC on Netlify and would be an hour
 * out for half the year. `Intl` is given the zone explicitly so British Summer
 * Time is handled by the platform rather than by arithmetic here.
 *
 * `h23` matters: the twelve-hour cycles render midnight as "24" or "12"
 * depending on the locale, and a window that silently excluded midnight would
 * be a difficult thing to notice.
 */
function isOutOfHours(at: Date): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      hour: "numeric",
      hourCycle: "h23",
    }).format(at),
  );

  if (!Number.isFinite(hour)) return false;
  return hour >= 21 || hour < 8;
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return problem(
      "Cake requests are not connected to a database yet. Please get in touch by phone.",
      503,
    );
  }

  const salt = process.env.REVIEW_HASH_SALT;
  if (!salt) {
    // Without the salt, throttling would store reversible address hashes.
    console.error("REVIEW_HASH_SALT is not set; refusing to accept requests.");
    return problem("Cake requests are temporarily unavailable.", 503);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return problem("That submission could not be read.", 400);
  }

  const submitter = fingerprint(clientIp(request.headers), salt);

  // ── 1. Rate limiting ──────────────────────────────────────────────────────
  const since = new Date(
    Date.now() - RATE_LIMIT.windowHours * 60 * 60 * 1000,
  ).toISOString();

  try {
    const { rows } = await query<{ count: number }>(
      `SELECT COUNT(*) AS count FROM orders
        WHERE submitter_hash = ? AND created_at >= ?`,
      [submitter, since],
    );

    if ((rows[0]?.count ?? 0) >= RATE_LIMIT.max) {
      return problem(
        "Several requests have already been sent from here today. Please get in touch by phone.",
        429,
      );
    }
  } catch (error) {
    console.error("Rate limit check failed:", error);
    return problem("Your request could not be sent. Please try again.", 500);
  }

  // ── 2. The honeypot ───────────────────────────────────────────────────────
  const honeypot = form.get("website");
  if (typeof honeypot === "string" && honeypot.length > 0) {
    // Accepted from the sender's point of view, and never stored.
    return NextResponse.json({ ok: true, orderNumber: null });
  }

  // ── 3. The answers ────────────────────────────────────────────────────────
  const fields = Object.fromEntries(
    [...form.entries()].filter(([, value]) => typeof value === "string"),
  );

  const parsed = orderSubmissionSchema.safeParse({
    ...fields,
    acceptedTerms: fields.acceptedTerms === "true",
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return problem(first.message, 422, String(first.path[0] ?? ""));
  }

  const order = parsed.data;

  // ── 4. The photographs ────────────────────────────────────────────────────
  const uploads = form
    .getAll("referenceImages")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (uploads.length > MAX_REFERENCE_IMAGES) {
    return problem(
      `Please attach no more than ${MAX_REFERENCE_IMAGES} reference photographs.`,
      422,
      "referenceImages",
    );
  }

  /*
   * Photographs were attached but there is nowhere to put them.
   *
   * Saying so is the only honest option. Accepting the order and dropping the
   * images would leave the customer believing they had sent something the
   * owner will never see, and the images are often the clearest description of
   * the cake they want.
   */
  if (uploads.length > 0 && !isStorageConfigured()) {
    return problem(
      "Reference photographs cannot be received at the moment. Please send your request without them, and we will ask for the photographs when we reply.",
      503,
      "referenceImages",
    );
  }

  const checked: { file: File; bytes: ArrayBuffer; extension: string }[] = [];

  for (const file of uploads) {
    if (file.size > MAX_IMAGE_BYTES) {
      return problem(
        `${file.name} is larger than 5 MB.`,
        422,
        "referenceImages",
      );
    }

    const type = file.type.toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.includes(type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      return problem(
        `${file.name} is not a JPG, PNG or WebP image.`,
        422,
        "referenceImages",
      );
    }

    const extension = extensionOf(file.name);
    if (
      !ALLOWED_IMAGE_EXTENSIONS.includes(
        extension as (typeof ALLOWED_IMAGE_EXTENSIONS)[number],
      )
    ) {
      return problem(
        `${file.name} does not have a JPG, PNG or WebP file extension.`,
        422,
        "referenceImages",
      );
    }

    // The declared type is just a header the browser sent. Read the first
    // bytes and check they match, so a script renamed to .png is refused.
    const bytes = await file.arrayBuffer();
    if (!looksLikeImage(new Uint8Array(bytes.slice(0, 12)), type)) {
      return problem(
        `${file.name} does not appear to be a real image.`,
        422,
        "referenceImages",
      );
    }

    checked.push({ file, bytes, extension });
  }

  // ── 5. Store ──────────────────────────────────────────────────────────────
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Written here so it can be cleaned up if the database write fails.
  const storedKeys: string[] = [];

  try {
    if (checked.length > 0) {
      for (const [index, item] of checked.entries()) {
        // The key is built from the order id and the position, never from the
        // uploaded filename — that string came from a browser.
        const key = `orders/${id}/reference-${index + 1}${item.extension}`;
        await putObject(key, item.bytes, item.file.type.toLowerCase());
        storedKeys.push(key);
      }
    }

    /*
     * The reference, and the one race worth guarding.
     *
     * order_number is UNIQUE, so two submissions landing together cannot both
     * take the same number — the second insert fails instead. Retrying reads
     * the counter again and takes the next one.
     */
    let orderNumber = "";
    let inserted = false;
    let attempt = 0;

    while (!inserted && attempt < 5) {
      attempt += 1;
      orderNumber = await nextOrderNumber();

      try {
        await query(
          `INSERT INTO orders (
             id, order_number, customer_name, customer_email, customer_phone,
             occasion, occasion_other, cake_style, servings, flavour, flavour_other,
             theme, colours, cake_name_text, age_number, cake_message,
             design_requirements, required_date, fulfilment_type,
             delivery_address, delivery_postcode, status,
             accepted_terms, accepted_terms_at, policy_version, submitter_hash,
             created_at, updated_at
           ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            id,
            orderNumber,
            sanitiseText(order.customerName),
            order.customerEmail,
            sanitiseText(order.customerPhone),
            order.occasion,
            order.occasion === "Other" ? sanitiseText(order.occasionOther) : null,
            order.cakeStyle,
            order.servings,
            order.flavour,
            order.flavour === "Other" ? sanitiseText(order.flavourOther) : null,
            sanitiseText(order.theme),
            sanitiseText(order.colours),
            sanitiseText(order.cakeNameText),
            sanitiseText(order.ageNumber),
            sanitiseText(order.cakeMessage),
            sanitiseText(order.designRequirements),
            order.requiredDate,
            order.fulfilmentType,
            order.fulfilmentType === "delivery"
              ? sanitiseText(order.deliveryAddress)
              : null,
            order.fulfilmentType === "delivery"
              ? order.deliveryPostcode.toUpperCase()
              : null,
            "new_request",
            1,
            now,
            POLICY_VERSION,
            submitter,
            now,
            now,
          ],
        );
        inserted = true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // Anything other than the reference being taken is a real failure.
        if (!/UNIQUE|constraint/i.test(message) || attempt === 5) throw error;
      }
    }

    for (const [index, key] of storedKeys.entries()) {
      const item = checked[index];
      await query(
        `INSERT INTO order_images (
           id, order_id, r2_object_key, original_filename, mime_type,
           file_size, sort_order, created_at
         ) VALUES (?,?,?,?,?,?,?,?)`,
        [
          crypto.randomUUID(),
          id,
          key,
          sanitiseText(item.file.name).slice(0, 200),
          item.file.type.toLowerCase(),
          item.file.size,
          index,
          now,
        ],
      );
    }

    await query(
      `INSERT INTO order_activity (
         id, order_id, activity_type, description, metadata_json, created_at
       ) VALUES (?,?,?,?,?,?)`,
      [
        crypto.randomUUID(),
        id,
        "request_submitted",
        "Cake request received from the website.",
        JSON.stringify({
          referenceImages: storedKeys.length,
          policyVersion: POLICY_VERSION,
        }),
        now,
      ],
    );

    /*
     * Tell the owner, but only about the ones she would otherwise miss.
     *
     * A request that arrives at two in the morning sits unseen until someone
     * opens the admin; one that arrives at eleven on a Tuesday does not need
     * an email to be noticed. So the alert is sent only between nine at night
     * and eight in the morning.
     *
     * Failure here is swallowed on purpose. The customer's request is saved by
     * this point, and refusing them a confirmation because a notification to
     * someone else did not send would be the wrong way round. It is logged
     * instead, and the request stands.
     */
    if (isOutOfHours(new Date(now))) {
      try {
        const alert = ownerNightAlertEmail({
          orderNumber,
          occasion:
            order.occasion === "Other" ? order.occasionOther : order.occasion,
          requiredDate: order.requiredDate,
          servings: String(order.servings),
          receivedAt: new Date(now).toLocaleString("en-GB", {
            timeZone: "Europe/London",
          }),
          adminUrl: `${appBaseUrl()}/admin/orders/${id}`,
        });

        const sent = await sendOwnerAlert(alert);

        await query(
          `INSERT INTO order_activity (
             id, order_id, activity_type, description, metadata_json, created_at
           ) VALUES (?,?,?,?,?,?)`,
          [
            crypto.randomUUID(),
            id,
            "owner_notified",
            sent.ok
              ? "Out-of-hours alert sent to the owner."
              : "Out-of-hours alert could not be sent.",
            JSON.stringify({ ok: sent.ok, error: sent.error ?? null }),
            new Date().toISOString(),
          ],
        );

        if (!sent.ok) {
          console.error("Out-of-hours owner alert failed:", sent.error);
        }
      } catch (error) {
        console.error("Out-of-hours owner alert failed:", error);
      }
    }

    // Deliberately only the reference. Nothing the customer submitted is
    // echoed back, so this response cannot become a way to read an order.
    return NextResponse.json({ ok: true, orderNumber });
  } catch (error) {
    console.error("Cake request could not be saved:", error);

    // Do not leave images in the bucket for an order that does not exist.
    for (const key of storedKeys) {
      try {
        await deleteObject(key);
      } catch (cleanupError) {
        console.error("Orphaned R2 object left behind:", key, cleanupError);
      }
    }

    return problem("Your request could not be sent. Please try again.", 500);
  }
}
