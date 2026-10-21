"use client";

import { useState } from "react";

import { fromMinor, toMinor } from "@/lib/money";

import { TextInput } from "./ui";

/**
 * Amount input for merchants: they type "1,500.00", the form state holds minor
 * units (integer) exactly as the API expects. Invalid text is reported, never guessed.
 */
export function MoneyField({ label, value, onChange, error, currency, optional = false, hint, hideLabel }: { label: string; value: number | null; onChange: (minor: number | null) => void; error?: string; currency?: string; optional?: boolean; hint?: string; hideLabel?: boolean }) {
  const [text, setText] = useState(fromMinor(value));
  const [local, setLocal] = useState<string | undefined>();

  return (
    <TextInput
      label={currency ? `${label} (${currency})` : label}
      inputMode="decimal"
      value={text}
      placeholder={optional ? "Optional" : "0.00"}
      hint={hint}
      hideLabel={hideLabel}
      error={error ?? local}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);

        if (next.trim() === "") {
          setLocal(optional ? undefined : "Enter an amount");
          onChange(null);
          return;
        }

        const minor = toMinor(next);
        setLocal(minor === null ? "Use a number with up to 2 decimals, e.g. 1500.00" : undefined);
        if (minor !== null) onChange(minor);
      }}
      onBlur={() => {
        const minor = toMinor(text);
        if (minor !== null) setText(fromMinor(minor));
      }}
    />
  );
}
