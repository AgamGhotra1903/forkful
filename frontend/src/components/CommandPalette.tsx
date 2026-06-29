import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { BiSearch, BiHomeAlt, BiShoppingBag, BiStore, BiCycling, BiShield, BiBrightnessHalf, BiLogOut } from "react-icons/bi";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { toggleDarkMode } = useAppData();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setQuery("");
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const items = [
    { label: "Go to Home", route: "/", icon: <BiHomeAlt /> },
    { label: "Go to Cart", route: "/cart", icon: <BiShoppingBag /> },
    { label: "Go to Seller Dashboard", route: "/restaurant", icon: <BiStore /> },
    { label: "Go to Rider Dashboard", route: "/rider", icon: <BiCycling /> },
    { label: "Go to Admin Operations", route: "/admin", icon: <BiShield /> },
    { label: "Toggle Theme (Light/Dark)", action: () => toggleDarkMode(), icon: <BiBrightnessHalf /> },
    { label: "Log Out / Reset Session", route: "/login?clear=true", icon: <BiLogOut />, danger: true },
  ];

  const filtered = items.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (item: typeof items[0]) => {
    setIsOpen(false);
    if (item.route) {
      navigate(item.route);
    } else if (item.action) {
      item.action();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="palette-title"
        >
          {/* Dimmer Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/50 cursor-pointer"
          />

          {/* Modal card itself */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={shouldReduceMotion ? { duration: 0.1 } : { type: "spring", stiffness: 300, damping: 28, delay: 0.05 }}
            className="relative w-full max-w-xl rounded-3xl overflow-hidden glass-panel border shadow-2xl flex flex-col z-10"
            style={{
              borderColor: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
        <span id="palette-title" className="sr-only">Command palette search</span>
        
        {/* Search header */}
        <div className="flex items-center gap-3 px-4 h-14 border-b" style={{ borderColor: "var(--color-rule)" }}>
          <BiSearch className="text-xl" style={{ color: "var(--color-manifest)" }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search page routes... (Esc to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-800 dark:text-slate-100"
            style={{ fontFamily: "var(--font-body)" }}
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
            ESC
          </kbd>
        </div>

        {/* Action list */}
        <div className="p-2 max-h-72 overflow-y-auto no-scrollbar">
          {filtered.length > 0 ? (
            filtered.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(item)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-xs font-bold text-left transition duration-150 active:scale-[0.99] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60`}
                style={{ color: item.danger ? "var(--color-alert)" : "var(--color-ink)" }}
              >
                <span className="text-base">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                <kbd className="text-[10px] font-mono text-slate-400">↵ Enter</kbd>
              </button>
            ))
          ) : (
            <p className="p-4 text-center text-xs text-slate-400">No commands matching query</p>
          )}
        </div>
      </motion.div>
    </div>
    )}
  </AnimatePresence>
  );
};
