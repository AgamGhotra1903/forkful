import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useReducedMotion } from "framer-motion";
import ForkfulLogo from "../components/ForkfulLogo";

const Navbar = () => {
  const { isAuth, city, quantity, user, darkMode, toggleDarkMode } = useAppData();
  const location = useLocation();
  const navigate = useNavigate();
  const headerRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Scroll-aware blur interpolation
  const { scrollY } = useScroll();
  const opacityVal = useTransform(scrollY, [0, 80], [0, 0.94]);
  const smoothOpacity = useSpring(opacityVal, { stiffness: 300, damping: 30 });
  const blurRadius = useTransform(scrollY, [0, 80], [0, 20]);
  const smoothBlurRadius = useSpring(blurRadius, { stiffness: 300, damping: 30 });
  const smoothBlur = useTransform(smoothBlurRadius, (v) => `blur(${v}px)`);
  const bgStyle = useTransform(smoothOpacity, (o) => darkMode ? `rgba(10,10,11,${o})` : `rgba(255,255,255,${o})`);

  // Cart badge ring-pulse on quantity increase
  const prevQuantityRef = useRef(quantity);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (quantity > prevQuantityRef.current) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 800);
      return () => clearTimeout(timer);
    }
    prevQuantityRef.current = quantity;
  }, [quantity]);

  // Hide Navbar on login, select-role, or when authenticated user doesn't have a role yet
  if (
    location.pathname === "/login" ||
    location.pathname === "/select-role" ||
    (isAuth && !user?.role)
  ) {
    return null;
  }

  const isOrderPage = location.pathname.startsWith("/order/");

  const initials = user?.name
    ?.split(" ")
    .slice(0, 2)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase() ?? "U";

  // Role badge
  const roleBadge = user?.role
    ? { customer: "CUSTOMER", seller: "SELLER", rider: "RIDER" }[user.role as string]
    : null;
  const roleBadgeColor: Record<string, string> = {
    customer: "rgba(255,87,51,0.18)",
    seller:   "rgba(34,197,94,0.15)",
    rider:    "rgba(245,158,11,0.15)",
  };
  const roleBadgeText: Record<string, string> = {
    customer: "#FF5733",
    seller:   "#22c55e",
    rider:    "#f59e0b",
  };

  // Scroll handler: shrink navbar on scroll
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const handleScroll = () => {
      if (!headerRef.current) return;
      if (window.scrollY > 60) {
        headerRef.current.classList.add("scrolled");
      } else {
        headerRef.current.classList.remove("scrolled");
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <>
      {/* Spacer so content isn't hidden behind fixed nav */}
      <div className="h-[72px]" aria-hidden="true" />

      <motion.header
        ref={headerRef as any}
        className="navbar-floating"
        aria-label="Main navigation"
        style={{
          backdropFilter: smoothBlur,
          WebkitBackdropFilter: smoothBlur,
          backgroundColor: bgStyle,
          background: darkMode
            ? "linear-gradient(180deg, rgba(11,15,25,0.82) 0%, rgba(11,15,25,0.72) 100%)"
            : "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.78) 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.09), 0 1px 0 rgba(0,0,0,0.12)",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0, borderRadius: "inherit",
            background: "linear-gradient(90deg, rgba(255,87,51,0.06) 0%, transparent 60%)",
            pointerEvents: "none",
          }}
        />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">

            {/* ── Wordmark ── */}
            <Link to="/" className="flex items-center gap-2.5 select-none flex-shrink-0" aria-label="Forkful home">
              <ForkfulLogo size={38} dark={darkMode} />
              <span style={{ fontFamily: "var(--font-display, system-ui)", fontWeight: 800, letterSpacing: "-0.04em", fontSize: "1.15rem", lineHeight: 1 }}>
                <span style={{ color: darkMode ? "#F0EEE9" : "#111111" }}>Fork</span>
                <span style={{
                  color: darkMode ? "#FF6B45" : "#FF5733",
                  textShadow: darkMode ? "0 0 20px rgba(255, 107, 69, 0.4)" : "none"
                }}>ful</span>
              </span>
            </Link>

            {/* ── Role badge ── */}
            {roleBadge && (
              <span
                className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase"
                style={{
                  backgroundColor: roleBadgeColor[user?.role as string] ?? "rgba(255,87,51,0.1)",
                  color:           roleBadgeText[user?.role as string]  ?? "#FF5733",
                }}
              >
                {roleBadge}
              </span>
            )}

            {/* ── Location pill ── */}
            {!isOrderPage && city && (
              <button
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
                style={{
                  backgroundColor: "rgba(255,255,255,0.04)",
                  color: "var(--color-ink)",
                  border: "1px solid var(--color-rule)",
                  maxWidth: 200,
                  transition: "background 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.borderColor = "rgba(255,87,51,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.borderColor = "var(--color-rule)";
                }}
                onClick={() => navigate("/")}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FF5733" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="truncate" style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", fontWeight: 600 }}>
                  {city}
                </span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-manifest)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            )}

            {/* ── Right nav ── */}
            <div className="flex items-center gap-1 ml-auto">

              {/* AI Assistant — opens the merged widget in expanded mode */}
              {isAuth && (
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("forkful:open-ai", { detail: { expanded: true } }))}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold transition-all duration-150 relative overflow-visible"
                  style={{ color: "var(--color-manifest)", backgroundColor: "transparent", fontFamily: "var(--font-body)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  aria-label="Open AI shopping assistant"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 2l1.8 5.6L19 9l-5.2 1.4L12 16l-1.8-5.6L5 9l5.2-1.4L12 2z" />
                  </svg>
                  <span className="hidden sm:inline">AI Assistant</span>
                </button>
              )}

              {/* Orders */}
              {isAuth && (
                <Link
                  to="/orders"
                  className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold transition-all duration-150 relative overflow-visible"
                  style={{
                    color: isActive("/orders") ? "#FF5733" : "var(--color-manifest)",
                    backgroundColor: isActive("/orders") ? "rgba(255,87,51,0.1)" : "transparent",
                    fontFamily: "var(--font-body)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive("/orders")) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive("/orders")) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                  aria-label="Your orders"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2H5a2 2 0 012-2h11" />
                  </svg>
                  <span className={`hidden sm:inline ${isActive("/orders") ? "text-gradient-orange" : ""}`}>
                    Orders
                  </span>
                  <AnimatePresence>
                    {isActive("/orders") && (
                      <motion.div
                        layoutId="nav-underline"
                        className="absolute bottom-0 left-3 right-3 h-0.5"
                        style={{ backgroundColor: "#FF5733", borderRadius: "1px" }}
                        transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                  </AnimatePresence>
                </Link>
              )}

              {/* Cart */}
              {isAuth && (
                <motion.div
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.94, transition: { type: "spring", stiffness: 500, damping: 20 } }}
                  transition={{ type: "spring", stiffness: 380, damping: 22 }}
                >
                  <Link
                    to="/cart"
                    className="relative flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold transition-all duration-150 overflow-visible w-full"
                    style={{
                      color: quantity > 0 ? "white" : "var(--color-ink)",
                      background: quantity > 0 ? "linear-gradient(135deg, #FF5733, #c0392b)" : "rgba(255,255,255,0.05)",
                      border: quantity > 0 ? "none" : "1px solid var(--color-rule)",
                      boxShadow: quantity > 0 ? "0 4px 14px rgba(255,87,51,0.4)" : "none",
                      fontFamily: "var(--font-body)",
                    }}
                    aria-label={`Cart, ${quantity} items`}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="9" cy="21" r="1" />
                      <circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.99-1.74L23 6H6" />
                    </svg>
                    {quantity > 0 ? (
                      <div className="relative">
                        <motion.span
                          key={quantity}
                          initial={{ scale: 1.7, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 420, damping: 16 }}
                          className="font-bold text-xs glow-orange rounded-full"
                          style={{
                            fontFamily: "var(--font-display)",
                            display: "inline-block",
                            boxShadow: "0 0 0 2px rgba(255,87,51,0.3)"
                          }}
                        >
                          {quantity}
                        </motion.span>
                        {pulse && (
                          <motion.span
                            initial={{ scale: 1, opacity: 0.7 }}
                            animate={{ scale: 2.2, opacity: 0 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className="absolute inset-0 rounded-full pointer-events-none"
                            style={{
                              boxShadow: "0 0 12px 6px #FF5733",
                              zIndex: -1
                            }}
                          />
                        )}
                      </div>
                    ) : (
                      <span className={`hidden sm:inline font-medium ${isActive("/cart") ? "text-gradient-orange" : ""}`}>
                        Cart
                      </span>
                    )}
                    <AnimatePresence>
                      {isActive("/cart") && quantity === 0 && (
                        <motion.div
                          layoutId="nav-underline"
                          className="absolute bottom-0 left-3 right-3 h-0.5"
                          style={{ backgroundColor: "#FF5733", borderRadius: "1px" }}
                          transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 350, damping: 30 }}
                        />
                      )}
                    </AnimatePresence>
                  </Link>
                </motion.div>
              )}

              {/* Theme Toggle */}
              <button
                onClick={toggleDarkMode}
                className="flex items-center justify-center h-9 active:scale-95 transition-all duration-200 cursor-pointer ml-1"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid var(--color-rule)",
                  borderRadius: "var(--radius-pill)",
                  padding: "6px 10px",
                  color: "var(--color-ink)",
                  transition: "background 0.2s, border-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,87,51,0.1)";
                  e.currentTarget.style.borderColor = "rgba(255,87,51,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.borderColor = "var(--color-rule)";
                }}
                aria-label="Toggle theme"
                title="Toggle theme"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {darkMode ? (
                    <motion.svg
                      key="sun"
                      initial={shouldReduceMotion ? { opacity: 0 } : { rotate: -90, scale: 0.5, opacity: 0 }}
                      animate={{ rotate: 0, scale: 1, opacity: 1 }}
                      exit={shouldReduceMotion ? { opacity: 0 } : { rotate: 90, scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.35 }}
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="4"/>
                      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
                    </motion.svg>
                  ) : (
                    <motion.svg
                      key="moon"
                      initial={shouldReduceMotion ? { opacity: 0 } : { rotate: -90, scale: 0.5, opacity: 0 }}
                      animate={{ rotate: 0, scale: 1, opacity: 1 }}
                      exit={shouldReduceMotion ? { opacity: 0 } : { rotate: 90, scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.35 }}
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
                    </motion.svg>
                  )}
                </AnimatePresence>
              </button>

              {/* Account / Sign in */}
              {isAuth ? (
                <Link
                  to="/account"
                  className="flex items-center justify-center h-9 w-9 rounded-full transition-all duration-150 ml-1"
                  style={{
                    background: "linear-gradient(135deg, #FF5733 0%, #FF824D 100%)",
                    boxShadow: "0 4px 14px rgba(255,87,51,0.45)",
                    minWidth: 36,
                  }}
                  aria-label={`Account: ${user?.name}`}
                  title={user?.name}
                >
                  <span className="text-sm font-black text-white gradient-border" style={{ fontFamily: "var(--font-display)" }} title={user?.name}>
                    {initials}
                  </span>
                </Link>
              ) : (
                <Link
                  to="/Login"
                  className="btn-primary px-4 h-9 flex items-center text-xs rounded-xl ml-1"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Sign in
                </Link>
              )}
          </div>
        </div>
      </div>
    </motion.header>
    </>
  );
};

export default Navbar;
