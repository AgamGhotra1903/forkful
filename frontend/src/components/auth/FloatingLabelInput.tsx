// components/auth/FloatingLabelInput.tsx
// Input with floating label animation + optional password toggle

import { useState } from "react";

interface FloatingLabelInputProps {
  id: string;
  label: string;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoComplete?: string;
  showToggle?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export const FloatingLabelInput = ({
  id,
  label,
  type = "text",
  value,
  onChange,
  required,
  autoComplete,
  showToggle = false,
  placeholder = " ",
  disabled = false,
}: FloatingLabelInputProps) => {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const isFilled = value.length > 0;
  const isFloating = focused || isFilled;

  return (
    <div className="input-float-label relative w-full">
      <input
        id={id}
        type={showToggle && showPw ? "text" : type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full h-14 px-4 rounded-2xl text-sm outline-none transition-all duration-200 peer"
        style={{
          paddingTop: "22px",
          paddingBottom: "6px",
          background: focused
            ? "rgba(255,255,255,0.07)"
            : "rgba(255,255,255,0.03)",
          border: `1.5px solid ${focused ? "#FF5733" : "var(--color-rule)"}`,
          boxShadow: focused
            ? "0 0 0 3px rgba(255,87,51,0.12), inset 0 2px 4px rgba(0,0,0,0.04)"
            : "none",
          color: "var(--color-ink)",
          fontFamily: "var(--font-body)",
          paddingRight: showToggle ? "3rem" : "1rem",
          transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
        }}
      />

      {/* Floating label */}
      <label
        htmlFor={id}
        style={{
          position: "absolute",
          left: "1rem",
          top: isFloating ? "6px" : "50%",
          transform: isFloating ? "translateY(0) scale(0.78)" : "translateY(-50%) scale(1)",
          transformOrigin: "left top",
          transition: "all 0.18s cubic-bezier(0.4,0,0.2,1)",
          pointerEvents: "none",
          color: focused ? "#FF5733" : "var(--color-ghost)",
          fontWeight: 600,
          fontSize: "0.875rem",
          fontFamily: "var(--font-body)",
          letterSpacing: isFloating ? "0.04em" : "0",
          lineHeight: 1,
        }}
      >
        {label}
      </label>

      {/* Password toggle */}
      {showToggle && (
        <button
          type="button"
          onClick={() => setShowPw((p) => !p)}
          className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center transition-opacity hover:opacity-80"
          style={{ color: "var(--color-ghost)" }}
          aria-label={showPw ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {showPw ? (
            /* eye-off */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            /* eye */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
};

export default FloatingLabelInput;
