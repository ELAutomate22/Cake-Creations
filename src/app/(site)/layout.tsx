import { SiteChrome } from "@/components/layout/SiteChrome";

/**
 * Wraps every public page in the site furniture — header, footer, opening
 * sequence and the shared dialogs.
 *
 * The /admin area sits outside this group, so it gets none of it.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SiteChrome>{children}</SiteChrome>;
}
