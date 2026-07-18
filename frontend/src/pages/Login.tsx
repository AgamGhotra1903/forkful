/**
 * Login.tsx — Customer-facing auth page
 *
 * Layout: split panel on desktop (pan animation left, form right),
 * stacked on mobile (form only, pan above as compact brand touch).
 *
 * Dev bypass logic → /dev/login
 * Admin portal    → /admin/login
 */

import axios from "axios";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../main";
import toast from "react-hot-toast";
import { useGoogleLogin } from "@react-oauth/google";
import { useAppData } from "../context/AppContext";
import { motion, AnimatePresence } from "framer-motion";
import { OtpInput } from "../components/auth/OtpInput";
import { AuthDecorativePanel } from "../components/auth/AuthDecorativePanel";
import ForkfulLogo from "../components/ForkfulLogo";


// ── Form primitives ──────────────────────────────────────────────────────────
const inputStyle = (focused: boolean): React.CSSProperties => ({
  width: "100%",
  height: "46px",
  padding: "0 40px 0 14px",
  fontSize: "0.875rem",
  fontFamily: "var(--font-body)",
  color: "var(--color-ink)",
  background: focused ? "var(--bg-surface-2, rgba(255,255,255,0.06))" : "var(--bg-surface-2, rgba(0,0,0,0.03))",
  border: `1.5px solid ${focused ? "#FF5733" : "var(--color-rule)"}`,
  borderRadius: "7px",
  outline: "none",
  transition: "border-color 0.18s, background 0.18s, box-shadow 0.18s",
  boxShadow: focused ? "0 0 0 3px rgba(255,87,51,0.10)" : "none",
  boxSizing: "border-box" as const,
});

interface AuthFieldProps {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; autoComplete?: string; required?: boolean; hint?: string;
}

const AuthField = ({ id, label, type = "text", value, onChange, autoComplete, required, hint }: AuthFieldProps) => {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const isPw = type === "password";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label htmlFor={id} style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--color-manifest)", letterSpacing: "0.01em" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          type={isPw && !showPw ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete}
          required={required}
          style={{ ...inputStyle(focused), paddingRight: isPw ? "44px" : "14px" }}
        />
        {isPw && (
          <button type="button" tabIndex={-1} onClick={() => setShowPw(p => !p)}
            aria-label={showPw ? "Hide" : "Show"}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-ghost)", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
            {showPw
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
          </button>
        )}
      </div>
      {hint && <p style={{ fontSize: "0.7rem", color: "var(--color-ghost)", margin: 0 }}>{hint}</p>}
    </div>
  );
};

const PrimaryBtn = ({ children, loading, disabled, onClick }: {
  children: React.ReactNode; loading?: boolean; disabled?: boolean; onClick?: () => void;
}) => (
  <motion.button
    type={onClick ? "button" : "submit"}
    onClick={onClick}
    disabled={loading || disabled}
    whileHover={!loading && !disabled ? { scale: 1.015, boxShadow: "0 6px 22px rgba(255,87,51,0.35)" } : {}}
    whileTap={!loading && !disabled ? { scale: 0.98 } : {}}
    transition={{ duration: 0.14 }}
    style={{
      width: "100%", height: "46px", fontSize: "0.875rem", fontWeight: 700,
      fontFamily: "var(--font-body)", color: "#fff",
      background: loading || disabled ? "rgba(255,87,51,0.4)" : "#FF5733",
      border: "none", borderRadius: "7px",
      cursor: loading || disabled ? "not-allowed" : "pointer",
      letterSpacing: "-0.01em",
      boxShadow: loading || disabled ? "none" : "0 4px 16px rgba(255,87,51,0.22)",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    }}
  >
    {loading
      ? <><div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />{children}</>
      : children}
  </motion.button>
);

const Divider = ({ label }: { label: string }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div style={{ flex: 1, height: 1, background: "var(--color-rule)" }} />
    <span style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "var(--color-ghost)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
    <div style={{ flex: 1, height: 1, background: "var(--color-rule)" }} />
  </div>
);

