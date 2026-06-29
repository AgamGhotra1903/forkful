// components/auth/AuthDecorativePanel.tsx
// Left decorative panel — warm gradient, cooking SVG, tagline, feature pills.
// Matches the Samadhaan two-panel auth aesthetic.
import ForkfulLogo from "../ForkfulLogo";
import { motion, useReducedMotion } from "framer-motion";

export const AuthDecorativePanel = () => {
  const shouldReduceMotion = useReducedMotion();

  // Gentle, premium cooking loops matching the home page pan toss theme
  const panAnimate = shouldReduceMotion ? {} : {
    y: [0, 6, -3, 0],
    rotate: [0, -2, 4, 0],
  };

  const food1Animate = shouldReduceMotion ? {} : {
    y: [0, -55, 0],
    x: [0, -15, 0],
    rotate: [0, 180, 360],
  };

  const food2Animate = shouldReduceMotion ? {} : {
    y: [0, -75, 0],
    x: [0, 20, 0],
    rotate: [0, -220, -360],
  };

  const food3Animate = shouldReduceMotion ? {} : {
    y: [0, -80, 0],
    x: [0, 30, 0],
    rotate: [0, 320, 720],
  };

  const food4Animate = shouldReduceMotion ? {} : {
    y: [0, -120, 0],
    x: [0, -10, 0],
    rotate: [0, -240, -480],
  };

  const leafAnimate = shouldReduceMotion ? {} : {
    y: [0, -95, 0],
    x: [0, 15, 0],
    rotate: [0, 140, 280],
  };

  const steamAnimate = shouldReduceMotion ? {} : {
    y: [5, -12],
    opacity: [0, 0.8, 0],
  };

  const utensilAnimate = shouldReduceMotion ? {} : {
    y: [0, -4, 0],
    rotate: [0, 2, -2, 0],
  };

  return (
    <div
      className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #FF5733 0%, #FF824D 30%, #FF3D6A 65%, #C0392B 100%)",
      }}
    >
      {/* Animated floating circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[
          { size: 320, top: "-80px", left: "-80px", delay: "0s" },
          { size: 200, top: "30%", right: "-60px", delay: "1.5s" },
          { size: 150, bottom: "10%", left: "20%", delay: "0.7s" },
          { size: 100, top: "60%", left: "5%", delay: "2.2s" },
        ].map((c, i) => (
          <div
            key={i}
            className="auth-float-circle"
            style={{
              width: c.size,
              height: c.size,
              top: c.top,
              left: (c as any).left,
              right: (c as any).right,
              bottom: (c as any).bottom,
              animationDelay: c.delay,
            }}
          />
        ))}
      </div>

      {/* Top wordmark */}
      <div className="relative z-10">
        <div className="flex items-center gap-2.5">
          <ForkfulLogo size={38} dark={true} />
          <span style={{
            fontFamily: "var(--font-display, system-ui)",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            fontSize: "1.2rem",
            lineHeight: 1,
            whiteSpace: "nowrap"
          }}>
            <span style={{ color: "#FFFFFF" }}>Fork</span>
            <span style={{ color: "#FFAA88" }}>ful</span>
          </span>
        </div>
      </div>

      {/* Center illustration + tagline */}
      <div className="relative z-10 flex flex-col items-start gap-8 w-full">
        {/* Cooking SVG illustration */}
        <div className="w-full flex justify-center py-4">
          <svg
            viewBox="0 0 320 260"
            width="320"
            height="260"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            style={{ filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.15))" }}
          >
            <defs>
              <radialGradient id="auraGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
                <stop offset="50%" stopColor="#FFAA88" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#FF3D6A" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Glowing backplate radial aura */}
            <motion.circle
              cx="140"
              cy="180"
              r="75"
              fill="url(#auraGrad)"
              opacity="0.35"
              animate={shouldReduceMotion ? {} : { scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Twinkling star 1 */}
            <motion.g
              animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              style={{ transformOrigin: "60px 70px" }}
            >
              <path d="M 60 64 L 61 68 L 65 69 L 61 70 L 60 74 L 59 70 L 55 69 L 59 68 Z" fill="#FFF" />
            </motion.g>
            {/* Twinkling star 2 */}
            <motion.g
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.9, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
              style={{ transformOrigin: "210px 50px" }}
            >
              <path d="M 210 44 L 211 48 L 215 49 L 211 50 L 210 54 L 209 50 L 205 49 L 209 48 Z" fill="#FFF" />
            </motion.g>

            {/* Steam wisps (rising & fading) */}
            <motion.path
              d="M 100 135 Q 105 115 100 95"
              stroke="rgba(255,255,255,0.65)"
              strokeWidth="3.5"
              strokeLinecap="round"
              animate={steamAnimate}
              transition={{ duration: 2.2, repeat: Infinity, ease: "linear", delay: 0.2 }}
            />
            <motion.path
              d="M 130 130 Q 137 110 130 90"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth="3.5"
              strokeLinecap="round"
              animate={steamAnimate}
              transition={{ duration: 2.2, repeat: Infinity, ease: "linear", delay: 0.9 }}
            />
            <motion.path
              d="M 160 133 Q 165 113 160 93"
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="3.5"
              strokeLinecap="round"
              animate={steamAnimate}
              transition={{ duration: 2.2, repeat: Infinity, ease: "linear", delay: 1.6 }}
            />

            {/* Pan & Handle Group */}
            <motion.g
              animate={panAnimate}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: "140px 180px" }}
            >
              {/* Pan shadow/base */}
              <ellipse cx="140" cy="180" rx="85" ry="20" fill="rgba(0,0,0,0.12)" />
              {/* Pan rim */}
              <rect x="45" y="160" width="170" height="30" rx="15" fill="rgba(255,255,255,0.92)" />
              {/* Pan inner shading line */}
              <rect x="52" y="166" width="156" height="18" rx="9" fill="rgba(255,255,255,0.3)" />
              {/* Handle */}
              <rect x="210" y="168" width="65" height="14" rx="7" fill="rgba(255,255,255,0.7)" />
            </motion.g>

            {/* Food items (tossing) */}
            {/* Tomato Slice */}
            <motion.g
              animate={food1Animate}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: "100px 165px" }}
            >
              <circle cx="100" cy="165" r="16" fill="#FF4757" />
              <circle cx="100" cy="165" r="12" fill="#FF6B81" />
              <path d="M 98 162 L 95 165 L 98 168 Z M 102 162 L 105 165 L 102 168 Z" fill="#FFA502" />
            </motion.g>

            {/* Broccoli Floret */}
            <motion.g
              animate={food2Animate}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
              style={{ transformOrigin: "135px 160px" }}
            >
              <rect x="131" y="158" width="8" height="14" rx="2" fill="#2ED573" />
              <circle cx="127" cy="152" r="9" fill="#26AF58" />
              <circle cx="135" cy="148" r="10" fill="#2ED573" />
              <circle cx="143" cy="153" r="8" fill="#26AF58" />
            </motion.g>

            {/* Carrot Slice */}
            <motion.g
              animate={food3Animate}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.25 }}
              style={{ transformOrigin: "170px 162px" }}
            >
              <circle cx="170" cy="162" r="13" fill="#FF7F50" />
              <circle cx="170" cy="162" r="10" fill="#FF6B81" opacity="0.3" />
              <circle cx="170" cy="162" r="2.5" fill="#FFA502" />
            </motion.g>

            {/* Mushroom Slice */}
            <motion.g
              animate={food4Animate}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
              style={{ transformOrigin: "120px 155px" }}
            >
              <path d="M 110 155 A 10 10 0 0 1 130 155 Z" fill="#F1F2F6" />
              <rect x="117" y="155" width="6" height="8" rx="1" fill="#DFE4EA" />
            </motion.g>

            {/* Basil Leaf */}
            <motion.g
              animate={leafAnimate}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
              style={{ transformOrigin: "185px 145px" }}
            >
              <path d="M 180 145 C 180 138, 190 135, 190 145 C 190 152, 180 152, 180 145 Z" fill="#2ED573" />
              <path d="M 180 145 Q 185 142 190 145" stroke="#26AF58" strokeWidth="1" />
            </motion.g>

            {/* Utensils */}
            <motion.g
              animate={utensilAnimate}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: "245px 100px" }}
            >
              {/* Fork */}
              <rect x="235" y="70" width="5" height="80" rx="2.5" fill="rgba(255,255,255,0.75)" />
              <rect x="233" y="70" width="2.5" height="24" rx="1.2" fill="rgba(255,255,255,0.6)" />
              <rect x="237.5" y="70" width="2.5" height="24" rx="1.2" fill="rgba(255,255,255,0.6)" />
              <rect x="242" y="70" width="2.5" height="24" rx="1.2" fill="rgba(255,255,255,0.6)" />
              {/* Spoon */}
              <ellipse cx="265" cy="85" rx="9" ry="14" fill="rgba(255,255,255,0.55)" />
              <rect x="262" y="97" width="6" height="60" rx="3" fill="rgba(255,255,255,0.55)" />
            </motion.g>
          </svg>
        </div>

        {/* Tagline */}
        <div>
          <h2 className="text-white text-3xl font-black leading-tight tracking-tight mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Discover, Cook, Share —<br />
            <span className="text-white/80">Your culinary world</span><br />
            starts here.
          </h2>
          <p className="text-white/70 text-sm font-medium leading-relaxed">
            Join hundreds of thousands of food lovers exploring<br />
            the world one recipe at a time.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2.5">
          {[
            { icon: "🍳", text: "10,000+ Recipes", yOffset: [-2, 2, -2], delay: 0 },
            { icon: "👨‍🍳", text: "Join 500K Cooks", yOffset: [2, -2, 2], delay: 0.3 },
            { icon: "⭐", text: "Curated Collections", yOffset: [-3, 1, -3], delay: 0.6 },
          ].map((pill) => (
            <motion.div
              key={pill.text}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-colors duration-200"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 100%)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.25)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                color: "white",
              }}
              animate={shouldReduceMotion ? {} : { y: pill.yOffset }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: pill.delay }}
              whileHover={{ scale: 1.05, y: -4, borderColor: "rgba(255,255,255,0.5)" }}
            >
              <span>{pill.icon}</span>
              <span>{pill.text}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom spacer to restore three-way vertical alignment balance */}
      <div className="relative z-10 h-6" aria-hidden="true" />
    </div>
  );
};

export default AuthDecorativePanel;
