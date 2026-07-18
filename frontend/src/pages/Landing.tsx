import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import ForkfulLogo from "../components/ForkfulLogo";

/* ─────────────────────────────────────────────────────────────────────────────
   FORKFUL LANDING — Premium Futuristic Redesign
   Palette: near-black base · white text · single accent (#FF5733 Forkful orange)
   used sparingly on CTAs and 1–2 key moments only.
   Unified with premium HSL dark-first glassmorphic system.
   ───────────────────────────────────────────────────────────────────────────── */

// Interactive Live Tracker Mock Component
const InteractiveTrackerMock = () => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Preparing your meal...");

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 1;
        if (next > 100) return 0;
        return next;
      });
    }, 120);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress < 25) {
      setStatus("Preparing your meal...");
    } else if (progress < 80) {
      setStatus("Rider is picking up...");
    } else {
      setStatus("Arriving at your door!");
    }
  }, [progress]);

  // Calculate rider position along a curved route path
  const riderX = 50 + (250 - 50) * (progress / 100);
  // Quadratic curve Y coordinate
  const riderY = 220 - Math.sin((progress / 100) * Math.PI) * 60;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="relative w-[300px] h-[550px] rounded-[36px] border-[5px] border-slate-800 bg-[#0B0F19] shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(255,87,51,0.15)] overflow-hidden flex flex-col select-none"
    >
      {/* Phone Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-800 rounded-b-xl z-30 flex items-center justify-center">
        <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700/50" />
      </div>

      {/* Simulated Live Map Viewport */}
      <div className="flex-1 relative overflow-hidden bg-[#0d1220]">
        <svg className="absolute inset-0 w-full h-full opacity-35" viewBox="0 0 300 350">
          {/* Decorative roads */}
          <path d="M 20 220 Q 150 160 280 220" stroke="rgba(255,255,255,0.07)" strokeWidth="10" fill="none" />
          <path d="M 50 60 L 50 310" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="none" />
          <path d="M 250 60 L 250 310" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="none" />
          
          {/* Active tracker route */}
          <path d="M 50 220 Q 150 160 250 220" stroke="rgba(255,87,51,0.15)" strokeWidth="4" fill="none" />
          <path 
            d="M 50 220 Q 150 160 250 220" 
            stroke="#FF5733" 
            strokeWidth="3.5" 
            strokeDasharray="5 7" 
            fill="none"
          />
        </svg>

        {/* Store Marker */}
        <div className="absolute left-[34px] top-[204px] z-10 flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-slate-950 border border-slate-800 shadow-md flex items-center justify-center text-sm">
            🏪
          </div>
          <span className="text-[7px] font-bold text-slate-500 mt-1 font-mono uppercase bg-slate-950/90 px-1 py-0.5 rounded border border-slate-900">Shop</span>
        </div>

        {/* Home Marker */}
        <div className="absolute left-[234px] top-[204px] z-10 flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-slate-950 border border-slate-800 shadow-md flex items-center justify-center text-sm">
            🏠
          </div>
          <span className="text-[7px] font-bold text-slate-500 mt-1 font-mono uppercase bg-slate-950/90 px-1 py-0.5 rounded border border-slate-900">Home</span>
        </div>

        {/* Moving Rider */}
        <div 
          style={{ transform: `translate(${riderX - 16}px, ${riderY - 24}px)` }}
          className="absolute z-20 flex flex-col items-center"
        >
          <div className="w-8 h-8 rounded-full bg-orange-500 border border-white/25 shadow-lg flex items-center justify-center text-sm animate-bounce">
            🛵
          </div>
        </div>
      </div>

      {/* Tracker bottom sheet */}
      <div className="p-4 bg-slate-950/95 border-t border-slate-800/80 flex flex-col gap-2.5 z-10 relative">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-mono tracking-widest text-slate-500 uppercase font-bold">Simulator Demo</span>
          <span className="text-[8px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">● Live ETA</span>
        </div>
        
        <div>
          <h4 className="text-[11px] font-bold text-white font-display mb-0.5">{status}</h4>
          <p className="text-[9px] text-slate-400">Rider: Arjun Singh · verified profile</p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-150" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex justify-between items-center text-[9px] font-mono mt-0.5">
          <span className="text-slate-500">Distance: {((100 - progress) * 0.04).toFixed(1)} km</span>
          <span className="text-orange-500 font-bold">ETA: {Math.max(1, Math.ceil((100 - progress) * 0.12))} mins</span>
        </div>
      </div>
    </motion.div>
  );
};

