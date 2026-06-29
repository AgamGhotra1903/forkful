import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../main";
import toast from "react-hot-toast";
import { useGoogleLogin } from "@react-oauth/google";
import { useAppData } from "../context/AppContext";
import { BiUser, BiCycling, BiStore, BiShield } from "react-icons/bi";
import { motion } from "framer-motion";
import ForkfulLogo from "../components/ForkfulLogo";
import { AuthDecorativePanel } from "../components/auth/AuthDecorativePanel";
import { FloatingLabelInput } from "../components/auth/FloatingLabelInput";
import { GoogleOAuthButton } from "../components/auth/GoogleOAuthButton";

// ── Dev bypass profiles (unchanged) ────────────────────────────────────────
const BYPASS_PROFILES = [
  { email: "customer@tomato.com", name: "Test Customer", role: "customer", label: "Customer", color: "#2563EB", bg: "#EFF6FF" },
  { email: "arjun.rider@forkful.dev", name: "Arjun Singh", role: "rider", label: "Rider", color: "#059669", bg: "#ECFDF5" },
  { email: "spicegarden@forkful.dev", name: "Spice Garden", role: "seller", label: "Seller", color: "#D97706", bg: "#FFFBEB" },
  { email: "admin@tomato.com", name: "Support Admin", role: "admin", label: "Admin", color: "#7C3AED", bg: "#F5F3FF" },
] as const;

// ── Animation variants ──────────────────────────────────────────────────────
const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

