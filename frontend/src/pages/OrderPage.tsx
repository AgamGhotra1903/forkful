import { useParams, Link } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { useEffect, useRef, useState } from "react";
import type { IOrder } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import UserOrderMap from "../components/UserOrderMap";
import toast from "react-hot-toast";
import { StatusPill, SkeletonCard } from "../components/ui";
import { ChatDrawer } from "../components/ChatDrawer";
import { BiReceipt, BiStoreAlt, BiTime, BiPackage, BiCycling, BiSolidBolt, BiCheckDouble, BiArrowBack, BiLoader, BiChat, BiStar, BiSolidStar } from "react-icons/bi";


/* ── Status timeline config ── */
const STATUS_SEQUENCE = [
  "placed", "accepted", "preparing", "ready_for_rider",
  "rider_assigned", "picked_up", "delivered",
] as const;

const STATUS_LABELS: Record<string, string> = {
  placed: "Order received",
  accepted: "Restaurant confirmed",
  preparing: "Kitchen is preparing",
  ready_for_rider: "Ready for pickup",
  rider_assigned: "Rider on the way to restaurant",
  picked_up: "Rider heading your way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  placed: <BiReceipt className="text-base" />,
  accepted: <BiStoreAlt className="text-base" />,
  preparing: <BiTime className="text-base" />,
  ready_for_rider: <BiPackage className="text-base" />,
  rider_assigned: <BiCycling className="text-base" />,
  picked_up: <BiSolidBolt className="text-base" />,
  delivered: <BiCheckDouble className="text-base" />,
};

function getETAMinutes(status: string): number {
  const base: Record<string, number> = {
    placed: 45, accepted: 40, preparing: 30,
    ready_for_rider: 20, rider_assigned: 18,
    picked_up: 12, delivered: 0, cancelled: 0,
  };
  return base[status] ?? 30;
}



