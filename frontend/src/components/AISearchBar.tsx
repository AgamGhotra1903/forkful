import { useState, useRef } from "react";
import { BiSearch } from "react-icons/bi";

interface AISearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const AISearchBar = ({ value, onChange, placeholder = "Search…" }: AISearchBarProps) => {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = [
    "Pizza near me",
    "Biryani",
    "Burger",
    "South Indian",
    "Chinese",
    "Desserts",
  ];

  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div
      className="relative"
      role="search"
    >
      <div
        className="flex items-center gap-3 px-4 h-12 rounded-2xl transition-all duration-200"
        style={{
          backgroundColor: focused ? "white" : "var(--color-receipt)",
          border: `1.5px solid ${focused ? "var(--color-route)" : "var(--color-rule)"}`,
          boxShadow: focused ? "0 0 0 3px rgba(234,88,12,0.08)" : "none",
        }}
      >
        {/* Search icon */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-manifest)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="flex-shrink-0"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>

        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 bg-transparent outline-none text-sm"
          style={{
            color: "var(--color-ink)",
            fontFamily: "var(--font-body)",
          }}
          aria-label="Search restaurants or dishes"
          id="search-input"
          autoComplete="off"
        />

        {/* Clear button */}
        {value && (
          <button
            onClick={handleClear}
            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: "var(--color-manifest)", color: "white" }}
            aria-label="Clear search"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}


      </div>

      {/* Focus-triggered search history floating dropdown */}
      {focused && (
        <div
          className="absolute top-full left-0 right-0 mt-2 p-4 rounded-2xl shadow-xl z-50 glass-card border animate-fade-in text-left"
          style={{ borderColor: "var(--color-rule)" }}
        >
          <p className="text-[10px] font-mono tracking-widest uppercase font-bold text-slate-400 mb-2.5">Recent Searches</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onMouseDown={() => onChange(s)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer"
                style={{
                  backgroundColor: "var(--color-muted)",
                  border: "1px solid var(--color-rule)",
                  color: "var(--color-ink)",
                }}
              >
                <BiSearch className="inline mr-1 text-slate-400" /> {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AISearchBar;