// ─────────────────────────────────────────────────────────────────────────────
const Login = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [submittingOtp, setSubmittingOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");

  const navigate = useNavigate();
  const { setUser, setIsAuth } = useAppData();

  // ── Auth handlers (ALL PRESERVED EXACTLY) ─────────────────────────────────
  const handleAuth = async (payload: Record<string, string>, isDevLogin = false) => {
    setLoading(true);
    try {
      const endpoint = isDevLogin
        ? `${authService}/api/auth/dev-login`
        : `${authService}/api/auth/login`;
      const result = await axios.post(endpoint, payload);
      localStorage.setItem("token", result.data.token);
      setUser(result.data.user);
      setIsAuth(true);
      navigate("/");
    } catch {
      toast.error("Sign in failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const res = await axios.post(`${authService}/api/auth/send-otp`, {
        email: email.trim().toLowerCase(),
        mode: activeTab,
      });
      setOtpSent(true);
      toast.success("Verification code sent to your email!");

      // If the backend is running without real SMTP credentials, it falls back to Ethereal.
      if (res.data.etherealUrl) {
        toast((t) => (
          <div className="flex flex-col gap-2">
            <span className="font-bold text-amber-600">Dev Mode: Simulated Email</span>
            <span className="text-sm">Since real SMTP credentials aren't configured, the OTP was sent to a test inbox.</span>
            <a
              href={res.data.etherealUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-bold text-blue-500 underline"
              onClick={() => toast.dismiss(t.id)}
            >
              Click here to view the OTP email
            </a>
          </div>
        ), { duration: 15000 });
      }

      setResendTimer(60);
      const timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send verification code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !otp.trim()) return;

    setSubmittingOtp(true);
    try {
      const result = await axios.post(`${authService}/api/auth/verify-otp`, {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        name: activeTab === "signup" ? name.trim() : undefined,
        adminCode: adminCode.trim() || undefined,
      });

      localStorage.setItem("token", result.data.token);
      setUser(result.data.user);
      setIsAuth(true);

      if (result.data.isNewUser) {
        toast.success("Welcome to Forkful! Account created.");
      } else {
        toast.success("Signed in successfully!");
      }
      navigate("/");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid or expired verification code.");
    } finally {
      setSubmittingOtp(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: (r) => {
      const rr: any = r;
      if (rr.code) {
        handleAuth({ code: rr.code });
      } else if (rr.credential) {
        handleAuth({ id_token: rr.credential });
      } else {
        toast.error("Google sign in failed: missing credential");
      }
    },
    onError: () => toast.error("Google sign in failed"),
    flow: "auth-code",
  });

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: "var(--bg-base)" }}
    >
      {/* ── Left decorative panel (desktop only) ── */}
      <AuthDecorativePanel />

      {/* ── Right: auth form ── */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-10 relative overflow-hidden">

        {/* Subtle background ambient blobs */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 55% at 80% 10%, rgba(255,87,51,0.07) 0%, transparent 70%)," +
              "radial-gradient(ellipse 50% 45% at 20% 90%, rgba(255,130,77,0.05) 0%, transparent 70%)",
          }}
        />

        {/* ── Animated card ── */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="relative w-full max-w-[440px]"
        >
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="glass-card p-8 sm:p-10 rounded-3xl space-y-6"
          >
            {/* ── App logo & headline ── */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center gap-2.5 mb-5">
                <ForkfulLogo size={42} dark={true} />
                <span style={{
                  fontFamily: "var(--font-display, system-ui)",
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                  fontSize: "1.35rem",
                  lineHeight: 1
                }}>
                  <span style={{ color: "#FFFFFF" }}>Fork</span>
                  <span style={{
                    color: "#FF6B45",
                    textShadow: "0 0 24px rgba(255, 107, 69, 0.5)"
                  }}>ful</span>
                </span>
              </div>

              <h1
                className="text-2xl font-black tracking-tight leading-tight mb-1 font-display"
                style={{ color: "var(--color-ink)" }}
              >
                Welcome to Forkful 👋
              </h1>
              <p className="text-sm font-medium" style={{ color: "var(--color-manifest)" }}>
                Sign in or create a new account using your email or Google.
              </p>
            </motion.div>

            {/* ── Google OAuth ── */}
            <motion.div variants={itemVariants}>
              <GoogleOAuthButton onClick={() => googleLogin()} loading={loading} />
            </motion.div>

            {/* ── Divider ── */}
            <motion.div variants={itemVariants} className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-rule)" }} />
              <span
                className="text-[9px] font-mono tracking-widest uppercase font-bold"
                style={{ color: "var(--color-ghost)" }}
              >
                or
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-rule)" }} />
            </motion.div>

            {/* ── Tabs Selector ── */}
            {!otpSent && (
              <motion.div variants={itemVariants} className="flex p-1 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--color-rule)]">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("signin");
                    setEmail("");
                    setName("");
                    setAdminCode("");
                  }}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === "signin"
                      ? "bg-white dark:bg-slate-900 shadow-md text-orange-500"
                      : "text-[var(--color-manifest)] hover:text-orange-500"
                    }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("signup");
                    setEmail("");
                    setName("");
                    setAdminCode("");
                  }}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === "signup"
                      ? "bg-white dark:bg-slate-900 shadow-md text-orange-500"
                      : "text-[var(--color-manifest)] hover:text-orange-500"
                    }`}
                >
                  Create One
                </button>
              </motion.div>
            )}

            {/* ── Email & OTP Auth Form ── */}
            {!otpSent ? (
              <motion.form variants={itemVariants} onSubmit={handleSendOtp} className="space-y-4">
                {activeTab === "signup" && (
                  <FloatingLabelInput
                    id="signup-name"
                    label="Full Name"
                    type="text"
                    value={name}
                    onChange={setName}
                    required
                  />
                )}

                <FloatingLabelInput
                  id="login-email"
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  required
                  autoComplete="email"
                />

                <FloatingLabelInput
                  id="login-admin-code"
                  label="Admin Access Code (Optional)"
                  type="password"
                  value={adminCode}
                  onChange={setAdminCode}
                />

                <button
                  type="submit"
                  disabled={loading || !email.trim() || (activeTab === "signup" && !name.trim())}
                  className="w-full h-13 rounded-2xl text-sm font-bold transition-all duration-150 disabled:opacity-40 cursor-pointer active:scale-[0.98] relative overflow-hidden"
                  style={{
                    height: "52px",
                    background: "linear-gradient(135deg, #FF5733 0%, #FF824D 100%)",
                    color: "white",
                    boxShadow: "0 4px 16px rgba(255,87,51,0.30)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 6px 24px rgba(255,87,51,0.42)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(255,87,51,0.30)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending Code…
                    </span>
                  ) : (
                    "Send Verification Code"
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.form variants={itemVariants} onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1">
                  <FloatingLabelInput
                    id="login-email-readonly"
                    label="Email address"
                    type="email"
                    value={email}
                    onChange={() => { }}
                    required
                    disabled
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                    }}
                    className="text-[10px] font-bold text-orange-500 hover:underline px-1 cursor-pointer"
                  >
                    Change Email
                  </button>
                </div>

                <FloatingLabelInput
                  id="login-otp"
                  label="6-Digit Verification Code (OTP)"
                  type="text"
                  value={otp}
                  onChange={setOtp}
                  required
                  autoComplete="one-time-code"
                />

                <button
                  type="submit"
                  disabled={submittingOtp || !otp.trim()}
                  className="w-full h-13 rounded-2xl text-sm font-bold transition-all duration-150 disabled:opacity-40 cursor-pointer active:scale-[0.98] relative overflow-hidden"
                  style={{
                    height: "52px",
                    background: "linear-gradient(135deg, #FF5733 0%, #FF824D 100%)",
                    color: "white",
                    boxShadow: "0 4px 16px rgba(255,87,51,0.30)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 6px 24px rgba(255,87,51,0.42)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(255,87,51,0.30)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {submittingOtp ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying…
                    </span>
                  ) : (
                    "Verify & Sign In"
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    disabled={resendTimer > 0 || loading}
                    onClick={handleSendOtp}
                    className="text-xs font-bold text-[var(--color-manifest)] hover:text-orange-500 disabled:opacity-50 cursor-pointer"
                  >
                    {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : "Resend Verification Code"}
                  </button>
                </div>
              </motion.form>
            )}

            {/* ── Dev bypass panel ── */}
            {import.meta.env.DEV && (
              <motion.div variants={itemVariants} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-rule)" }} />
                  <span
                    className="text-[9px] font-mono tracking-widest uppercase font-bold"
                    style={{ color: "var(--color-ghost)" }}
                  >
                    Dev bypass
                  </span>
                  <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-rule)" }} />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {BYPASS_PROFILES.map((p) => (
                    <button
                      key={p.role}
                      disabled={loading}
                      onClick={() =>
                        handleAuth({ email: p.email, name: p.name, role: p.role }, true)
                      }
                      className="flex items-center gap-2 px-3 py-2.5 rounded-2xl text-xs transition-all duration-150 disabled:opacity-40 cursor-pointer border text-left hover:-translate-y-0.5"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.02)",
                        borderColor: "var(--color-rule)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--color-muted)";
                        e.currentTarget.style.borderColor = "var(--color-route)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.02)";
                        e.currentTarget.style.borderColor = "var(--color-rule)";
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                        style={{
                          backgroundColor: p.bg,
                          color: p.color,
                          border: "1px solid var(--color-rule)",
                        }}
                      >
                        {p.role === "customer" && <BiUser className="text-base" />}
                        {p.role === "rider" && <BiCycling className="text-base" />}
                        {p.role === "seller" && <BiStore className="text-base" />}
                        {p.role === "admin" && <BiShield className="text-base" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold truncate" style={{ color: "var(--color-ink)" }}>
                          {p.label}
                        </p>
                        <p className="text-[9px] font-mono truncate" style={{ color: p.color }}>
                          {p.role}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Footer ── */}
            <motion.p
              variants={itemVariants}
              className="text-[10px] text-center"
              style={{ color: "var(--color-ghost)" }}
            >
              By signing in, you agree to our{" "}
              <a
                href="#"
                className="underline underline-offset-2 transition-colors"
                style={{ color: "var(--color-route)" }}
              >
                Terms
              </a>{" "}
              and{" "}
              <a
                href="#"
                className="underline underline-offset-2 transition-colors"
                style={{ color: "var(--color-route)" }}
              >
                Privacy Policy
              </a>
              .
            </motion.p>

            {/* ── Made with love footer ── */}
            <motion.div
              variants={itemVariants}
              className="pt-4 text-center border-t"
              style={{ borderColor: "var(--color-rule)" }}
            >
              <p
                className="text-[11px] font-semibold"
                style={{ color: "var(--color-manifest)", fontFamily: "var(--font-body)" }}
              >
                Made with{" "}
                <span className="animate-pulse" style={{ color: "#FF5733" }}>♥</span>
                {" "}by{" "}
                <span
                  className="font-black uppercase tracking-wider"
                  style={{
                    color: "var(--color-ink)",
                    fontFamily: "var(--font-display)",
                    letterSpacing: "0.05em",
                  }}
                >
                  Agam Ghotra
                </span>
              </p>
              <p
                className="text-[9px] mt-0.5 font-mono"
                style={{ color: "var(--color-ghost)" }}
              >
                © 2026 Forkful · All rights reserved
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
