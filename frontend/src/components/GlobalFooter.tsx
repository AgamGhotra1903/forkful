import { useLocation } from "react-router-dom";

export const GlobalFooter = () => {
  const location = useLocation();

  if (location.pathname === "/login") {
    return null;
  }

  return (
    <footer
      className="w-full py-5 text-center"
      style={{
        borderTop: "1px solid var(--color-rule)",
        backgroundColor: "var(--bg-base)",
        position: "relative",
        zIndex: 10,
      }}
    >
      <p
        className="text-sm font-semibold"
        style={{ color: "var(--color-manifest)", fontFamily: "var(--font-body)" }}
      >
        Made with{" "}
        <span className="animate-pulse" style={{ color: "#FF5733" }}>♥</span>
        {" "}by{" "}
        <span
          className="font-black uppercase"
          style={{
            color: "var(--color-ink)",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.1em",
          }}
        >
          Agam Ghotra
        </span>
      </p>
      <p
        className="text-[11px] mt-1 font-mono"
        style={{ color: "var(--color-ghost)" }}
      >
        © 2026 Forkful · All rights reserved
      </p>
    </footer>
  );
};

export default GlobalFooter;
