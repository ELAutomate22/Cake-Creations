import { SiteChrome } from "@/components/layout/SiteChrome";
import { getPublicContact } from "@/lib/site-settings";

/**
 * Wraps every page in the site furniture — header, footer and the shared
 * dialogs.
 *
 * The contact details are read here, on the server, and handed down as plain
 * data. Doing it once in the layout means the footer and the Contact dialog
 * cannot disagree with each other, and the pages underneath stay unaware that
 * any of it comes from a database.
 */
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SiteChrome contact={await getPublicContact()}>{children}</SiteChrome>;
}
