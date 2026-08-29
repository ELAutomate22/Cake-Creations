"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Settings } from "@/lib/admin/settings";

/**
 * Editing the business settings.
 *
 * A placeholder in square brackets is shown as an empty field with the
 * placeholder as a hint, so the owner sees what is missing rather than being
 * asked to edit around "[EMAIL ADDRESS]".
 */

const FIELDS: {
  key: keyof Settings;
  label: string;
  hint?: string;
  type?: "text" | "number" | "textarea";
}[] = [
  {
    key: "default_deposit_percentage",
    label: "Default deposit (%)",
    hint: "Used for new quotes. Between 0 and 100.",
    type: "number",
  },
  {
    key: "default_quote_message",
    label: "Default quote message",
    hint: "Pre-filled when writing a quote. Editable each time.",
    type: "textarea",
  },
  { key: "business_email", label: "Business email" },
  { key: "business_phone", label: "Business phone" },
  { key: "business_phone_secondary", label: "Second phone" },
  { key: "collection_information", label: "Collection information", type: "textarea" },
  { key: "delivery_information", label: "Delivery information", type: "textarea" },
  {
    key: "email_footer",
    label: "Email footer",
    hint: "Appears at the bottom of every email sent to a customer.",
    type: "textarea",
  },
  {
    key: "policy_version",
    label: "Policy version",
    hint: "Recorded against each request, so you can tell what a customer agreed to.",
  },
];

const control =
  "w-full border border-espresso/20 bg-ivory px-3 py-2.5 text-sm text-cocoa outline-none focus:border-espresso";

function isPlaceholder(value: string | undefined): boolean {
  return Boolean(value && value.startsWith("[") && value.endsWith("]"));
}

export function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();

  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of FIELDS) {
      const value = settings[field.key];
      initial[field.key as string] = isPlaceholder(value) ? "" : (value ?? "");
    }
    return initial;
  });

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  return (
    <form
      className="mt-10 space-y-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setNotice(null);

        try {
          const response = await fetch("/api/admin/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
          });
          const body = (await response.json()) as { ok: boolean; message?: string };

          setNotice(
            body.ok
              ? { tone: "ok", text: "Settings saved." }
              : { tone: "bad", text: body.message ?? "Those settings could not be saved." },
          );

          if (body.ok) router.refresh();
        } catch {
          setNotice({ tone: "bad", text: "Could not reach the server." });
        } finally {
          setBusy(false);
        }
      }}
    >
      {notice && (
        <p
          role="status"
          className={`border px-4 py-3 text-sm ${
            notice.tone === "ok"
              ? "border-success/30 bg-success/5 text-success"
              : "border-danger/30 bg-danger/5 text-danger"
          }`}
        >
          {notice.text}
        </p>
      )}

      {FIELDS.map((field) => (
        <div key={field.key as string}>
          <label
            htmlFor={`setting-${field.key}`}
            className="text-[0.625rem] uppercase tracking-[0.16em] text-cocoa-soft"
          >
            {field.label}
          </label>
          {field.hint && <p className="mt-1 text-xs text-cocoa-soft">{field.hint}</p>}

          {field.type === "textarea" ? (
            <textarea
              id={`setting-${field.key}`}
              rows={3}
              value={values[field.key as string] ?? ""}
              placeholder={isPlaceholder(settings[field.key]) ? "Not set yet" : undefined}
              onChange={(event) =>
                setValues({ ...values, [field.key as string]: event.target.value })
              }
              className={`${control} mt-1.5 resize-y`}
            />
          ) : (
            <input
              id={`setting-${field.key}`}
              type={field.type === "number" ? "number" : "text"}
              inputMode={field.type === "number" ? "numeric" : undefined}
              value={values[field.key as string] ?? ""}
              placeholder={isPlaceholder(settings[field.key]) ? "Not set yet" : undefined}
              onChange={(event) =>
                setValues({ ...values, [field.key as string]: event.target.value })
              }
              className={`${control} mt-1.5`}
            />
          )}
        </div>
      ))}

      <button type="submit" disabled={busy} className="btn btn-solid py-2.5 text-xs disabled:opacity-50">
        {busy ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
