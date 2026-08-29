import Link from "next/link";
import { business } from "@/content/site";

/**
 * Shown for any link that cannot be used.
 *
 * Deliberately the same message whether the token is unknown, revoked or
 * expired. Telling the difference would let someone testing tokens learn which
 * ones once existed, and it makes no difference to a real customer — in every
 * case the answer is to get in touch.
 */
export function LinkExpired() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ivory px-5 py-20">
      <div className="w-full max-w-md text-center">
        <p className="eyebrow text-cocoa-soft">{business.name}</p>
        <h1 className="display-sm mt-4 text-espresso">This link is no longer valid</h1>
        <p className="voice mt-5 text-cocoa">
          It may have expired, or been replaced by a newer one. Please get in touch and
          we will send you an up-to-date link.
        </p>
        <Link href="/" className="btn btn-outline mt-8 inline-block">
          Back to the site
        </Link>
      </div>
    </main>
  );
}
