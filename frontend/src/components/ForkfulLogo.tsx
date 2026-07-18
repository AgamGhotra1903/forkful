/**
 * ForkfulLogo.tsx — Single source logo used across every page.
 *
 * Variants:
 *   default        → orange gradient tile + white fork (dark/light bg sensitive)
 *   mono=true      → B&W tile + white fork — for admin/dev portals
 *   bare=true      → transparent background, orange fork strokes — for navbars & inline use
 */

import React from "react";

interface ForkfulLogoProps {
  size?: number;
  dark?: boolean;
  /** mono: B&W tile — for admin/dev screens */
  mono?: boolean;
  /** bare: no tile background, orange fork on transparent — for navbars */
  bare?: boolean;
  className?: string;
}

const ForkfulLogo: React.FC<ForkfulLogoProps> = ({
  size = 36,
  dark = false,
  mono = false,
  bare = false,
  className,
}) => {
  const gradId = `fl-g-${size}-${dark ? "d" : "l"}`;

  // ── Bare mode: transparent bg, orange strokes (navbar, login header) ──────
  if (bare) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className={className}
        style={{ display: "block", flexShrink: 0 }}
      >
        <line x1="13" y1="6" x2="13" y2="19" stroke="#FF5733" strokeWidth="3" strokeLinecap="round" />
        <line x1="20" y1="6" x2="20" y2="19" stroke="#FF5733" strokeWidth="3" strokeLinecap="round" />
        <line x1="27" y1="6" x2="27" y2="19" stroke="#FF5733" strokeWidth="3" strokeLinecap="round" />
        <line x1="13" y1="19" x2="27" y2="19" stroke="#FF5733" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        <path d="M13 19 C13 27 20 28 20 30" stroke="#FF5733" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M27 19 C27 27 20 28 20 30" stroke="#FF5733" strokeWidth="3" strokeLinecap="round" fill="none" />
        <line x1="20" y1="30" x2="20" y2="34" stroke="#FF5733" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  // ── Mono mode: B&W tile ───────────────────────────────────────────────────
  if (mono) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className={className}
        style={{ display: "block", flexShrink: 0 }}
      >
        <rect width="40" height="40" rx="9" fill={dark ? "rgba(255,255,255,0.14)" : "#0F172A"} />
        <line x1="13" y1="7" x2="13" y2="20" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <line x1="20" y1="7" x2="20" y2="20" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <line x1="27" y1="7" x2="27" y2="20" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <line x1="13" y1="20" x2="27" y2="20" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
        <path d="M13 20 C13 28 20 29 20 31" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M27 20 C27 28 20 29 20 31" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
        <line x1="20" y1="31" x2="20" y2="35" stroke="white" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  // ── Default: orange gradient tile ─────────────────────────────────────────
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF6B45" />
          <stop offset="100%" stopColor="#E03A10" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="9" fill={`url(#${gradId})`} />
      <line x1="13" y1="7" x2="13" y2="20" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <line x1="20" y1="7" x2="20" y2="20" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <line x1="27" y1="7" x2="27" y2="20" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <line x1="13" y1="20" x2="27" y2="20" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <path d="M13 20 C13 28 20 29 20 31" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M27 20 C27 28 20 29 20 31" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
      <line x1="20" y1="31" x2="20" y2="35" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
};

export default ForkfulLogo;
