import type { Metadata } from "next";
import Link from "next/link";
import { isAdminRequest } from "@/lib/admin/auth";
import { LogoutButton } from "@/components/admin/LogoutButton";

/**
 * The admin area.
 *
 * Outside the (site) route group, so it inherits none of the public chrome:
 * no header, no footer, no scroll choreography. This is a tool, and it should
 * look like one — the decorative work on the public site would be in the way.
 *
 * `noindex` and the absence of any public link are hygiene, not security.
 * What actually protects this is that every page and every endpoint under it
 * checks the session server-side.
 */

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s — Elshadai Admin" },
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const signedIn = await isAdminRequest();

  return (
    <div className="min-h-screen bg-ivory">
      {signedIn && (
        <header className="border-b border-espresso/12 bg-vanilla">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4 sm:px-8">
            <Link href="/admin" className="font-serif text-lg text-espresso">
              Elshadai <span className="text-cocoa-soft">Admin</span>
            </Link>

            <nav aria-label="Admin" className="flex gap-6">
              <Link
                href="/admin"
                className="text-[0.8125rem] uppercase tracking-[0.14em] text-cocoa transition-colors hover:text-espresso"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/orders"
                className="text-[0.8125rem] uppercase tracking-[0.14em] text-cocoa transition-colors hover:text-espresso"
              >
                Orders
              </Link>
              <Link
                href="/admin/settings"
                className="text-[0.8125rem] uppercase tracking-[0.14em] text-cocoa transition-colors hover:text-espresso"
              >
                Settings
              </Link>
            </nav>

            <div className="ml-auto flex items-center gap-5">
              <Link
                href="/"
                target="_blank"
                className="text-[0.8125rem] text-cocoa-soft transition-colors hover:text-espresso"
              >
                View site
              </Link>
              <LogoutButton />
            </div>
          </div>
        </header>
      )}

      <main>{children}</main>
    </div>
  );
}
