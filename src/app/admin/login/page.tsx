import { Suspense } from "react";
import { LoginForm } from "./LoginForm";
import { Wordmark } from "@/components/ui/Wordmark";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-[24rem]">
        <div className="text-center">
          <Wordmark className="text-espresso" />
          <p className="mt-8 text-[0.6875rem] uppercase tracking-[0.22em] text-plum">
            Owner area
          </p>
          <h1 className="mt-3 font-serif text-3xl text-espresso">Sign in</h1>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