// Animated SVG route-map background
const RouteGraphic = () => (
  <svg
    viewBox="0 0 800 500"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full absolute inset-0 opacity-[0.22] pointer-events-none"
    aria-hidden="true"
  >
    <defs>
      <radialGradient id="glow-center" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FF5733" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#FF5733" stopOpacity="0" />
      </radialGradient>
    </defs>
    {/* Glow orb */}
    <ellipse cx="400" cy="250" rx="300" ry="200" fill="url(#glow-center)" />
    {/* Route lines — dashed animated paths */}
    <path
      d="M80 400 Q 200 300 320 260 Q 440 220 560 180 Q 640 160 720 120"
      stroke="#FF5733" strokeWidth="1.5" strokeDasharray="6 10" strokeLinecap="round"
    >
      <animate attributeName="stroke-dashoffset" from="0" to="-80" dur="3s" repeatCount="indefinite" />
    </path>
    <path
      d="M40 300 Q 180 280 280 220 Q 380 160 500 150 Q 600 140 720 200"
      stroke="#FF5733" strokeWidth="1" strokeDasharray="4 12" strokeLinecap="round" opacity="0.5"
    >
      <animate attributeName="stroke-dashoffset" from="0" to="-80" dur="4.5s" repeatCount="indefinite" />
    </path>
    <path
      d="M100 460 Q 240 380 380 320 Q 480 280 580 240 Q 660 210 760 260"
      stroke="#FF5733" strokeWidth="0.75" strokeDasharray="3 14" strokeLinecap="round" opacity="0.35"
    >
      <animate attributeName="stroke-dashoffset" from="0" to="-80" dur="6s" repeatCount="indefinite" />
    </path>
    {/* Node dots */}
    {[[320, 260], [560, 180], [280, 220], [500, 150], [380, 320]].map(([cx, cy], i) => (
      <circle key={i} cx={cx} cy={cy} r="3" fill="#FF5733" opacity="0.7">
        <animate attributeName="opacity" values="0.7;0.2;0.7" dur={`${2 + i * 0.4}s`} repeatCount="indefinite" />
      </circle>
    ))}
  </svg>
);

// Minimal line icon set
const Icon = {
  browse: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  ),
  track: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" />
    </svg>
  ),
  arrive: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  shield: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  clock: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  star: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
};

