import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Owner area",
  // The owner area must never appear in search results.
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-ivory">{children}</div>;
}
