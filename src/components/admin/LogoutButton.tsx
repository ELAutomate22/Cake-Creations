"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/admin/logout", { method: "POST" });
        // replace, not push: the signed-in pages should not be reachable with
        // the back button after signing out.
        router.replace("/admin/login");
        router.refresh();
      }}
      className="text-[0.8125rem] text-cocoa-soft transition-colors hover:text-espresso disabled:opacity-50"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
