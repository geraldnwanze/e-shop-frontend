import type { SelectHTMLAttributes } from "react";

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function SelectField({ label, error, id, className = "", options, placeholder, ...props }: Props) {
  const fieldId = id ?? props.name;

  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium">{label}</label>
      <select
        id={fieldId}
        {...props}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={`sf-input w-full rounded-[var(--sf-radius)] border bg-white/70 px-3.5 py-2.5 text-sm text-black outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 ${error ? "border-red-500" : "border-black/20"}`}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error ? <p id={`${fieldId}-error`} role="alert" className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
