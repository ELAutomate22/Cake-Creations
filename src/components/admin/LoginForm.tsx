"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="mt-8"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);

        try {
          const response = await fetch("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
          });
          const body = (await response.json()) as { ok: boolean; message?: string };

          if (!body.ok) {
            setError(body.message ?? "That password was not recognised.");
            setPassword("");
            return;
          }

          router.replace("/admin");
          router.refresh();
        } catch {
          setError("Could not sign in. Please check your connection.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor="admin-password" className="eyebrow block text-cocoa-soft">
        Password
      </label>
      <input
        id="admin-password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "admin-password-error" : undefined}
        className="mt-2 w-full border border-espresso/20 bg-ivory px-4 py-3.5 text-base text-cocoa outline-none focus:border-espresso"
      />

      {error && (
        <p id="admin-password-error" role="alert" className="mt-3 flex gap-1.5 text-sm text-danger">
          <span aria-hidden="true">!</span>
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn btn-solid mt-6 w-full disabled:opacity-50">
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
