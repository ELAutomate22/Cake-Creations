import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  isAdminConfigured,
  passwordMatches,
} from "@/lib/admin/auth";

/**
 * Signing in.
 *
 * Deliberately slow to answer and vague about why it refused. A login that
 * fails instantly on a wrong password and slowly on a right one tells an
 * attacker which half they got correct, and a message distinguishing "no such
 * password" from "wrong password" tells them the rest.
 */

export const runtime = "nodejs";

/** Rate limiting, in memory. Enough to make guessing at scale impractical. */
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

function clientKey(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    headers.get("x-real-ip")?.trim() ??
    "unknown"
  );
}

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "The admin area is not configured. Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET.",
      },
      { status: 503 },
    );
  }

  const key = clientKey(request.headers);
  const now = Date.now();
  const record = attempts.get(key);

  if (record && record.until > now && record.count >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts. Please wait and try again." },
      { status: 429 },
    );
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: string };
    password = String(body.password ?? "");
  } catch {
    // Falls through to the failure path below, which is deliberately identical
    // to a wrong password.
  }

  if (!passwordMatches(password)) {
    const next =
      record && record.until > now
        ? { count: record.count + 1, until: record.until }
        : { count: 1, until: now + WINDOW_MS };
    attempts.set(key, next);

    // A fixed delay on failure. Without it, the timing of the reply is itself
    // a signal about how far a guess got.
    await new Promise((resolve) => setTimeout(resolve, 600));

    return NextResponse.json(
      { ok: false, message: "That password was not recognised." },
      { status: 401 },
    );
  }

  attempts.delete(key);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}
