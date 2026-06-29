import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { riderService } from "../main";
import toast from "react-hot-toast";
import { BiLoader } from "react-icons/bi";

interface RiderOrderRequestProps {
  orderId: string;
  restaurantName?: string;
  riderAmount?: number;
  distanceMeters?: number | null;
  // ISO timestamp from the server marking when this offer stops being
  // shown. The countdown is derived from this, not a client-only timer,
  // so the displayed time always matches the actual server-side window.
  expiresAt?: string | null;
  onAccepted: () => void;
  onRejected?: (orderId: string) => void;
}

const ACCEPT_WINDOW_SECONDS = 30;

const RiderOrderRequest = ({
  orderId,
  restaurantName,
  riderAmount,
  distanceMeters,
  expiresAt,
  onAccepted,
  onRejected,
}: RiderOrderRequestProps) => {
  const [accepting, setAccepting] = useState(false);
  const [declined, setDeclined] = useState(false);

  const expiryMs = useMemo(
    () => (expiresAt ? new Date(expiresAt).getTime() : Date.now() + ACCEPT_WINDOW_SECONDS * 1000),
    [expiresAt]
  );

  const computeSecondsLeft = () => Math.max(0, Math.ceil((expiryMs - Date.now()) / 1000));

  const [secondsLeft, setSecondsLeft] = useState(computeSecondsLeft);

  useEffect(() => {
    if (secondsLeft <= 0) {
      setDeclined(true);
      if (onRejected) {
        onRejected(orderId);
      }
      return;
    }
    const timer = setInterval(() => {
      setSecondsLeft(computeSecondsLeft());
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, orderId, onRejected]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await axios.post(
        `${riderService}/api/rider/order/accept/${orderId}`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success("Order accepted!");
      onAccepted();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to accept order");
      if (onRejected) {
        onRejected(orderId);
      }
    } finally {
      setAccepting(false);
    }
  };

  if (declined) return null;

  const distanceLabel =
    typeof distanceMeters === "number"
      ? distanceMeters < 1000
        ? `${Math.round(distanceMeters)} m away`
        : `${(distanceMeters / 1000).toFixed(1)} km away`
      : null;

  return (
    <div
      className="glass-card p-5 space-y-4 rounded-2xl"
      style={{ border: "1px solid rgba(16,185,129,0.35)" }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between">
        <span
          className="text-[11px] font-extrabold tracking-wider uppercase px-3 py-1 rounded-full"
          style={{ backgroundColor: "var(--color-signal-light)", color: "var(--color-signal)" }}
        >
          New Order
        </span>
        <span
          className="text-[11px] font-mono font-bold px-3 py-1 rounded-full"
          style={{ backgroundColor: "var(--color-alert-light)", color: "var(--color-alert)" }}
        >
          {secondsLeft}s
        </span>
      </div>

      {/* Order details row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="var(--color-manifest)" strokeWidth="2.5">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          <span className="text-[14px] font-bold truncate" style={{ color: "var(--color-ink)" }}>
            {restaurantName || `Order #${orderId.slice(-6).toUpperCase()}`}
          </span>
        </div>
        {typeof riderAmount === "number" && (
          <span className="text-sm font-extrabold flex-shrink-0" style={{ color: "var(--color-signal)" }}>
            ₹{riderAmount}
          </span>
        )}
      </div>

      {distanceLabel && (
        <p className="text-xs" style={{ color: "var(--color-ghost)" }}>{distanceLabel}</p>
      )}

      {/* Timer bar */}
      <div className="w-full h-1 rounded-full" style={{ backgroundColor: "var(--color-rule)" }}>
        <div
          className="h-full rounded-full"
          style={{
            backgroundColor: "var(--color-signal)",
            width: `${(secondsLeft / ACCEPT_WINDOW_SECONDS) * 100}%`,
            transition: "width 1s linear"
          }}
        />
      </div>

      {/* Accept button */}
      <button
        onClick={handleAccept}
        disabled={accepting}
        className="w-full h-12 text-sm font-bold text-white transition-all duration-200 active:scale-[0.97] disabled:opacity-50 cursor-pointer shadow-md flex items-center justify-center gap-2"
        style={{
          backgroundColor: "var(--color-signal)",
          borderRadius: "var(--radius-md)"
        }}
      >
        {accepting ? (
          <>
            <BiLoader className="animate-spin text-base" />
            <span>Accepting…</span>
          </>
        ) : (
          <span>Accept Order</span>
        )}
      </button>
    </div>
  );
};

export default RiderOrderRequest;
