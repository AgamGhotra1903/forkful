import { useState } from "react";
import { useAppData } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { authService } from "../main";
import ForkfulLogo from "../components/ForkfulLogo";
import { BiUser, BiCycling, BiStore, BiCheck } from "react-icons/bi";

type Role = "customer" | "rider" | "seller" | null;

const ROLE_META: Record<
  NonNullable<Role>,
  { label: string; blurb: string; icon: React.ReactNode; color: string; bg: string }
> = {
  customer: {
    label: "Customer",
    blurb: "Order food from restaurants near you",
    icon: <BiUser className="text-xl" />,
    color: "#2563EB",
    bg: "#EFF6FF",
  },
  rider: {
    label: "Rider",
    blurb: "Deliver orders and earn on your schedule",
    icon: <BiCycling className="text-xl" />,
    color: "#059669",
    bg: "#ECFDF5",
  },
  seller: {
    label: "Seller",
    blurb: "Run your restaurant storefront on Forkful",
    icon: <BiStore className="text-xl" />,
    color: "#D97706",
    bg: "#FFFBEB",
  },
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const SelectRole = () => {
  const [role, setRole] = useState<Role>(null);
  const [submitting, setSubmitting] = useState(false);
  const { setUser, darkMode } = useAppData();
  const navigate = useNavigate();

  const roles: NonNullable<Role>[] = ["customer", "rider", "seller"];

  const addRole = async () => {
    if (!role) return;
    setSubmitting(true);
    try {
      const { data } = await axios.put(
        `${authService}/api/auth/add/role`,
        { role },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );

      localStorage.setItem("token", data.token);
      setUser(data.user);
      toast.success(`You're all set as a ${role}!`);
      navigate("/", { replace: true });
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      console.log(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-10 relative overflow-hidden"
      style={{ backgroundColor: "var(--bg-base)" }}
    >
      {/* Ambient glow blobs, matching the Login screen's aesthetic */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 80% 10%, rgba(255,87,51,0.07) 0%, transparent 70%)," +
            "radial-gradient(ellipse 50% 45% at 20% 90%, rgba(255,130,77,0.05) 0%, transparent 70%)",
        }}
      />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative w-full max-w-[440px] glass-card p-7 sm:p-9 rounded-3xl space-y-6"
      >
        <motion.div variants={itemVariants} className="flex flex-col items-center text-center gap-2.5">
          <ForkfulLogo size={44} dark={darkMode} />
          <span
            style={{
              fontFamily: "var(--font-display, system-ui)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              fontSize: "1.3rem",
              lineHeight: 1,
            }}
          >
            <span style={{ color: darkMode ? "#F0EEE9" : "#111111" }}>Fork</span>
            <span
              style={{
                color: darkMode ? "#FF6B45" : "#FF5733",
                textShadow: darkMode ? "0 0 20px rgba(255, 107, 69, 0.4)" : "none",
              }}
            >
              ful
            </span>
          </span>

          <div className="pt-1">
            <h1 className="text-xl font-black font-display tracking-tight" style={{ color: "var(--color-ink)" }}>
              How will you use Forkful?
            </h1>
            <p className="text-xs mt-1" style={{ color: "var(--color-manifest)" }}>
              Pick a role to finish setting up your account. You can add more roles later.
            </p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-2.5">
          {roles.map((r) => {
            const meta = ROLE_META[r];
            const isActive = role === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                aria-pressed={isActive}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all duration-150 active:scale-[0.98] cursor-pointer hover:-translate-y-0.5"
                style={{
                  backgroundColor: isActive ? "var(--color-route-light)" : "rgba(255,255,255,0.02)",
                  borderColor: isActive ? "var(--color-route)" : "var(--color-rule)",
                }}
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border"
                  style={{ backgroundColor: meta.bg, color: meta.color, borderColor: "var(--color-rule)" }}
                >
                  {meta.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>
                    Continue as {meta.label}
                  </p>
                  <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--color-manifest)" }}>
                    {meta.blurb}
                  </p>
                </div>
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border transition-all"
                  style={{
                    backgroundColor: isActive ? "var(--color-route)" : "transparent",
                    borderColor: isActive ? "var(--color-route)" : "var(--color-rule)",
                  }}
                >
                  {isActive && <BiCheck className="text-white text-base" />}
                </div>
              </button>
            );
          })}
        </motion.div>

        <motion.button
          variants={itemVariants}
          type="button"
          disabled={!role || submitting}
          onClick={addRole}
          className="w-full rounded-2xl text-sm font-bold transition-all duration-150 disabled:opacity-40 cursor-pointer active:scale-[0.98]"
          style={{
            height: "52px",
            background: role ? "linear-gradient(135deg, #FF5733 0%, #FF824D 100%)" : "var(--bg-surface-2)",
            color: role ? "white" : "var(--color-ghost)",
            boxShadow: role ? "0 4px 16px rgba(255,87,51,0.30)" : "none",
          }}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Setting up…
            </span>
          ) : (
            "Continue"
          )}
        </motion.button>
      </motion.div>
    </div>
  );
};

export default SelectRole;
