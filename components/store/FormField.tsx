import type { InputHTMLAttributes } from "react";

import { PasswordInput } from "@/components/ui/PasswordInput";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function FormField({ label, error, id, className = "", ...props }: Props) {
  const fieldId = id ?? props.name;
  const inputClass = `sf-input w-full rounded-[var(--sf-radius)] border bg-white/70 px-3.5 py-2.5 text-sm text-black outline-none transition placeholder:text-black/40 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 ${error ? "border-red-500" : "border-black/20"}`;

  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {props.type === "password" ? <PasswordInput id={fieldId} {...props} aria-invalid={error ? true : undefined} aria-describedby={error ? `${fieldId}-error` : undefined} className={inputClass} /> : (
        <input
          id={fieldId}
          {...props}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          className={inputClass}
        />
      )}
      {error ? (
        <p id={`${fieldId}-error`} role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