const OrderPage = () => {
  const { id } = useParams();
  const { socket } = useSocket();

  const [order, setOrder] = useState<IOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [riderLocation, setRiderLocation] = useState<[number, number] | null>(null);
  const [restaurantCoordinates, setRestaurantCoordinates] = useState<[number, number] | null>(null);
  const [lastRiderUpdatedAt, setLastRiderUpdatedAt] = useState<number | null>(null);

  // Live countdown
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const endTimeRef = useRef<number | null>(null);


  // Review states
  const [hasReviewed, setHasReviewed] = useState(false);
  const [checkingReview, setCheckingReview] = useState(false);
  const [dismissedReviewPrompt, setDismissedReviewPrompt] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Rider rating states — same pattern as the restaurant review above, but
  // for rating the rider who delivered this order.
  const [hasRatedRider, setHasRatedRider] = useState(false);
  const [checkingRiderRating, setCheckingRiderRating] = useState(false);
  const [dismissedRiderRatingPrompt, setDismissedRiderRatingPrompt] = useState(false);
  const [riderRating, setRiderRating] = useState(5);
  const [riderRatingText, setRiderRatingText] = useState("");
  const [submittingRiderRating, setSubmittingRiderRating] = useState(false);

  const checkReviewStatus = async () => {
    if (!id) return;
    setCheckingReview(true);
    try {
      const res = await axios.get(`${restaurantService}/api/reviews/check/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setHasReviewed(res.data.reviewed);
    } catch (err) {
      console.error("Failed to check review status:", err);
    } finally {
      setCheckingReview(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setSubmittingReview(true);
    try {
      await axios.post(
        `${restaurantService}/api/reviews`,
        {
          orderId: order._id,
          restaurantId: typeof order.restaurantId === "object" ? (order.restaurantId as any)._id : order.restaurantId,
          rating: reviewRating,
          text: reviewText,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success("Review submitted! Processing embeddings in background...");
      setHasReviewed(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const checkRiderRatingStatus = async () => {
    if (!id) return;
    setCheckingRiderRating(true);
    try {
      const res = await axios.get(`${restaurantService}/api/rider-reviews/check/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setHasRatedRider(res.data.reviewed);
    } catch (err) {
      console.error("Failed to check rider rating status:", err);
    } finally {
      setCheckingRiderRating(false);
    }
  };

  const handleSubmitRiderRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setSubmittingRiderRating(true);
    try {
      await axios.post(
        `${restaurantService}/api/rider-reviews`,
        {
          orderId: order._id,
          rating: riderRating,
          text: riderRatingText,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success("Thanks for rating your rider!");
      setHasRatedRider(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit rider rating");
    } finally {
      setSubmittingRiderRating(false);
    }
  };

  const fetchOrder = async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/order/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setOrder(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [id]);

  // ── Live ETA countdown ──────────────────────────────────────────
  useEffect(() => {
    if (!order || order.status === "delivered" || order.status === "cancelled") {
      setSecondsLeft(null);
      endTimeRef.current = null;
      return;
    }
    const etaMs = getETAMinutes(order.status) * 60_000;
    endTimeRef.current = Date.now() + etaMs;
    setSecondsLeft(Math.max(0, Math.round(etaMs / 1000)));

    const iv = setInterval(() => {
      if (!endTimeRef.current) return;
      const remaining = Math.round((endTimeRef.current - Date.now()) / 1000);
      if (remaining <= 0) {
        setSecondsLeft(0);
        clearInterval(iv);
      } else {
        setSecondsLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [order?.status]);

  useEffect(() => {
    if (order?.status === "delivered") {
      checkReviewStatus();
      if (order.riderId) {
        checkRiderRatingStatus();
      }
    }
  }, [order?.status, order?.riderId]);

  useEffect(() => {
    if (!socket) return;
    const onUpdate = () => fetchOrder();
    socket.on("order:update", onUpdate);
    socket.on("order:rider_assigned", onUpdate);
    socket.on("order:picked_up", onUpdate);
    socket.on("order:delivered", onUpdate);
    return () => {
      socket.off("order:update", onUpdate);
      socket.off("order:rider_assigned", onUpdate);
      socket.off("order:picked_up", onUpdate);
      socket.off("order:delivered", onUpdate);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !id) return;
    socket.emit("join", `order:${id}`);
    return () => { socket.emit("leave", `order:${id}`); };
  }, [socket, id]);

  useEffect(() => {
    if (!socket) return;
    // Backend emits "rider:location_update" with { lat, lng, orderId, riderId, timestamp }
    const onLoc = ({ lat, lng, orderId: incomingOrderId }: { lat: number; lng: number; orderId: string }) => {
      if (incomingOrderId !== id) return;
      if (typeof lat !== "number" || typeof lng !== "number") return;
      setRiderLocation([lat, lng]);
      setLastRiderUpdatedAt(Date.now());
    };
    socket.on("rider:location_update", onLoc);
    return () => {
      socket.off("rider:location_update", onLoc);
    };
  }, [socket, id]);


  // Use restaurantLocation embedded in the order document (already populated at order creation).
  // Fallback: fetch the restaurant only if the order somehow lacks coordinates.
  useEffect(() => {
    if (!order) return;

    // Prefer the coordinates already on the order (most reliable, no extra request)
    if (order.restaurantLocation?.latitude && order.restaurantLocation?.longitude) {
      setRestaurantCoordinates([order.restaurantLocation.latitude, order.restaurantLocation.longitude]);
      return;
    }

    // Fallback: fetch restaurant directly (fetchSingleRestaurant returns the doc at top level)
    if (!order.restaurantId) return;
    (async () => {
      try {
        const { data } = await axios.get(`${restaurantService}/api/restaurant/${order.restaurantId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        // fetchSingleRestaurant returns the restaurant object directly (not nested)
        if (data?.autoLocation?.coordinates) {
          const [lng, lat] = data.autoLocation.coordinates;
          setRestaurantCoordinates([lat, lng]);
        }
      } catch { }
    })();
  }, [order?.restaurantId, order?.restaurantLocation]);

  useEffect(() => {
    if (!order) { setRiderLocation(null); return; }
    // Only show rider marker once a rider is actually assigned
    if (order.status !== "rider_assigned" && order.status !== "picked_up") { setRiderLocation(null); return; }
    if (order.status === "rider_assigned" && restaurantCoordinates) { setRiderLocation(restaurantCoordinates); return; }
    if (order.status === "picked_up" && restaurantCoordinates) {
      const [sLat, sLng] = restaurantCoordinates;
      const eLat = order.deliveryAddress?.latitude;
      const eLng = order.deliveryAddress?.longitude;
      if (!eLat || !eLng) return;
      let progress = 0;
      const iv = setInterval(() => {
        progress = Math.min(1, progress + 0.05);
        setRiderLocation([sLat + (eLat - sLat) * progress, sLng + (eLng - sLng) * progress]);
        if (progress >= 1) clearInterval(iv);
      }, 1000);
      return () => clearInterval(iv);
    }
  }, [order?.status, restaurantCoordinates, order?.deliveryAddress]);



  const handleCancel = async () => {
    setCancelling(true);
    try {
      await axios.post(`${restaurantService}/api/order/cancel/${id}`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      toast.success("Order cancelled");
      fetchOrder();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to cancel");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen px-4 pt-8 pb-16"
        style={{ backgroundColor: "var(--bg-base)" }}
        aria-live="polite"
        aria-busy="true"
      >
        <div className="mx-auto max-w-2xl space-y-4">
          <SkeletonCard className="h-40" />
          <SkeletonCard className="h-64" />
          <SkeletonCard className="h-32" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-base)" }}>
        <div className="text-center space-y-3 max-w-xs px-4">
          <p className="text-base font-bold" style={{ color: "var(--color-ink)" }}>Order not found</p>
          <p className="text-xs" style={{ color: "var(--color-manifest)" }}>
            This order doesn't exist or you don't have access to it.
          </p>
          <Link
            to="/orders"
            className="inline-block mt-4 px-5 h-10 leading-10 rounded-xl text-xs font-bold text-white transition active:scale-[0.97]"
            style={{ backgroundColor: "var(--color-route)" }}
          >
            View all orders
          </Link>
        </div>
      </div>
    );
  }

  const isCancelled = order.status === "cancelled";
  const isDelivered = order.status === "delivered";
  const isLive = ["rider_assigned", "picked_up"].includes(order.status);
  // Show map from the moment the order is placed through delivery
  const showMap = !isCancelled && restaurantCoordinates && order.deliveryAddress?.latitude;
  const currentStatusIndex = STATUS_SEQUENCE.indexOf(order.status as any);
  const eta = getETAMinutes(order.status);
  const staleSeconds = lastRiderUpdatedAt ? Math.floor((Date.now() - lastRiderUpdatedAt) / 1000) : null;
  const isStale = staleSeconds != null && staleSeconds >= 20;

  const restaurantName = typeof order.restaurantId === "object"
    ? (order.restaurantId as any).name
    : "Restaurant";

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: "var(--bg-base)" }}>

      {/* ── Top section ── */}
      <div className="px-4 pt-6 pb-5 glass-panel">
        <div className="mx-auto max-w-2xl">

          {/* Breadcrumb */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <Link
                to="/orders"
                className="flex items-center gap-1 text-xs font-mono transition-colors font-semibold"
                style={{ color: "var(--color-manifest)" }}
                aria-label="Back to orders"
              >
                <BiArrowBack className="text-sm" />
                Orders
              </Link>
              <span style={{ color: "var(--color-rule)" }}>/</span>
              <span className="text-xs font-mono font-bold" style={{ color: "var(--color-ink)" }}>
                #{id?.slice(-6).toUpperCase()}
              </span>
            </div>
            <StatusPill status={order.status} />
          </div>

          {/* ── ETA Block ── */}
          {!isCancelled && !isDelivered && (
            <div className="mb-2 p-5 rounded-3xl" style={{ background: "radial-gradient(circle at center, rgba(255,87,51,0.08) 0%, transparent 70%)" }}>
              <p className="text-[10px] font-mono tracking-widest uppercase mb-1 font-semibold" style={{ color: "var(--color-ghost)" }}>
                Estimated Arrival
              </p>
              <div className="flex items-baseline gap-2">
                {secondsLeft === 0 ? (
                  <span
                    style={{ fontFamily: "var(--font-display)", fontSize: "28px", lineHeight: 1, color: "var(--color-route)" }}
                    aria-live="polite"
                  >
                    Any moment now 🛵
                  </span>
                ) : (
                  <>
                    <span
                      style={{ fontFamily: "var(--font-display)", fontSize: "56px", lineHeight: 1, color: "var(--color-ink)" }}
                      aria-live="polite"
                      aria-label={`Estimated arrival: ${Math.floor((secondsLeft ?? 0) / 60)} minutes`}
                    >
                      {secondsLeft !== null
                        ? `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`
                        : `${eta}`}
                    </span>
                    <span style={{ fontSize: "20px", fontFamily: "var(--font-display)", color: "var(--color-manifest)", fontWeight: 300 }}>
                      {secondsLeft !== null ? "" : "min"}
                    </span>
                  </>
                )}
                {isLive && (
                  <span className="flex items-center gap-1.5 ml-3">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: "var(--color-route)" }} />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: "var(--color-route)" }} />
                    </span>
                    <span className="text-[10px] font-mono tracking-widest uppercase font-bold" style={{ color: "var(--color-route)" }}>
                      Live Tracking
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}

          {isDelivered && (
            <div className="mb-2">
              <span style={{ fontFamily: "var(--font-display)", fontSize: "44px", lineHeight: 1, color: "var(--color-signal)" }} role="status" className="font-black">
                Delivered
              </span>
              <p className="text-xs mt-1" style={{ color: "var(--color-manifest)" }}>Your order arrived successfully</p>
            </div>
          )}

          {isCancelled && (
            <div className="mb-2">
              <span style={{ fontFamily: "var(--font-display)", fontSize: "44px", lineHeight: 1, color: "var(--color-alert)" }} role="status" className="font-black">
                Cancelled
              </span>
              <p className="text-xs mt-1" style={{ color: "var(--color-manifest)" }}>Refund will be processed automatically</p>
            </div>
          )}
        </div>
      </div>

      {/* ── MAP ── */}
      {showMap && (
        <div className="px-4 pt-4">
          <div className="relative w-full overflow-hidden glass-card" style={{ height: 288, borderRadius: "var(--radius-lg)", border: "1px solid var(--color-rule)" }}>
            <UserOrderMap
              orderId={order._id}
              restaurantLocation={{
                lat: restaurantCoordinates[0],
                lng: restaurantCoordinates[1],
                name: restaurantName,
              }}
              customerLocation={{
                lat: order.deliveryAddress.latitude,
                lng: order.deliveryAddress.longitude,
                address: order.deliveryAddress.formattedAddress || "",
              }}
              riderLocation={
                riderLocation ? { lat: riderLocation[0], lng: riderLocation[1] } : undefined
              }
              orderStatus={order.status}
              socket={socket}
            />

            {riderLocation && (
              <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full z-[1000] glass-card">
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-70" style={{ backgroundColor: "#FF5733" }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: "#FF5733" }} />
                </span>
                <span className="text-[10px] font-semibold" style={{ color: "var(--color-ink)", fontFamily: "var(--font-mono)" }}>
                  Rider en route
                </span>
              </div>
            )}

            {isStale && riderLocation && (
              <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full z-[1000] glass-card" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-[10px] font-bold" style={{ color: "var(--color-manifest)", fontFamily: "var(--font-mono)" }}>
                  Last updated {staleSeconds}s ago
                </span>
              </div>
            )}
          </div>
        </div>
      )}


      {/* ── Bottom: Status + Details ── */}
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">

        {/* Review Prompt Card */}
        {isDelivered && !checkingReview && !hasReviewed && !dismissedReviewPrompt && (
          <section className="glass-card p-5 rounded-2xl border space-y-4 animate-fade-in shadow-sm" style={{ borderColor: "var(--color-rule)" }}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-orange-500">Rate your meal</span>
                <h3 className="text-sm font-bold font-display mt-0.5" style={{ color: "var(--color-ink)" }}>
                  How was your order from {restaurantName}?
                </h3>
              </div>
              <button
                onClick={() => setDismissedReviewPrompt(true)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-2"
                title="Dismiss"
              >
                Dismiss
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-400 uppercase">Rating:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((stars) => (
                    <button
                      key={stars}
                      type="button"
                      onClick={() => setReviewRating(stars)}
                      className="text-lg focus:outline-none transition hover:scale-110"
                    >
                      {stars <= reviewRating
                        ? <BiSolidStar className="text-amber-500" />
                        : <BiStar className="text-slate-300 dark:text-slate-600" />}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                placeholder="Share your feedback (optional)..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                maxLength={1000}
                rows={2}
                className="w-full p-3 text-xs rounded-xl glass-input outline-none focus:border-orange-500 border transition resize-none"
                style={{ borderColor: "var(--color-rule)" }}
              />
              <button
                type="submit"
                disabled={submittingReview}
                className="w-full h-9 rounded-xl text-xs font-bold text-white transition active:scale-95 flex items-center justify-center cursor-pointer shadow-md hover:brightness-105 glow-orange"
                style={{ backgroundColor: "var(--color-route)" }}
              >
                {submittingReview ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          </section>
        )}

        {/* Rider Rating Prompt Card */}
        {isDelivered && !!order.riderId && !checkingRiderRating && !hasRatedRider && !dismissedRiderRatingPrompt && (
          <section className="glass-card p-5 rounded-2xl border space-y-4 animate-fade-in shadow-sm" style={{ borderColor: "var(--color-rule)" }}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-orange-500">Rate your rider</span>
                <h3 className="text-sm font-bold font-display mt-0.5" style={{ color: "var(--color-ink)" }}>
                  How was the delivery{order.riderName ? ` with ${order.riderName}` : ""}?
                </h3>
              </div>
              <button
                onClick={() => setDismissedRiderRatingPrompt(true)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-2"
                title="Dismiss"
              >
                Dismiss
              </button>
            </div>

            <form onSubmit={handleSubmitRiderRating} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-400 uppercase">Rating:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((stars) => (
                    <button
                      key={stars}
                      type="button"
                      onClick={() => setRiderRating(stars)}
                      className="text-lg focus:outline-none transition hover:scale-110"
                    >
                      {stars <= riderRating
                        ? <BiSolidStar className="text-amber-500" />
                        : <BiStar className="text-slate-300 dark:text-slate-600" />}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                placeholder="Share feedback about your rider (optional)..."
                value={riderRatingText}
                onChange={(e) => setRiderRatingText(e.target.value)}
                maxLength={1000}
                rows={2}
                className="w-full p-3 text-xs rounded-xl glass-input outline-none focus:border-orange-500 border transition resize-none"
                style={{ borderColor: "var(--color-rule)" }}
              />
              <button
                type="submit"
                disabled={submittingRiderRating}
                className="w-full h-9 rounded-xl text-xs font-bold text-white transition active:scale-95 flex items-center justify-center cursor-pointer shadow-md hover:brightness-105 glow-orange"
                style={{ backgroundColor: "var(--color-route)" }}
              >
                {submittingRiderRating ? "Submitting..." : "Submit Rating"}
              </button>
            </form>
          </section>
        )}

        {/* ── Status timeline ── */}
        <section aria-label="Order status" className="glass-card p-5 rounded-2xl">
          <h2 className="text-[10px] font-mono tracking-widest uppercase font-semibold mb-4 border-b pb-2" style={{ color: "var(--color-ghost)", borderColor: "var(--color-rule)" }}>
            Delivery Status
          </h2>
          <div className="space-y-0">
            {STATUS_SEQUENCE.map((s, i) => {
              const isDone = currentStatusIndex > i;
              const isActive = currentStatusIndex === i;
              return (
                <div
                  key={s}
                  className="flex items-start gap-4 relative"
                  style={{ paddingBottom: i < STATUS_SEQUENCE.length - 1 ? "24px" : "0" }}
                >
                  {/* Connector line */}
                  {i < STATUS_SEQUENCE.length - 1 && (
                    <div
                      className="absolute left-[13px] top-[26px] w-[2px]"
                      style={{
                        height: "24px",
                        backgroundColor: isDone ? "var(--color-route)" : "var(--color-rule-val)",
                      }}
                    />
                  )}

                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 relative"
                    style={
                      isActive
                        ? { background: "linear-gradient(135deg, #FF5733, #c0392b)", color: "white", boxShadow: "0 0 0 4px rgba(255,87,51,0.2)" }
                        : isDone
                          ? { backgroundColor: "rgba(255,87,51,0.12)", color: "#FF5733" }
                          : { backgroundColor: "rgba(255,255,255,0.03)", color: "var(--color-ghost)", border: "1px solid var(--color-rule)" }
                    }
                  >
                    {isActive && (
                      <span className="absolute inset-0 rounded-full animate-pulse-ring" style={{ border: "2px solid rgba(255,87,51,0.4)" }} />
                    )}
                    {isDone ? (
                      <BiCheckDouble size={16} />
                    ) : (
                      STATUS_ICONS[s]
                    )}
                  </div>

                  {/* Label */}
                  <div>
                    <p
                      className="text-xs font-semibold"
                      style={{
                        color: isActive ? "var(--color-ink)" : isDone ? "var(--color-manifest)" : "var(--color-ghost)",
                      }}
                    >
                      {STATUS_LABELS[s]}
                    </p>
                    {isActive && (
                      <p className="text-[9px] font-mono mt-0.5 font-bold uppercase tracking-wider" style={{ color: "var(--color-route)" }}>
                        Current Status
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Order details ── */}
        <section aria-label="Order details">
          <h2 className="text-[10px] font-mono tracking-widest uppercase font-semibold mb-3 px-1" style={{ color: "var(--color-ghost)" }}>
            Receipt details
          </h2>
          <div className="rounded-2xl p-5 space-y-3.5 glass-card">
            <div className="flex items-start justify-between">
              <span className="text-xs" style={{ color: "var(--color-manifest)" }}>From Restaurant</span>
              <span className="text-xs text-right font-bold font-display" style={{ color: "var(--color-ink)", maxWidth: "60%" }}>
                {restaurantName}
              </span>
            </div>
            <div className="flex items-start justify-between border-t border-b py-3" style={{ borderColor: "var(--color-rule)" }}>
              <span className="text-xs animate-pulse" style={{ color: "var(--color-manifest)" }}>Items Ordered</span>
              <div className="text-right flex flex-wrap gap-2 justify-end gradient-border p-2 rounded-xl" style={{ maxWidth: "60%" }}>
                {order.items?.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg" style={{ color: "var(--color-ink)" }}>
                    <span>
                      {item.quantity}× {item.name ?? (item.itemId as any)?.name ?? "Item"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--color-manifest)" }}>Total Paid</span>
              <span className="text-xs font-mono font-black" style={{ color: "var(--color-ink)" }}>
                ₹{order.totalAmount ?? "—"}
              </span>
            </div>
            <div className="flex items-start justify-between pt-2 border-t" style={{ borderColor: "var(--color-rule)" }}>
              <span className="text-xs flex-shrink-0" style={{ color: "var(--color-manifest)" }}>Delivery Address</span>
              <span className="text-[11px] text-right font-mono" style={{ color: "var(--color-manifest)", maxWidth: "60%", lineHeight: 1.4 }}>
                {order.deliveryAddress?.formattedAddress ?? "—"}
              </span>
            </div>
          </div>
        </section>

        {/* ── Cancel ── */}
        {!isCancelled && !isDelivered && order.status === "placed" && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full py-3.5 rounded-xl text-xs font-bold transition-all duration-150 disabled:opacity-40 active:scale-[0.98]"
            style={{ border: "1px solid var(--color-alert)", color: "var(--color-alert)", backgroundColor: "var(--color-alert-light)" }}
          >
            {cancelling ? <BiLoader className="animate-spin mx-auto text-base" /> : "Cancel Order"}
          </button>
        )}



        {/* ── Chat FAB ── */}
        {!isCancelled && !isDelivered && id && (
          <button
            onClick={() => setChatOpen(true)}
            id="order-chat-fab"
            className="fixed bottom-24 right-4 z-30 w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 active:scale-95 glow-orange"
            style={{ backgroundColor: "var(--color-route)", color: "white" }}
            aria-label="Open order chat"
          >
            <BiChat className="text-2xl" />
          </button>
        )}

        {id && (
          <ChatDrawer
            orderId={id}
            isOpen={chatOpen}
            onClose={() => setChatOpen(false)}
          />
        )}

        <div className="safe-bottom h-4" />
      </div>
    </div>
  );
};

export default OrderPage;
