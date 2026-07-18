/**
 * DevLogin.tsx — Developer access portal at /dev/login
 *
 * All bypass profiles, role switching, and dev-only auth live here.
 * This page is intentionally utilitarian to distinguish it from
 * the customer-facing login at /login.
 *
 * Accessible from: footer link on /login (hidden, low-contrast)
 * Not linked from: landing page nav, main customer flow
 */

import axios from "axios";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../main";
import toast from "react-hot-toast";
import { useAppData } from "../context/AppContext";

const BYPASS_PROFILES = [
  { email: "customer@tomato.com", name: "Test Customer", role: "customer", label: "Customer" },
  { email: "arjun.rider@forkful.dev", name: "Arjun Singh", role: "rider", label: "Rider" },
  { email: "spicegarden@forkful.dev", name: "Spice Garden", role: "seller", label: "Seller" },
  { email: "admin@tomato.com", name: "Support Admin", role: "admin", label: "Admin" },
] as const;

const ROLE_COLORS: Record<string, string> = {
  customer: "#2563EB",
  rider: "#059669",
  seller: "#D97706",
  admin: "#7C3AED",
};

const DevLogin = () => {
  const [loading, setLoading] = useState(false);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { setUser, setIsAuth } = useAppData();

  const handleBypass = async (profile: typeof BYPASS_PROFILES[number]) => {
    setActiveProfile(profile.email);
    setLoading(true);
    try {
      const { data } = await axios.post(`${authService}/api/auth/dev-login`, {
        email: profile.email,
        name: profile.name,
        role: profile.role,
      });
      localStorage.setItem("token", data.token);
      setUser(data.user);
      setIsAuth(true);
      toast.success(`[DEV] Logged in as ${profile.name} (${profile.role})`);
      navigate("/");
    } catch {
      toast.error("Bypass login failed — is the auth service running?");
    } finally {
      setLoading(false);
      setActiveProfile(null);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      const { data } = await axios.post(`${authService}/api/auth/login-password`, {
        email: email.trim(),
        password: password.trim(),
      });
      localStorage.setItem("token", data.token);
      setUser(data.user);
      setIsAuth(true);
      toast.success(`[DEV] Signed in as ${data.user?.email}`);
      navigate("/");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0B0C0F",
        color: "#94A3B8",
        fontFamily: "ui-monospace, 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
      }}
    >
      {/* Header */}
      <div style={{ width: "100%", maxWidth: 480, marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#22C55E", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: "0.65rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#334155" }}>Developer Access Portal</span>
        </div>
        <h1 style={{ fontFamily: "ui-monospace, monospace", fontSize: "1.05rem", fontWeight: 700, color: "#E2E8F0", margin: "0 0 4px", letterSpacing: "-0.01em" }}>
          forkful / dev-login
        </h1>
        <p style={{ fontSize: "0.72rem", color: "#475569", margin: 0 }}>
          Not a customer-facing page. Bypass profiles and dev auth only.
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Bypass profiles */}
        <section>
          <p style={{ fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#334155", marginBottom: 8 }}>
            — Quick Bypass
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {BYPASS_PROFILES.map((p) => {
              const color = ROLE_COLORS[p.role];
              const isActive = activeProfile === p.email && loading;
              return (
                <button
                  key={p.email}
                  onClick={() => handleBypass(p)}
                  disabled={loading}
                  style={{
                    padding: "12px 14px",
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${isActive ? color : "rgba(255,255,255,0.07)"}`,
                    borderRadius: 6,
                    cursor: loading ? "not-allowed" : "pointer",
                    textAlign: "left",
                    transition: "border-color 0.15s, background 0.15s",
                    opacity: loading && !isActive ? 0.4 : 1,
                  }}
                  onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.borderColor = `${color}60`; e.currentTarget.style.background = `${color}0A`; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = isActive ? color : "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {p.label}
                    </span>
                    {isActive && (
                      <div style={{ width: 10, height: 10, border: `1.5px solid ${color}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                    )}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: "0.62rem", color: "#334155", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.email}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
          <span style={{ fontSize: "0.6rem", color: "#334155", letterSpacing: "0.1em" }}>OR SIGN IN WITH CREDENTIALS</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
        </div>

        {/* Password login */}
        <section>
          <p style={{ fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#334155", marginBottom: 8 }}>
            — Credential Login
          </p>
          <form onSubmit={handlePasswordLogin} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@forkful.dev"
              required
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 6,
                padding: "10px 12px",
                fontSize: "0.82rem",
                color: "#E2E8F0",
                fontFamily: "inherit",
                outline: "none",
                width: "100%",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              required
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 6,
                padding: "10px 12px",
                fontSize: "0.82rem",
                color: "#E2E8F0",
                fontFamily: "inherit",
                outline: "none",
                width: "100%",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
            />
            <button
              type="submit"
              disabled={loading || !email.trim() || !password.trim()}
              style={{
                padding: "10px",
                fontSize: "0.78rem",
                fontWeight: 700,
                fontFamily: "inherit",
                color: "#0B0C0F",
                background: loading ? "rgba(226,232,240,0.4)" : "#E2E8F0",
                border: "none",
                borderRadius: 6,
                cursor: loading ? "not-allowed" : "pointer",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {loading ? "…" : "Sign In →"}
            </button>
          </form>
        </section>

        {/* Footer */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link to="/login" style={{ fontSize: "0.68rem", color: "#334155", textDecoration: "none" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#64748B"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#334155"; }}>
            ← Customer login
          </Link>
          <span style={{ fontSize: "0.62rem", color: "#1E293B" }}>
            Forkful Dev · Internal only
          </span>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default DevLogin;
