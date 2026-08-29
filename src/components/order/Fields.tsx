"use client";

import { useId } from "react";

/**
 * Form primitives for the cake request.
 *
 * These exist so every field on the form is labelled, described and marked
 * invalid the same way. Doing that per field, seven steps deep, is how a form
 * ends up with three inputs that are announced properly and twenty that are
 * not.
 *
 * Each control gets a generated id, its label is bound to it with `htmlFor`,
 * and any error is bound with `aria-describedby` and announced. Errors carry a
 * symbol as well as red text, so the message does not depend on seeing colour.
 */

export type FieldProps = {
  label: string;
  /** Sits under the label. Use it for anything the customer needs before typing. */
  hint?: string;
  error?: string;
  /** Every field on this form is required except the photographs. */
  optional?: boolean;
  children: (props: {
    id: string;
    describedBy: string | undefined;
    invalid: boolean;
  }) => React.ReactNode;
};

export function Field({ label, hint, error, optional, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div>
      <label htmlFor={id} className="eyebrow block text-cocoa-soft">
        {label}
        {optional && (
          <span className="ml-2 normal-case tracking-normal text-cocoa-soft/70">
            optional
          </span>
        )}
      </label>

      {hint && (
        <p id={hintId} className="mt-1.5 text-xs leading-relaxed text-cocoa-soft">
          {hint}
        </p>
      )}

      {children({ id, describedBy, invalid: Boolean(error) })}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 flex items-start gap-1.5 text-sm text-danger"
        >
          {/* Not colour alone: the mark carries the meaning too. */}
          <span aria-hidden="true">!</span>
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Shared control styling.
 *
 * `text-base` on purpose. iOS Safari zooms the page in when a focused input
 * has text below 16px, and the layout never quite recovers.
 */
export const controlClass =
  "mt-2 w-full border border-espresso/20 bg-ivory px-4 py-3.5 text-base text-cocoa outline-none transition-colors focus:border-espresso aria-[invalid=true]:border-danger";

export function TextInput({
  id,
  describedBy,
  invalid,
  ...props
}: {
  id: string;
  describedBy?: string;
  invalid: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      id={id}
      aria-describedby={describedBy}
      aria-invalid={invalid}
      className={controlClass}
      {...props}
    />
  );
}

export function TextArea({
  id,
  describedBy,
  invalid,
  ...props
}: {
  id: string;
  describedBy?: string;
  invalid: boolean;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      id={id}
      aria-describedby={describedBy}
      aria-invalid={invalid}
      rows={4}
      className={`${controlClass} resize-y`}
      {...props}
    />
  );
}

export function Select({
  id,
  describedBy,
  invalid,
  children,
  ...props
}: {
  id: string;
  describedBy?: string;
  invalid: boolean;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      id={id}
      aria-describedby={describedBy}
      aria-invalid={invalid}
      className={controlClass}
      {...props}
    >
      {children}
    </select>
  );
}

/**
 * A set of large tappable choices.
 *
 * Used instead of a dropdown where there are only a few options and the choice
 * changes what comes next — collection or delivery, personalised or classic.
 * A radio group states the choice outright rather than hiding it behind a tap.
 */
export function ChoiceGroup<T extends string>({
  legend,
  hint,
  error,
  value,
  options,
  onChange,
  name,
}: {
  legend: string;
  hint?: string;
  error?: string;
  value: T | "";
  options: readonly { value: T; label: string; description?: string }[];
  onChange: (value: T) => void;
  name: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <fieldset
      aria-describedby={error ? errorId : undefined}
      aria-invalid={error ? true : undefined}
    >
      <legend className="eyebrow text-cocoa-soft">{legend}</legend>

      {hint && (
        <p className="mt-1.5 text-xs leading-relaxed text-cocoa-soft">{hint}</p>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const checked = value === option.value;
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 border px-4 py-4 transition-colors ${
                checked
                  ? "border-espresso bg-vanilla"
                  : "border-espresso/20 hover:border-espresso/40"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="mt-1 h-4 w-4 shrink-0 accent-espresso"
              />
              <span>
                <span className="block text-base text-espresso">{option.label}</span>
                {option.description && (
                  <span className="mt-1 block text-sm text-cocoa-soft">
                    {option.description}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 flex items-start gap-1.5 text-sm text-danger"
        >
          <span aria-hidden="true">!</span>
          {error}
        </p>
      )}
    </fieldset>
  );
}
