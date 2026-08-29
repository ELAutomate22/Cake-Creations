import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/admin/auth";
import { getSettings } from "@/lib/admin/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  if (!(await isAdminRequest())) redirect("/admin/login");

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <h1 className="display-sm text-espresso">Settings</h1>
      <p className="mt-2 text-cocoa-soft">
        Business values the website reads rather than hard-codes. Changing the default
        deposit affects future quotes only — quotes already created keep the percentage
        they were made with.
      </p>

      <SettingsForm settings={await getSettings()} />
    </div>
  );
}
