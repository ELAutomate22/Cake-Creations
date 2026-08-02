import { requireOwner } from "@/lib/admin/auth";
import { AdminDashboard } from "./AdminDashboard";

/** Never cached — the owner must always see the current state of the reviews. */
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Redirects anyone who is not a registered owner.
  const { session, reviews } = await requireOwner();

  return <AdminDashboard email={session.email} reviews={reviews} />;
}
