import { NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "node:crypto";
import { runPurge } from "@/lib/admin/purge";

/**
 * The scheduled retention sweep.
 *
 * Deletes personal data, so it is not left open to whoever finds the URL. It
 * needs a shared secret, compared in constant time, and it accepts nothing
 * else — no order id, no date, no override of the retention window. There is
 * no way to ask this endpoint to delete something in particular.
 *
 * Run by the Netlify scheduled function in netlify/functions/purge.mts. The
 * spec asked for a Cloudflare Cron Trigger, but this site is hosted on
 * Netlify and has no Worker to attach one to; the schedule lives where the
 * application actually runs.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorised(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const provided =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer /i, "") ??
    "";

  // Hashed first so the comparison is over equal-length buffers: the length of
  // a secret should not be readable from how the comparison behaves.
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(provided), digest(expected));
}

export async function POST(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const result = await runPurge();

    // Counts only. Never which orders, never whose.
    console.log(
      `Retention sweep: ${result.ordersPurged} order(s), ${result.imagesPurged} image(s), ${result.failures} failure(s).`,
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Retention sweep failed:", error);
    return NextResponse.json(
      { ok: false, message: "The sweep failed and will retry on the next run." },
      { status: 500 },
    );
  }
}
