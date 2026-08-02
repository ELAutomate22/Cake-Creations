"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { browserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signInError, setSignInError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * Explains why a signed-in account was turned away, rather than silently
   * bouncing them back to a form they have already filled in correctly.
   * Derived from the address bar rather than copied into state.
   */
  const notOwner = searchParams.get("error") === "not_owner";
  const error =
    signInError ??
    (notOwner
      ? "That account is signed in, but it is not registered as an owner of this website."
      : null);

  const emailId = useId();
  const passwordId = useId();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSignInError(null);
    setBusy(true);

    try {
      const supabase = browserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        // Deliberately vague: saying which of the two was wrong tells an
        // attacker whether an address is registered.
        setSignInError("Those details were not recognised. Please try again.");
        setBusy(false);
        return;
      }

      const next = searchParams.get("next");
      router.replace(next && next.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch {
      setSignInError("Could not sign in just now. Please check your connection.");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-10 border border-caramel/40 bg-vanilla p-7"
    >
      {error && (
        <p
          role="alert"
          className="mb-5 border-l-2 border-danger bg-danger/8 px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <div className="space-y-5">
        <div>
          <label
            htmlFor={emailId}
            className="mb-1 block text-[0.6875rem] uppercase tracking-[0.16em] text-cocoa-soft"
          >
            Email address
          </label>
          <input
            id={emailId}
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-caramel/50 bg-ivory px-4 py-3 text-[0.9375rem] text-espresso focus:border-plum focus:outline-none focus:ring-1 focus:ring-plum"
          />
        </div>

        <div>
          <label
            htmlFor={passwordId}
            className="mb-1 block text-[0.6875rem] uppercase tracking-[0.16em] text-cocoa-soft"
          >
            Password
          </label>
          <input
            id={passwordId}
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-caramel/50 bg-ivory px-4 py-3 text-[0.9375rem] text-espresso focus:border-plum focus:outline-none focus:ring-1 focus:ring-plum"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="mt-7 w-full bg-espresso px-8 py-4 text-sm uppercase tracking-[0.18em] text-ivory transition-colors hover:bg-plum disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
