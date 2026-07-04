import axios from "axios";
import { useState, useEffect } from "react";
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
import { OtpInput } from "../components/auth/OtpInput";

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
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [authorityCode, setAuthorityCode] = useState("");

  // ── Email OTP verification step ──
  const [authStep, setAuthStep] = useState<"form" | "otp">("form");
  const [otpEmail, setOtpEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const navigate = useNavigate();
  const { setUser, setIsAuth } = useAppData();

  const passwordsMatch = confirmPassword.length === 0 || confirmPassword === password;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    try {
      const result = await axios.post(`${authService}/api/auth/login-password`, {
        email: email.trim(),
        password: password.trim(),
      });
      localStorage.setItem("token", result.data.token);
      setUser(result.data.user);
      setIsAuth(true);
      toast.success("Signed in successfully!");
      navigate("/");
    } catch (err: any) {
      if (err.response?.data?.requiresVerification) {
        setOtpEmail(email.trim());
        setOtp("");
        setAuthStep("otp");
        setResendCooldown(30);
        toast(err.response.data.message || "Please verify your email first.", { icon: "✉️" });
      } else {
        toast.error(err.response?.data?.message || "Invalid email or password.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !firstName.trim() || !lastName.trim() || !mobileNumber.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const result = await axios.post(`${authService}/api/auth/register-password`, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        mobileNumber: mobileNumber.trim(),
        email: email.trim(),
        password: password.trim(),
        confirmPassword: confirmPassword.trim(),
        authorityCode: authorityCode.trim() || undefined,
      });

      if (result.data.requiresVerification) {
        setOtpEmail(email.trim());
        setOtp("");
        setAuthStep("otp");
        setResendCooldown(30);
        toast.success("Check your inbox for a 6-digit verification code!");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (code?: string) => {
    const codeToUse = (code ?? otp).trim();
    if (codeToUse.length !== 6) {
      toast.error("Enter the full 6-digit code.");
      return;
    }
    setOtpVerifying(true);
    try {
      const result = await axios.post(`${authService}/api/auth/verify-otp`, {
        email: otpEmail,
        otp: codeToUse,
      });
      localStorage.setItem("token", result.data.token);
      setUser(result.data.user);
      setIsAuth(true);
      toast.success(result.data.message || "Verified! Welcome to Forkful.");
      navigate("/");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid or expired code.");
      setOtp("");
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      await axios.post(`${authService}/api/auth/send-otp`, {
        email: otpEmail,
        mode: "signup",
      });
      toast.success("A fresh code is on its way!");
      setResendCooldown(30);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Couldn't resend the code. Try again shortly.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToForm = () => {
    setAuthStep("form");
    setOtp("");
  };

  const handleBypassAuth = async (payload: { email: string; name: string; role: string }) => {
    setLoading(true);
    try {
      const result = await axios.post(`${authService}/api/auth/dev-login`, payload);
      localStorage.setItem("token", result.data.token);
      setUser(result.data.user);
      setIsAuth(true);
      toast.success(`Logged in as ${payload.name}!`);
      navigate("/");
    } catch {
      toast.error("Bypass login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async (payload: Record<string, string>) => {
    setLoading(true);
    try {
      const result = await axios.post(`${authService}/api/auth/login`, payload);
      localStorage.setItem("token", result.data.token);
      setUser(result.data.user);
      setIsAuth(true);
      toast.success("Signed in successfully!");
      navigate("/");
    } catch {
      toast.error("Sign in failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: (r) => {
      const rr: any = r;
      if (rr.code) {
        handleGoogleAuth({ code: rr.code });
      } else if (rr.credential) {
        handleGoogleAuth({ id_token: rr.credential });
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
                {authStep === "otp" ? "One last step 🔐" : "Welcome to Forkful 👋"}
              </h1>
              <p className="text-sm font-medium" style={{ color: "var(--color-manifest)" }}>
                {authStep === "otp"
                  ? "Secure your account with a quick email verification."
                  : "Sign in or create a new account using your email or Google."}
              </p>
            </motion.div>

            {/* ── Google OAuth ── */}
            {authStep === "form" && (
            <motion.div variants={itemVariants}>
              <GoogleOAuthButton onClick={() => googleLogin()} loading={loading} />
            </motion.div>
            )}

            {/* ── Divider ── */}
            {authStep === "form" && (
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
            )}

            {/* ── Tabs Selector ── */}
            {authStep === "form" && (
            <motion.div variants={itemVariants} className="flex p-1 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--color-rule)]">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("signin");
                  setEmail("");
                  setPassword("");
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
                  setPassword("");
                  setConfirmPassword("");
                  setFirstName("");
                  setLastName("");
                  setMobileNumber("");
                  setAuthorityCode("");
                }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === "signup"
                    ? "bg-white dark:bg-slate-900 shadow-md text-orange-500"
                    : "text-[var(--color-manifest)] hover:text-orange-500"
                  }`}
              >
                Register
              </button>
            </motion.div>
            )}

            {/* ── Forms ── */}
            {authStep === "form" ? (
              <>
              {activeTab === "signin" ? (
              <motion.form variants={itemVariants} onSubmit={handleSignIn} className="space-y-4">
                <FloatingLabelInput
                  id="login-email"
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  required
                  autoComplete="email"
                />

                <div className="space-y-2">
                  <FloatingLabelInput
                    id="login-password"
                    label="Password"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    required
                    showToggle={true}
                    autoComplete="current-password"
                  />
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => toast.success("Password reset link simulation sent to ethereal!")}
                      className="text-[10px] font-bold text-orange-500 hover:underline px-1 cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim() || !password.trim()}
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
                      Signing In…
                    </span>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.form variants={itemVariants} onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FloatingLabelInput
                    id="register-firstname"
                    label="First Name"
                    type="text"
                    value={firstName}
                    onChange={setFirstName}
                    required
                  />
                  <FloatingLabelInput
                    id="register-lastname"
                    label="Last Name"
                    type="text"
                    value={lastName}
                    onChange={setLastName}
                    required
                  />
                </div>

                <FloatingLabelInput
                  id="register-mobile"
                  label="Mobile Number"
                  type="text"
                  value={mobileNumber}
                  onChange={setMobileNumber}
                  required
                />

                <FloatingLabelInput
                  id="register-authority-code"
                  label="Authority Code (Optional)"
                  type="password"
                  value={authorityCode}
                  onChange={setAuthorityCode}
                />

                <FloatingLabelInput
                  id="register-email"
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  required
                  autoComplete="email"
                />

                <FloatingLabelInput
                  id="register-password"
                  label="Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  required
                  showToggle={true}
                  autoComplete="new-password"
                />

                <div className="space-y-1.5">
                  <FloatingLabelInput
                    id="register-confirm-password"
                    label="Confirm Password"
                    type="password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    required
                    showToggle={true}
                    autoComplete="new-password"
                  />
                  {confirmPassword.length > 0 && (
                    <p
                      className="text-[10px] font-bold pl-1 flex items-center gap-1"
                      style={{ color: passwordsMatch ? "#22C55E" : "#F87171" }}
                    >
                      {passwordsMatch ? "✓ Passwords match" : "✕ Passwords don't match"}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim() || !password.trim() || !confirmPassword.trim() || password !== confirmPassword || !firstName.trim() || !lastName.trim() || !mobileNumber.trim()}
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
                      Registering…
                    </span>
                  ) : (
                    "Register Account"
                  )}
                </button>
              </motion.form>
            )}
              </>
            ) : (
              <motion.div
                key="otp-step"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35 }}
                className="space-y-5"
              >
                {/* Step indicator */}
                <div className="flex items-center gap-2 justify-center text-[10px] font-mono uppercase tracking-widest font-bold">
                  <span className="flex items-center gap-1.5" style={{ color: "var(--color-ghost)" }}>
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                      style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E" }}
                    >✓</span>
                    Account
                  </span>
                  <span className="w-6 h-px" style={{ backgroundColor: "var(--color-route)" }} />
                  <span className="flex items-center gap-1.5" style={{ color: "var(--color-route)" }}>
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                      style={{ background: "rgba(255,87,51,0.18)", border: "1px solid var(--color-route)" }}
                    >2</span>
                    Verify
                  </span>
                </div>

                <div className="text-center space-y-1.5">
                  <div
                    className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-2xl"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,87,51,0.18), rgba(255,130,77,0.08))",
                      border: "1px solid var(--color-rule)",
                      boxShadow: "0 0 24px rgba(255,87,51,0.15)",
                    }}
                  >
                    ✉️
                  </div>
                  <h2 className="text-lg font-black" style={{ color: "var(--color-ink)" }}>
                    Verify your email
                  </h2>
                  <p className="text-xs" style={{ color: "var(--color-manifest)" }}>
                    Enter the 6-digit code sent to
                  </p>
                  <p className="text-xs font-bold" style={{ color: "var(--color-route)" }}>
                    {otpEmail}
                  </p>
                </div>

                <OtpInput value={otp} onChange={setOtp} onComplete={handleVerifyOtp} disabled={otpVerifying} />

                <button
                  type="button"
                  onClick={() => handleVerifyOtp()}
                  disabled={otpVerifying || otp.length !== 6}
                  className="w-full rounded-2xl text-sm font-bold transition-all duration-150 disabled:opacity-40 cursor-pointer active:scale-[0.98]"
                  style={{
                    height: "52px",
                    background: "linear-gradient(135deg, #FF5733 0%, #FF824D 100%)",
                    color: "white",
                    boxShadow: "0 4px 16px rgba(255,87,51,0.30)",
                  }}
                >
                  {otpVerifying ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying…
                    </span>
                  ) : (
                    "Verify & Continue"
                  )}
                </button>

                <div className="flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={handleBackToForm}
                    className="font-bold hover:underline cursor-pointer"
                    style={{ color: "var(--color-ghost)" }}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || loading}
                    className="font-bold hover:underline cursor-pointer disabled:opacity-40 disabled:no-underline"
                    style={{ color: "var(--color-route)" }}
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Guest panel ── */}
            {authStep === "form" && (
            <motion.div variants={itemVariants} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-rule)" }} />
                <span
                  className="text-[9px] font-mono tracking-widest uppercase font-bold"
                  style={{ color: "var(--color-ghost)" }}
                >
                  Enter as Guest
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-rule)" }} />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {BYPASS_PROFILES.map((p) => (
                  <button
                    key={p.role}
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      handleBypassAuth({ email: p.email, name: p.name, role: p.role })
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
