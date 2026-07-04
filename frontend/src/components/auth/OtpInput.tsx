// components/auth/OtpInput.tsx
// Six-box OTP entry with auto-advance, backspace-to-previous, and paste support.

import { useRef, useEffect } from "react";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  disabled?: boolean;
}

export const OtpInput = ({ length = 6, value, onChange, onComplete, disabled = false }: OtpInputProps) => {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  useEffect(() => {
    if (value.length === length) onComplete?.(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const setDigit = (index: number, char: string) => {
    const next = digits.slice();
    next[index] = char;
    const joined = next.join("").slice(0, length);
    onChange(joined);
  };

  const handleChange = (index: number, raw: string) => {
    const char = raw.replace(/\D/g, "").slice(-1);
    setDigit(index, char);
    if (char && index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < length - 1) refs.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    const focusIndex = Math.min(pasted.length, length - 1);
    refs.current[focusIndex]?.focus();
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="text-center font-black outline-none transition-all duration-150 disabled:opacity-40"
          style={{
            width: "44px",
            height: "54px",
            fontSize: "1.35rem",
            borderRadius: "14px",
            background: digit ? "rgba(255,87,51,0.08)" : "rgba(255,255,255,0.03)",
            border: `1.5px solid ${digit ? "var(--color-route)" : "var(--color-rule)"}`,
            color: "var(--color-ink)",
            fontFamily: "var(--font-mono, monospace)",
            boxShadow: digit ? "0 0 0 3px rgba(255,87,51,0.12)" : "inset 0 2px 4px rgba(0,0,0,0.04)",
            caretColor: "var(--color-route)",
          }}
        />
      ))}
    </div>
  );
};

export default OtpInput;
