import React from "react";

interface ForkfulLogoProps {
  size?: number;
  dark?: boolean;
}

const ForkfulLogo: React.FC<ForkfulLogoProps> = ({ size = 36, dark = false }) => {
  const gradId = `forkful-grad-${size}-${dark ? "d" : "l"}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={dark ? "#FF7040" : "#FF6535"} />
          <stop offset="100%" stopColor={dark ? "#C03010" : "#A82A08"} />
        </linearGradient>
      </defs>

      {/* Tile */}
      <rect width="40" height="40" rx="9" fill={`url(#${gradId})`} />

      {/* Left tine */}
      <line x1="13" y1="7" x2="13" y2="20" stroke="white" strokeWidth="3" strokeLinecap="round" />
      {/* Center tine */}
      <line x1="20" y1="7" x2="20" y2="20" stroke="white" strokeWidth="3" strokeLinecap="round" />
      {/* Right tine */}
      <line x1="27" y1="7" x2="27" y2="20" stroke="white" strokeWidth="3" strokeLinecap="round" />

      {/* Crossbar */}
      <line x1="13" y1="20" x2="27" y2="20" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />

      {/* Left neck curve to handle */}
      <path d="M13 20 C13 28 20 29 20 31" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Right neck curve to handle */}
      <path d="M27 20 C27 28 20 29 20 31" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />

      {/* Handle */}
      <line x1="20" y1="31" x2="20" y2="35" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
};

export default ForkfulLogo;
