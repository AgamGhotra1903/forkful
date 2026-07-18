import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import axios from "axios";
import { riderService, restaurantService } from "../main";

const SESSION_KEY = "aadhar_banner_dismissed";

/**
 * AadhaarBanner — shows a dismissible amber warning strip for riders and
 * sellers whose Aadhaar verification is still pending.
 *
 * - Fetches verification status on mount (once per role).
 * - Stores a dismissal flag in sessionStorage so it stays gone for the
 *   current browser session but reappears on next login.
 */
const AadhaarBanner = () => {
  const { user } = useAppData();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user || (user.role !== "rider" && user.role !== "seller")) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const check = async () => {
      try {
        const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
        if (user.role === "rider") {
          const { data } = await axios.get(`${riderService}/api/rider/myprofile`, { headers });
          if (data && data.isVerified === false) setShow(true);
        } else {
          const { data } = await axios.get(`${restaurantService}/api/restaurant/my`, { headers });
          if (data?.restaurant && data.restaurant.isVerified === false) setShow(true);
        }
      } catch {
        // Silently ignore — don't block UI if API fails
      }
    };
    check();
  }, [user]);

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      role="alert"
      className="w-full px-4 py-3 flex items-center gap-3 animate-fade-in"
      style={{
        background: "linear-gradient(90deg, rgba(245,158,11,0.12) 0%, rgba(234,88,12,0.08) 100%)",
        borderBottom: "1px solid rgba(245,158,11,0.25)",
      }}
    >
      {/* Icon */}
      <span className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </span>

      {/* Copy */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold" style={{ color: "#d97706" }}>
          Aadhaar Verification Pending
        </p>
        <p className="text-[11px]" style={{ color: "var(--color-manifest)" }}>
          Complete your verification now to keep your account active and avoid service interruption.
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={() => navigate("/account")}
        className="flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all hover:brightness-110 active:scale-95"
        style={{ backgroundColor: "#f59e0b", color: "#0F172A" }}
      >
        Verify Now →
      </button>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg transition-colors hover:bg-amber-500/10"
        style={{ color: "#d97706" }}
        aria-label="Dismiss banner"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  );
};

export default AadhaarBanner;