const GoogleBtn = ({ onClick, loading }: { onClick: () => void; loading: boolean }) => (
  <motion.button type="button" onClick={onClick} disabled={loading}
    whileHover={!loading ? { borderColor: "var(--color-ghost)" } : {}}
    style={{ width: "100%", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
      fontSize: "0.84rem", fontWeight: 600, fontFamily: "var(--font-body)", color: "var(--color-ink)",
      background: "var(--bg-surface)", border: "1.5px solid var(--color-rule)", borderRadius: "7px", cursor: "pointer",
      transition: "border-color 0.18s" }}>
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
    Continue with Google
  </motion.button>
);

// ── Main component ───────────────────────────────────────────────────────────
const Login = () => {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [authStep, setAuthStep] = useState<"form" | "otp">("form");
  const [loading, setLoading] = useState(false);

  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");

  const [suFirst, setSuFirst] = useState("");
  const [suLast, setSuLast] = useState("");
  const [suMobile, setSuMobile] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPw, setSuPw] = useState("");
  const [suConfirm, setSuConfirm] = useState("");

  const [otpEmail, setOtpEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const navigate = useNavigate();
  const { setUser, setIsAuth } = useAppData();
  const pwMatch = suConfirm.length === 0 || suConfirm === suPw;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post(`${authService}/api/auth/login-password`, { email: siEmail.trim(), password: siPassword.trim() });
      localStorage.setItem("token", data.token);
      setUser(data.user); setIsAuth(true);
      navigate("/");
    } catch (err: any) {
      if (err.response?.data?.requiresVerification) {
        setOtpEmail(siEmail.trim()); setOtp(""); setAuthStep("otp"); setResendCooldown(30);
        toast("Check your inbox for a 6-digit code.", { icon: "✉️" });
      } else { toast.error(err.response?.data?.message || "Invalid email or password."); }
    } finally { setLoading(false); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suFirst.trim() || !suLast.trim() || !suMobile.trim() || !suEmail.trim() || !suPw.trim()) { toast.error("Please fill in all fields."); return; }
    if (suPw.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    if (suPw !== suConfirm) { toast.error("Passwords don't match."); return; }
    setLoading(true);
    try {
      const { data } = await axios.post(`${authService}/api/auth/register-password`, {
        firstName: suFirst.trim(), lastName: suLast.trim(), mobileNumber: suMobile.trim(),
        email: suEmail.trim(), password: suPw.trim(), confirmPassword: suConfirm.trim(),
      });
      if (data.requiresVerification) {
        setOtpEmail(suEmail.trim()); setOtp(""); setAuthStep("otp"); setResendCooldown(30);
        toast.success("Check your inbox for a 6-digit verification code.");
      }
    } catch (err: any) { toast.error(err.response?.data?.message || "Registration failed."); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async (code?: string) => {
    const c = (code ?? otp).trim();
    if (c.length !== 6) { toast.error("Enter the full 6-digit code."); return; }
    setOtpVerifying(true);
    try {
      const { data } = await axios.post(`${authService}/api/auth/verify-otp`, { email: otpEmail, otp: c });
      localStorage.setItem("token", data.token);
      setUser(data.user); setIsAuth(true);
      navigate("/");
    } catch (err: any) { toast.error(err.response?.data?.message || "Invalid or expired code."); setOtp(""); }
    finally { setOtpVerifying(false); }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      await axios.post(`${authService}/api/auth/send-otp`, { email: otpEmail, mode: "signup" });
      toast.success("New code sent."); setResendCooldown(30);
    } catch (err: any) { toast.error(err.response?.data?.message || "Couldn't resend."); }
    finally { setLoading(false); }
  };

  const handleGoogleAuth = async (payload: Record<string, string>) => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${authService}/api/auth/login`, payload);
      localStorage.setItem("token", data.token);
      setUser(data.user); setIsAuth(true); navigate("/");
    } catch { toast.error("Google sign in failed."); }
    finally { setLoading(false); }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: (r: any) => {
      // Implicit/token flow: r.access_token is returned directly.
      // The backend /api/auth/login accepts { access_token } and fetches
      // user info from Google's userinfo endpoint.
      if (r.access_token) handleGoogleAuth({ access_token: r.access_token });
      else toast.error("Google sign in failed.");
    },
    onError: (err) => {
      console.error("Google OAuth error:", err);
      toast.error("Google sign in failed.");
    },
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "stretch", backgroundColor: "var(--bg-base)" }}>

      {/* Left panel — original pan animation — exactly half the viewport */}
      <div className="login-left-panel" style={{ flex: "0 0 50%", maxWidth: "50%" }}>
        <AuthDecorativePanel />
      </div>

      {/* Right panel — form */}
      <div className="login-right-panel" style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 32px",
        boxSizing: "border-box",
        overflowY: "auto",
      }}>

        {/* Mobile logo (hidden on desktop) */}
        <div className="login-mobile-logo">
          <Link to="/landing" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", marginBottom: 24 }}>
            <ForkfulLogo bare size={28} />
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.04em", color: "var(--color-ink)" }}>Forkful</span>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: "100%", maxWidth: 400 }}
        >

          {/* Desktop logo */}
          <div className="login-desktop-logo" style={{ marginBottom: 28 }}>
            <Link to="/landing" style={{ display: "inline-flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
              <ForkfulLogo bare size={28} />
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.04em", color: "var(--color-ink)" }}>Forkful</span>
            </Link>
          </div>

          {/* Card */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--color-rule)", borderRadius: "13px", padding: "28px 24px", boxShadow: "0 8px 40px rgba(0,0,0,0.08)" }}>

            <AnimatePresence mode="wait">

              {/* ── OTP step ── */}
              {authStep === "otp" ? (
                <motion.div key="otp" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}
                  style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 11, background: "rgba(255,87,51,0.10)", border: "1px solid rgba(255,87,51,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF5733" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7"/></svg>
                    </div>
                    <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-ink)", margin: "0 0 6px" }}>Check your inbox</h1>
                    <p style={{ fontSize: "0.8rem", color: "var(--color-manifest)", margin: 0 }}>
                      Code sent to <span style={{ fontWeight: 700, color: "#FF5733" }}>{otpEmail}</span>
                    </p>
                  </div>
                  <OtpInput value={otp} onChange={setOtp} onComplete={handleVerifyOtp} disabled={otpVerifying} />
                  <PrimaryBtn loading={otpVerifying} disabled={otp.length !== 6} onClick={() => handleVerifyOtp()}>
                    {otpVerifying ? "Verifying…" : "Confirm & Continue"}
                  </PrimaryBtn>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem" }}>
                    <button type="button" onClick={() => { setAuthStep("form"); setOtp(""); }} style={{ color: "var(--color-ghost)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-body)" }}>← Back</button>
                    <button type="button" onClick={handleResendOtp} disabled={resendCooldown > 0 || loading}
                      style={{ color: resendCooldown > 0 ? "var(--color-ghost)" : "#FF5733", background: "none", border: "none", cursor: resendCooldown > 0 ? "default" : "pointer", fontWeight: 600, fontFamily: "var(--font-body)" }}>
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                    </button>
                  </div>
                </motion.div>

              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

                  {/* Tab switcher */}
                  <div style={{ display: "flex", borderBottom: "1px solid var(--color-rule)", marginBottom: 22 }}>
                    {(["signin", "signup"] as const).map((t) => (
                      <button key={t} type="button" onClick={() => setTab(t)}
                        style={{ flex: 1, height: 38, fontSize: "0.8rem", fontWeight: 700, fontFamily: "var(--font-body)",
                          background: "none", border: "none", borderBottom: `2px solid ${tab === t ? "#FF5733" : "transparent"}`,
                          color: tab === t ? "#FF5733" : "var(--color-ghost)", cursor: "pointer", marginBottom: -1, transition: "color 0.18s" }}>
                        {t === "signin" ? "Log In" : "Create Account"}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">

                    {tab === "signin" && (
                      <motion.form key="signin" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                        onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-ink)", margin: "0 0 6px" }}>
                          Log in to Forkful
                        </h1>
                        <GoogleBtn onClick={() => googleLogin()} loading={loading} />
                        <Divider label="or" />
                        <AuthField id="si-email" label="Email" type="email" value={siEmail} onChange={setSiEmail} autoComplete="email" required />
                        <div>
                          <AuthField id="si-password" label="Password" type="password" value={siPassword} onChange={setSiPassword} autoComplete="current-password" required />
                          <div style={{ textAlign: "right", marginTop: 5 }}>
                            <button type="button" style={{ fontSize: "0.73rem", color: "var(--color-ghost)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-body)" }}
                              onClick={() => toast("Password reset coming soon.")}>Forgot password?</button>
                          </div>
                        </div>
                        <PrimaryBtn loading={loading} disabled={!siEmail.trim() || !siPassword.trim()}>
                          {loading ? "Signing in…" : "Sign In"}
                        </PrimaryBtn>
                      </motion.form>
                    )}

                    {tab === "signup" && (
                      <motion.form key="signup" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                        onSubmit={handleSignUp} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-ink)", margin: "0 0 4px" }}>
                          Create your account
                        </h1>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <AuthField id="su-fname" label="First Name" value={suFirst} onChange={setSuFirst} required />
                          <AuthField id="su-lname" label="Last Name" value={suLast} onChange={setSuLast} required />
                        </div>
                        <AuthField id="su-mobile" label="Mobile" value={suMobile} onChange={setSuMobile} autoComplete="tel" required />
                        <AuthField id="su-email" label="Email" type="email" value={suEmail} onChange={setSuEmail} autoComplete="email" required />
                        <AuthField id="su-pw" label="Password" type="password" value={suPw} onChange={setSuPw} autoComplete="new-password" required hint="Min 8 characters" />
                        <div>
                          <AuthField id="su-confirm" label="Confirm Password" type="password" value={suConfirm} onChange={setSuConfirm} autoComplete="new-password" required />
                          {suConfirm.length > 0 && (
                            <p style={{ fontSize: "0.7rem", marginTop: 4, fontWeight: 600, color: pwMatch ? "#22C55E" : "#EF4444" }}>
                              {pwMatch ? "✓ Passwords match" : "Passwords don't match"}
                            </p>
                          )}
                        </div>
                        <PrimaryBtn loading={loading} disabled={!suFirst.trim() || !suLast.trim() || !suMobile.trim() || !suEmail.trim() || !suPw.trim() || !suConfirm.trim() || !pwMatch}>
                          {loading ? "Creating account…" : "Create Account"}
                        </PrimaryBtn>
                      </motion.form>
                    )}

                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <p style={{ textAlign: "center", fontSize: "0.68rem", color: "var(--color-ghost)", marginTop: 18, fontFamily: "var(--font-mono)" }}>
            © 2026 Forkful ·{" "}
            <Link to="/landing" style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 3 }}>Home</Link>
            {" · "}
            <a href="/dev/login" style={{ color: "inherit", textDecoration: "none", opacity: 0.2 }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.7"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.2"; }}>dev</a>
          </p>
        </motion.div>
      </div>

      {/* Responsive layout */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes auth-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        .auth-float-circle {
          position: absolute;
          border-radius: 50%;
          background: rgba(255,255,255,0.07);
          animation: auth-float 6s ease-in-out infinite;
        }
        /* Mobile: hide left panel, go full width on form */
        @media (max-width: 900px) {
          .login-left-panel { display: none !important; }
          .login-right-panel { flex: 0 0 100% !important; max-width: 100% !important; }
          .login-mobile-logo { display: block !important; }
          .login-desktop-logo { display: none !important; }
        }
        /* Desktop: both panels visible, mobile logo hidden */
        @media (min-width: 901px) {
          .login-left-panel { display: flex; }
          .login-right-panel { flex: 0 0 50% !important; max-width: 50% !important; }
          .login-mobile-logo { display: none; }
          .login-desktop-logo { display: block; }
        }
      `}</style>
    </div>
  );
};

export default Login;
