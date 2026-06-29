import { useNavigate, useParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect } from "react";
import { BsArrowRight } from "react-icons/bs";
import ForkfulLogo from "../components/ForkfulLogo";

const PaymentSuccess = () => {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();
  const { fetchCart, darkMode } = useAppData();

  useEffect(() => {
    fetchCart();
  }, []);

  return (
    <div
      className="flex min-h-[70vh] items-center justify-center px-4"
      style={{ backgroundColor: "var(--bg-base)" }}
    >
      <div className="w-full max-w-md rounded-3xl p-6 md:p-8 text-center space-y-5 glass-card gradient-border noise-overlay">
        <div className="flex flex-col items-center justify-center gap-2 mb-2">
          <ForkfulLogo size={40} dark={darkMode} />
          <span style={{ fontFamily: "var(--font-display, system-ui)", fontWeight: 800, letterSpacing: "-0.04em", fontSize: "1.25rem", lineHeight: 1 }}>
            <span style={{ color: darkMode ? "#F0EEE9" : "#111111" }}>Fork</span>
            <span style={{
              color: darkMode ? "#FF6B45" : "#FF5733",
              textShadow: darkMode ? "0 0 20px rgba(255, 107, 69, 0.4)" : "none"
            }}>ful</span>
          </span>
        </div>

        <div
          className="w-16 h-16 rounded-full border-4 flex items-center justify-center mx-auto shadow-md"
          style={{ borderColor: "var(--color-signal)", backgroundColor: "rgba(34, 197, 94, 0.08)" }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-signal)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-black font-display" style={{ color: "var(--color-ink)" }}>Payment Successful</h1>
          <p className="text-xs" style={{ color: "var(--color-manifest)" }}>
            Your order has been placed successfully
          </p>
        </div>

        {paymentId && (
          <div className="rounded-xl p-3 border text-xs text-left space-y-1" style={{ backgroundColor: "rgba(255,255,255,0.02)", borderColor: "var(--color-rule)" }}>
            <span style={{ color: "var(--color-ghost)" }} className="font-mono text-[9px] uppercase tracking-wider block">Payment ID</span>
            <p className="font-mono break-all" style={{ color: "var(--color-ink)" }}>{paymentId}</p>
          </div>
        )}

        <div className="space-y-2 pt-2">
          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-bold text-white transition-all active:scale-[0.98] glow-orange"
            style={{ backgroundColor: "var(--color-route)" }}
            onClick={() => navigate("/")}
          >
            Order More <BsArrowRight size={14} />
          </button>
          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-bold text-white transition-all active:scale-[0.98] glow-orange"
            style={{ backgroundColor: "var(--color-route)" }}
            onClick={() => navigate("/orders")}
          >
            Your Orders <BsArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
