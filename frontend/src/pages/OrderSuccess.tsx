import axios from "axios";
import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { utilsService } from "../main";
import toast from "react-hot-toast";
import { BsArrowRight } from "react-icons/bs";
import ForkfulLogo from "../components/ForkfulLogo";
import { useAppData } from "../context/AppContext";

const OrderSuccess = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = params.get("session_id");
  const { darkMode } = useAppData();

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) return;

      try {
        await axios.post(`${utilsService}/api/payment/stripe/verify`, {
          sessionId,
        });

        toast.success("Payment successful");
      } catch (error) {
        toast.error("Stripe verification failed");
        console.log(error);
      }
    };

    verifyPayment();
  }, [sessionId]);

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
            Your order has been verified and placed successfully
          </p>
        </div>

        {sessionId && (
          <div className="rounded-xl p-3 border text-xs text-left space-y-1" style={{ backgroundColor: "rgba(255,255,255,0.02)", borderColor: "var(--color-rule)" }}>
            <span style={{ color: "var(--color-ghost)" }} className="font-mono text-[9px] uppercase tracking-wider block">Session ID</span>
            <p className="font-mono break-all text-xs" style={{ color: "var(--color-ink)" }}>{sessionId}</p>
          </div>
        )}

        <div className="space-y-2 pt-2">
          <button
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-bold text-white transition-all active:scale-[0.98] glow-orange"
            onClick={() => navigate("/orders")}
          >
            Your Orders <BsArrowRight size={14} />
          </button>
          <button
            className="btn-ghost flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-semibold transition-all active:scale-[0.98]"
            onClick={() => navigate("/")}
          >
            Order More <BsArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
