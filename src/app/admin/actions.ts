"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sessionClient } from "@/lib/supabase/server";

/**
 * Owner actions.
 *
 * Every one of these calls a database function that re-checks ownership for
 * itself. Nothing here is protected merely by the button being hidden — a
 * forged request from a signed-out or non-owner account is refused by the
 * database, not by this file.
 */

type ActionResult = { ok: true } | { ok: false; error: string };

/** Maps a database error onto something worth reading. */
function describe(message: string): string {
  if (message.includes("not_authorised")) {
    return "You are not signed in as the owner. Please sign in again.";
  }
  if (message.includes("review_not_found")) {
    return "That review no longer exists. It may already have been deleted.";
  }
  if (message.includes("response_too_long")) {
    return "Replies must be 1000 characters or fewer.";
  }
  return "That could not be completed. Please try again.";
}

/** Refreshes both the dashboard and the public pages the change affects. */
function refreshAffectedPages() {
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function setVisibility(
  id: string,
  visible: boolean,
): Promise<ActionResult> {
  const supabase = await sessionClient();

  const { error } = await supabase.rpc("admin_set_review_visibility", {
    p_id: id,
    p_visible: visible,
  });

  if (error) return { ok: false, error: describe(error.message) };

  refreshAffectedPages();
  return { ok: true };
}

export async function deleteReview(id: string): Promise<ActionResult> {
  const supabase = await sessionClient();

  const { error } = await supabase.rpc("admin_delete_review", { p_id: id });

  if (error) return { ok: false, error: describe(error.message) };

  refreshAffectedPages();
  return { ok: true };
}

export async function setResponse(
  id: string,
  response: string,
): Promise<ActionResult> {
  const supabase = await sessionClient();

  const { error } = await supabase.rpc("admin_set_review_response", {
    p_id: id,
    // An empty string removes the reply. The database handles that case.
    p_response: response,
  });

  if (error) return { ok: false, error: describe(error.message) };

  refreshAffectedPages();
  return { ok: true };
}

export async function signOut() {
  const supabase = await sessionClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
