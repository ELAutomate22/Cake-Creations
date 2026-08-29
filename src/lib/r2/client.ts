import "server-only";
import { AwsClient } from "aws4fetch";

/**
 * Cloudflare R2, over its S3-compatible API.
 *
 * The site is hosted on Netlify, so there is no R2 binding to reach a bucket
 * through — the same constraint that put D1 behind its REST API. R2 exposes
 * objects only over S3, which means requests have to carry an AWS SigV4
 * signature. `aws4fetch` does that and nothing else: no AWS SDK, no dependency
 * tree, a few kilobytes.
 *
 * These credentials are a bucket's full read and write access. They are server
 * secrets, this module is marked server-only so an import into a client
 * component fails the build rather than shipping them to a browser, and no
 * object here is ever made publicly listable: the bucket stays private and
 * anything that needs to be shown is signed for, one object at a time.
 */

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET_NAME;

/** Whether uploads are configured. Reference images are optional, so a missing
 *  bucket must degrade to "no photographs" rather than failing the request. */
export function isStorageConfigured(): boolean {
  return Boolean(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && BUCKET);
}

let client: AwsClient | null = null;

function getClient(): AwsClient {
  if (!isStorageConfigured()) {
    throw new Error(
      "R2 is not configured. Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and " +
        "R2_BUCKET_NAME.",
    );
  }

  client ??= new AwsClient({
    accessKeyId: ACCESS_KEY_ID as string,
    secretAccessKey: SECRET_ACCESS_KEY as string,
    // R2 is region-less, but SigV4 requires a region in the signature and
    // "auto" is what Cloudflare expects.
    region: "auto",
    service: "s3",
  });

  return client;
}

function objectUrl(key: string): string {
  return `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}/${key}`;
}

/**
 * Stores one object and returns the key it was written under.
 *
 * The key is chosen by the caller, never by the uploader: a filename that came
 * from a browser is attacker-controlled, and letting it decide a path is how
 * an upload ends up somewhere it should not be.
 */
export async function putObject(
  key: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<string> {
  /*
   * Content-Length is set by hand.
   *
   * R2's S3 API refuses a PUT without one — HTTP 411 — and fetch will happily
   * send an ArrayBuffer with chunked encoding and no length. Passing a view
   * and stating the byte count keeps the request a plain, signed, fixed-length
   * upload.
   */
  const bytes = new Uint8Array(body);

  const response = await getClient().fetch(objectUrl(key), {
    method: "PUT",
    body: bytes,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(bytes.byteLength),
    },
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed for ${key}: HTTP ${response.status}`);
  }

  return key;
}

/** Removes one object. Used by the Phase 3 retention sweep, and to clean up
 *  after a submission that fails once its images are already stored. */
export async function deleteObject(key: string): Promise<void> {
  const response = await getClient().fetch(objectUrl(key), { method: "DELETE" });

  // 404 means the object is already gone, which is the desired end state.
  if (!response.ok && response.status !== 404) {
    throw new Error(`R2 delete failed for ${key}: HTTP ${response.status}`);
  }
}

/**
 * A time-limited URL for one object.
 *
 * The bucket is private, so this is how a reference photograph is ever shown —
 * a signed link to a single key that stops working. Nothing lists the bucket
 * and no key is guessable, so one customer cannot reach another's images.
 */
export async function signedObjectUrl(
  key: string,
  expiresInSeconds = 300,
): Promise<string> {
  const signed = await getClient().sign(
    new Request(`${objectUrl(key)}?X-Amz-Expires=${expiresInSeconds}`),
    { aws: { signQuery: true } },
  );

  return signed.url;
}