const Landing = () => {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.6], [0, 40]);

  // Navbar solidifies on scroll
  const { scrollY } = useScroll();
  const [navScrolled, setNavScrolled] = useState(false);
  useEffect(() => {
    const unsub = scrollY.on("change", (v) => setNavScrolled(v > 48));
    return unsub;
  }, [scrollY]);

  const fade = (delay = 0, y = 20) =>
    reduced
      ? { initial: {}, animate: {} }
      : {
          initial: { opacity: 0, y },
          animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1], delay } },
        };

  const scrollFade = (delay = 0) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          whileInView: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1], delay } },
          viewport: { once: true, margin: "-60px" },
        };

  return (
    <div
      style={{
        backgroundColor: "var(--bg-base)",
        color: "var(--color-ink)",
        fontFamily: "var(--font-body)",
        overflowX: "hidden",
      }}
      className="min-h-screen"
    >

      {/* ── Navbar ──────────────────────────────────────────────────── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 clamp(24px, 5vw, 80px)",
          height: 68,
          borderBottom: navScrolled ? "1px solid var(--color-rule)" : "1px solid transparent",
          backdropFilter: "blur(28px) saturate(200%)",
          WebkitBackdropFilter: "blur(28px) saturate(200%)",
          backgroundColor: navScrolled ? "rgba(11,15,25,0.85)" : "transparent",
          transition: "background-color 0.3s, border-color 0.3s",
          boxShadow: navScrolled ? "0 4px 30px rgba(0,0,0,0.2)" : "none",
        }}
      >
        {/* Logo wordmark */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <ForkfulLogo bare size={28} />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: "1.1rem",
              letterSpacing: "-0.04em",
              color: "var(--color-ink)",
            }}
          >
            Forkful
          </span>
        </div>

        {/* Nav actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-[var(--color-manifest)] transition-colors hover:text-white cursor-pointer"
          >
            Log In
          </button>
          <button
            onClick={() => navigate("/login")}
            className="px-5 py-2 text-xs font-bold text-white rounded-xl transition-all cursor-pointer hover:brightness-110 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #FF5733, #c0392b)",
              boxShadow: "0 4px 16px rgba(255,87,51,0.25)",
            }}
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
        style={{
          padding: "120px clamp(24px, 5vw, 80px) 80px",
          background: "linear-gradient(180deg, #090B11 0%, #0E0705 50%, #090B11 100%)",
        }}
      >
        {/* Animated scanner grid overlay */}
        <div 
          className="absolute inset-0 opacity-[0.05] pointer-events-none" 
          style={{
            backgroundImage: "radial-gradient(rgba(255,87,51,0.15) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "20px 20px, 40px 40px, 40px 40px",
          }}
        />

        {/* Ambient drift glow orbs */}
        {!reduced && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <motion.div
              animate={{
                x: ["-25%", "25%", "-25%"],
                y: ["-15%", "15%", "-15%"],
              }}
              transition={{
                duration: 24,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute w-[500px] h-[500px] rounded-full opacity-[0.18]"
              style={{
                background: "radial-gradient(circle, rgba(255,87,51,0.95) 0%, transparent 70%)",
                filter: "blur(80px)",
                left: "10%",
                top: "10%"
              }}
            />
            <motion.div
              animate={{
                x: ["25%", "-25%", "25%"],
                y: ["15%", "-15%", "15%"],
              }}
              transition={{
                duration: 28,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute w-[600px] h-[600px] rounded-full opacity-[0.12]"
              style={{
                background: "radial-gradient(circle, rgba(155,93,229,0.7) 0%, transparent 70%)",
                filter: "blur(90px)",
                right: "10%",
                bottom: "10%"
              }}
            />
          </div>
        )}

        {/* Route-map background graphic */}
        <motion.div
          style={{ position: "absolute", inset: 0, opacity: heroOpacity }}
        >
          <RouteGraphic />
        </motion.div>

        {/* Dark vignette at edges */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 65% 55% at 50% 50%, transparent 40%, #090B11 90%)",
          }}
        />

        {/* 2-Column Responsive Layout */}
        <div className="relative z-10 mx-auto max-w-6xl w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column — Text & CTAs */}
            <motion.div 
              style={{ y: heroY, opacity: heroOpacity }}
              className="lg:col-span-7 space-y-6 flex flex-col items-center lg:items-start text-center lg:text-left"
            >
              {/* Eyebrow */}
              <motion.div {...fade(0, 12)}>
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-orange-500/10 bg-orange-500/5 text-[9px] font-mono tracking-widest uppercase font-bold text-orange-400"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  Now live in your city
                </div>
              </motion.div>

              {/* Headline */}
              <motion.h1 {...fade(0.07, 20)}
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2.8rem, 6vw, 4.8rem)",
                  fontWeight: 900,
                  lineHeight: 1.05,
                  letterSpacing: "-0.04em",
                  color: "var(--color-ink)",
                  textShadow: "0 0 45px rgba(255,87,51,0.22)",
                }}
              >
                Delivery that{" "}
                <span style={{ color: "#FF5733", whiteSpace: "nowrap" }}>knows the way.</span>
              </motion.h1>

              {/* Subline */}
              <motion.p {...fade(0.14, 16)}
                style={{
                  fontSize: "clamp(0.95rem, 1.8vw, 1.05rem)",
                  lineHeight: 1.75,
                  color: "var(--color-manifest)",
                  maxWidth: 520,
                  fontWeight: 400,
                }}
              >
                Real-time traffic-based ETAs. Verified delivery partners.
                Restaurants that actually show up on time.
              </motion.p>

              {/* CTAs */}
              <motion.div {...fade(0.20, 12)}
                className="flex items-center gap-4 flex-wrap"
              >
                <button
                  id="landing-get-started"
                  onClick={() => navigate("/login")}
                  className="px-8 py-3.5 text-sm font-bold text-white rounded-2xl cursor-pointer transition-all hover:scale-102 hover:brightness-110 active:scale-95 shadow-lg shadow-orange-500/20 font-display"
                  style={{
                    background: "linear-gradient(135deg, #FF5733, #c0392b)",
                  }}
                >
                  Get Started
                </button>
                <button
                  id="landing-log-in"
                  onClick={() => navigate("/login")}
                  className="px-8 py-3.5 text-sm font-semibold rounded-2xl cursor-pointer border border-white/8 bg-white/[0.02] text-[var(--color-ink)] transition-colors hover:bg-white/[0.05] font-display"
                >
                  Log In
                </button>
              </motion.div>

              {/* Stat pills */}
              <motion.div {...fade(0.28, 10)}
                className="flex items-center gap-10 pt-4 flex-wrap"
              >
                {[
                  { val: "500+", label: "restaurants" },
                  { val: "4.8 ★", label: "avg rating" },
                  { val: "<30 min", label: "median ETA" },
                ].map((s) => (
                  <div key={s.val} className="text-left">
                    <div
                      style={{
                        fontSize: "1.4rem",
                        fontWeight: 900,
                        color: "var(--color-ink)",
                        fontFamily: "var(--font-display)",
                        letterSpacing: "-0.03em",
                        lineHeight: 1.1,
                        marginBottom: 4,
                      }}
                    >
                      {s.val}
                    </div>
                    <div
                      style={{
                        fontSize: "0.68rem",
                        color: "var(--color-ghost)",
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      {s.label}
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right Column — Interactive Smartphone Simulator */}
            <div className="lg:col-span-5 flex justify-center items-center">
              <InteractiveTrackerMock />
            </div>

          </div>
        </div>

      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section
        style={{
          borderTop: "1px solid var(--color-rule)",
          borderBottom: "1px solid var(--color-rule)",
          padding: "88px clamp(24px, 5vw, 80px)",
          background: "linear-gradient(180deg, #090B11 0%, #111827 100%)",
        }}
      >
        <motion.div {...scrollFade(0)} style={{ textAlign: "center", marginBottom: 56 }}>
          <p
            style={{
              fontSize: "0.68rem",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--color-ghost)",
              marginBottom: 12,
            }}
          >
            How it works
          </p>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.6rem, 3.5vw, 2.5rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "var(--color-ink)",
              margin: 0,
            }}
          >
            Three steps. Zero friction.
          </h2>
        </motion.div>

        {/* Steps */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
        >
          {[
            { icon: Icon.browse, num: "01", label: "Browse Storefronts", desc: "Explore local food storefronts, filtered dynamically by distance, menu styles, and live open indicators." },
            { icon: Icon.track, num: "02", label: "Track Live Location", desc: "Follow rider GPS updates on an interactive map. Pinpoint precisely where your order is, real-time." },
            { icon: Icon.arrive, num: "03", label: "Accurate Arrivals", desc: "Traffic-integrated ETAs adapt during delivery — giving you predictions you can actually rely on." },
          ].map((step, i) => (
            <motion.div
              key={step.num}
              initial={reduced ? {} : { opacity: 0, y: 28 }}
              whileInView={reduced ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: i * 0.12 }}
              whileHover={reduced ? {} : { y: -4, scale: 1.02 }}
              className="p-8 rounded-2xl cursor-default transition-all duration-300"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 24px rgba(0,0,0,0.3)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontFamily: "var(--font-mono)",
                    color: "var(--color-ghost)",
                    letterSpacing: "0.08em",
                  }}
                >
                  {step.num}
                </span>
                <div
                  style={{
                    width: 1,
                    height: 16,
                    backgroundColor: "var(--color-rule)",
                  }}
                />
                <span style={{ color: "#FF5733", display: "flex" }}>{step.icon}</span>
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.05rem",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "var(--color-ink)",
                  margin: "0 0 10px",
                }}
              >
                {step.label}
              </h3>
              <p
                style={{
                  fontSize: "0.83rem",
                  lineHeight: 1.65,
                  color: "var(--color-manifest)",
                  margin: 0,
                }}
              >
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Trust row ────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "56px clamp(24px, 5vw, 80px)",
          borderBottom: "1px solid var(--color-rule)",
          background: "#111827",
        }}
      >
        <motion.div
          {...scrollFade(0)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "clamp(12px, 3vw, 32px)",
            flexWrap: "wrap",
          }}
        >
          {[
            { icon: Icon.shield, label: "Verified partners" },
            { icon: Icon.clock, label: "Traffic-aware ETAs" },
            { icon: Icon.star, label: "Real customer reviews" },
          ].map((badge, i) => (
            <motion.div
              key={badge.label}
              initial={reduced ? {} : { opacity: 0, y: 16 }}
              whileInView={reduced ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 }}
              whileHover={reduced ? {} : { scale: 1.03, transition: { duration: 0.18 } }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 16px",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "var(--radius-sm)",
                color: "var(--color-manifest)",
                fontSize: "0.78rem",
                fontWeight: 500,
                letterSpacing: "-0.01em",
                background: "rgba(255,255,255,0.01)",
                cursor: "default",
              }}
            >
              <span style={{ display: "flex", color: "#FF5733" }}>{badge.icon}</span>
              {badge.label}
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Closing CTA band ─────────────────────────────────────────── */}
      <section
        style={{
          padding: "100px clamp(24px, 5vw, 80px)",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(180deg, #111827 0%, #090B11 100%)",
        }}
      >
        {/* Subtle glow */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 50% 60% at 50% 50%, rgba(255,87,51,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <motion.div {...scrollFade(0)} style={{ position: "relative", zIndex: 1 }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.8rem, 4.5vw, 3.2rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              color: "var(--color-ink)",
              margin: "0 0 16px",
              lineHeight: 1.05,
              textShadow: "0 0 35px rgba(255,87,51,0.15)",
            }}
          >
            Your next meal is{" "}
            <span style={{ color: "#FF5733" }}>already on its way.</span>
          </h2>
          <p
            style={{
              fontSize: "0.95rem",
              color: "var(--color-manifest)",
              margin: "0 auto 40px",
              maxWidth: 440,
              lineHeight: 1.65,
            }}
          >
            No subscription. No hidden fees. Just food delivered intelligently.
          </p>
          <motion.button
            id="landing-cta-bottom"
            onClick={() => navigate("/login")}
            whileHover={reduced ? {} : { scale: 1.03 }}
            whileTap={reduced ? {} : { scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="px-10 py-4 text-sm font-bold text-white rounded-2xl cursor-pointer hover:brightness-110 active:scale-95 shadow-lg shadow-orange-500/20"
            style={{
              background: "linear-gradient(135deg, #FF5733, #c0392b)",
              fontFamily: "var(--font-display)",
            }}
          >
            Order Now — It's Free
          </motion.button>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid var(--color-rule)",
          padding: "28px clamp(24px, 5vw, 80px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          backgroundColor: "#090B11",
        }}
      >
        <span
          style={{
            fontSize: "0.8rem",
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            letterSpacing: "-0.02em",
            color: "var(--color-ink)",
          }}
        >
          Forkful
        </span>
        <span
          style={{
            fontSize: "0.68rem",
            fontFamily: "var(--font-mono)",
            color: "var(--color-ghost)",
          }}
        >
          © 2026 · Made by Agam Ghotra ·{" "}
          <a
            href="/dev/login"
            style={{
              color: "inherit",
              textDecoration: "none",
              opacity: 0.25,
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.7"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.25"; }}
          >
            Dev
          </a>
        </span>
      </footer>

      {/* Keyframes */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(255,87,51,0.7); }
          50% { opacity: 0.4; box-shadow: 0 0 16px rgba(255,87,51,0.3); }
        }
        @keyframes hero-glow {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 1; }
          50% { transform: translateX(-50%) scale(1.18); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

export default Landing;
