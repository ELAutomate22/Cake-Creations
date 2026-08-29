import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  // Cleared rather than left to expire, so signing out on a shared machine
  // actually ends the session.
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
