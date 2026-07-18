/**
 * AdminLogin.tsx — Standalone admin authentication portal at /admin/login
 *
 * Security properties:
 *  - Accepts ONLY users whose role === "admin" after credential check.
 *  - No dev bypass logic — that lives exclusively at /dev/login.
 *  - Not linked from landing page, main navbar, or customer login.
 *  - Hits the standard login-password endpoint; role is verified client-side
 *    after the response (server-enforced on protected admin API routes).
 *
 * Visual design: deliberately plain/utilitarian — not the consumer brand
 * experience. Shares no UI components with the customer login beyond the
 * generic FloatingLabelInput atom.
 */

import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../main";
import toast from "react-hot-toast";
import { useAppData } from "../context/AppContext";

// ── Minimal input (inline, no floating label — keeps this page utilitarian) ──
const Field = ({
  id, label, type = "text", value, onChange, autoComplete,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; autoComplete?: string;
}) => {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === "password";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        htmlFor={id}
        style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", fontFamily: "ui-monospace, monospace" }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          type={isPassword && !showPw ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete}
          required
          style={{
            width: "100%",
            height: "44px",
            padding: "0 40px 0 12px",
            fontSize: "0.875rem",
            fontFamily: "ui-monospace, monospace",
            color: "#E2E8F0",
            background: focused ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${focused ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: "5px",
            outline: "none",
            transition: "border-color 0.15s, background 0.15s",
            boxSizing: "border-box",
          }}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw((p) => !p)}
            aria-label={showPw ? "Hide password" : "Show password"}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#475569", display: "flex", padding: 0 }}
          >
            {showPw ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────
const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setUser, setIsAuth } = useAppData();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    try {
      const { data } = await axios.post(`${authService}/api/auth/login-password`, {
        email: email.trim(),
        password: password.trim(),
      });

      // Role gate — only admins may proceed
      if (data.user?.role !== "admin") {
        setError("Access denied. This portal is for administrators only.");
        return;
      }

      localStorage.setItem("token", data.token);
      setUser(data.user);
      setIsAuth(true);
      toast.success("Signed in.");
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0B0C0F",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        fontFamily: "ui-monospace, 'Cascadia Code', 'Fira Code', monospace",
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            {/* Shield icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span style={{ fontSize: "0.62rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "#334155" }}>
              Admin Access · Restricted
            </span>
          </div>
          <h1 style={{ fontSize: "1rem", fontWeight: 700, color: "#94A3B8", margin: "0 0 4px", letterSpacing: "-0.01em" }}>
            forkful / admin-login
          </h1>
          <p style={{ fontSize: "0.7rem", color: "#334155", margin: 0 }}>
            Administrator credentials only. All sessions are logged.
          </p>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSignIn}
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "8px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <Field id="adm-email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
          <Field id="adm-password" label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />

          {/* Inline error */}
          {error && (
            <p style={{ fontSize: "0.75rem", color: "#F87171", margin: 0, padding: "8px 10px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.18)", borderRadius: 4 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            style={{
              height: "42px",
              fontSize: "0.78rem",
              fontWeight: 700,
              fontFamily: "inherit",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: loading || !email.trim() || !password.trim() ? "#334155" : "#0B0C0F",
              background: loading || !email.trim() || !password.trim() ? "rgba(255,255,255,0.06)" : "#94A3B8",
              border: `1px solid ${loading || !email.trim() || !password.trim() ? "rgba(255,255,255,0.08)" : "#94A3B8"}`,
              borderRadius: "5px",
              cursor: loading || !email.trim() || !password.trim() ? "not-allowed" : "pointer",
              transition: "background 0.15s, color 0.15s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {loading ? (
              <>
                <div style={{ width: 12, height: 12, border: "1.5px solid #475569", borderTopColor: "#94A3B8", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                Authenticating…
              </>
            ) : (
              "Sign In →"
            )}
          </button>
        </form>

        {/* Footer */}
        <div
          style={{
            marginTop: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.65rem",
            color: "#1E293B",
          }}
        >
          <a
            href="/login"
            style={{ color: "inherit", textDecoration: "none", transition: "color 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#475569"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#1E293B"; }}
          >
            ← User login
          </a>
          <span>Forkful · Internal</span>
          <a
            href="/dev/login"
            style={{ color: "inherit", textDecoration: "none", opacity: 0.4, transition: "opacity 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.4"; }}
          >
            dev →
          </a>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AdminLogin;
