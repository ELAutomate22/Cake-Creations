import { redirect } from "next/navigation";
import { sessionClient } from "@/lib/supabase/server";
import type { OwnerReview } from "@/lib/reviews/types";

/**
 * Owner authorisation.
 *
 * Being signed in is not the same as being the owner. Anyone with a Supabase
 * account on this project is "authenticated"; only an address listed in the
 * `cake_admins` table is the owner.
 *
 * The check that actually matters happens inside the database functions, which
 * refuse to return or change anything for a non-owner. What follows is the
 * layer that decides what the owner is *shown*.
 */

export type OwnerSession = {
  email: string;
};

/**
 * Requires a signed-in owner, or redirects.
 *
 * Ownership is proven by successfully reading through `admin_list_reviews`,
 * which raises for anyone who is not registered — so this cannot drift out of
 * step with what the database will actually permit.
 */
export async function requireOwner(): Promise<{
  session: OwnerSession;
  reviews: OwnerReview[];
}> {
  const supabase = await sessionClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data, error } = await supabase.rpc("admin_list_reviews");

  if (error) {
    // A signed-in account that is not registered as an owner is sent to the
    // login page with an explanation, rather than shown an empty dashboard
    // that suggests there are simply no reviews.
    if (error.message.includes("not_authorised")) {
      redirect("/admin/login?error=not_owner");
    }
    throw error;
  }

  return {
    session: { email: user.email ?? "" },
    reviews: (data ?? []) as OwnerReview[],
  };
}
