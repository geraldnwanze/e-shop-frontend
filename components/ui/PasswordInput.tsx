"use client";

import { useState, type InputHTMLAttributes } from "react";

const icon = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, className: "size-5" } as const;

/** A password box with an eye button that shows or hides what has been typed. Styling comes from `className`, like a plain input. */
export function PasswordInput({ className = "", ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`${className} !pr-11`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center text-current opacity-55 transition hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
      >
        {visible ? (
          <svg {...icon}><path d="M3 3l18 18" /><path d="M10.6 5.1A9.7 9.7 0 0112 5c5 0 8.5 4.2 9.5 7a10.6 10.6 0 01-2.7 3.9M6.6 6.7C4.5 8.2 3.1 10.3 2.5 12c1 2.8 4.5 7 9.5 7 1.6 0 3-.4 4.2-1" /><path d="M9.9 9.9a3 3 0 004.2 4.2" /></svg>
        ) : (
          <svg {...icon}><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7S2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></svg>
        )}
      </button>
    </div>
  );
}
