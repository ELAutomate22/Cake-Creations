import { redirect } from "next/navigation";
import { isAdminConfigured, isAdminRequest } from "@/lib/admin/auth";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata = { title: "Sign in" };

export default async function AdminLoginPage() {
  if (await isAdminRequest()) redirect("/admin");

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-20">
      <div className="w-full max-w-sm">
        <p className="eyebrow text-cocoa-soft">Elshadai Cake Creations</p>
        <h1 className="display-sm mt-4 text-espresso">Admin</h1>

        {isAdminConfigured() ? (
          <LoginForm />
        ) : (
          <p className="mt-8 border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
            The admin area is not configured. Set <code>ADMIN_PASSWORD</code> and{" "}
            <code>ADMIN_SESSION_SECRET</code>, then redeploy.
          </p>
        )}
      </div>
    </div>
  );
}
