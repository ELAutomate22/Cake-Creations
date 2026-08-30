import { NextResponse } from "next/server";
import { SESSION_COOKIE, endAllSessions } from "@/lib/admin/auth";

/**
 * Signing out.
 *
 * Two things happen, and both matter. The cookie is cleared, so this browser
 * forgets the session. And the marker every token is signed against is
 * changed, so a copy of that cookie taken beforehand — on another machine, in
 * a browser left open somewhere — stops working too.
 *
 * The cookie is cleared even if the second part fails. A sign-out that refuses
 * to sign you out of the machine in front of you, because a database was
 * briefly unreachable, would be the worse outcome; the response says plainly
 * what happened so it can be done again.
 */

export const runtime = "nodejs";

export async function POST() {
  let everywhere = true;

  try {
    await endAllSessions();
  } catch (error) {
    everywhere = false;
    console.error("Could not end sessions on other devices:", error);
  }

  const response = NextResponse.json(
    everywhere
      ? { ok: true, message: "Signed out." }
      : {
          ok: true,
          message:
            "Signed out on this device. Other devices could not be signed out — " +
            "try again in a moment.",
        },
  );

  // Cleared rather than left to expire, so signing out on a shared machine
  // actually ends the session.
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
