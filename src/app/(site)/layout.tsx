import { SiteChrome } from "@/components/layout/SiteChrome";

/**
 * Wraps every page in the site furniture — header, footer and the shared
 * dialogs.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SiteChrome>{children}</SiteChrome>;
}
