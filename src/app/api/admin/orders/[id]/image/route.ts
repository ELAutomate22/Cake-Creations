import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { query } from "@/lib/d1/client";
import { signedObjectUrl } from "@/lib/r2/client";

/**
 * A short-lived link to one reference photograph.
 *
 * The bucket is private and nothing lists it. To view an image the owner asks
 * for it by its row id; the server looks up which object that row points at,
 * confirms it belongs to the order named in the path, and signs a link that
 * stops working after a few minutes.
 *
 * The R2 key never comes from the request. If it did, a crafted key would
 * reach any object in the bucket — including another customer's photographs.
 */

export const runtime = "nodejs";

const LINK_LIFETIME_SECONDS = 300;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const imageId = new URL(request.url).searchParams.get("image");

  if (!imageId) {
    return NextResponse.json({ ok: false, message: "No image named." }, { status: 400 });
  }

  // Both ids must match. Knowing an image id is not enough to fetch it from
  // under a different order.
  const { rows } = await query<{ r2_object_key: string }>(
    `SELECT r2_object_key FROM order_images WHERE id = ? AND order_id = ?`,
    [imageId, id],
  );

  const key = rows[0]?.r2_object_key;
  if (!key) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  try {
    const url = await signedObjectUrl(key, LINK_LIFETIME_SECONDS);
    return NextResponse.json({ ok: true, url, expiresIn: LINK_LIFETIME_SECONDS });
  } catch (error) {
    console.error("Signed link failed:", error);
    return NextResponse.json(
      { ok: false, message: "That image could not be opened." },
      { status: 500 },
    );
  }
}
