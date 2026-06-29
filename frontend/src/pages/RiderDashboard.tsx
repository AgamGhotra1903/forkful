import { useEffect, useRef, useState } from "react";
import { useAppData } from "../context/AppContext";
import { useSocket } from "../context/SocketContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { riderService } from "../main";
import toast from "react-hot-toast";
import type { IOrder } from "../types";
import audio from "../assets/faaah.mp3";
import RiderLiveMap from "../components/RiderLiveMap";
import ActiveDeliveryPanel from "../components/ActiveDeliveryPanel";
import IdlePanel from "../components/IdlePanel";
import RiderOrderRequest from "../components/RiderOrderRequest";
import RiderIdleMap from "../components/RiderIdleMap";
import ForkfulLogo from "../components/ForkfulLogo";
import { BiLogOut } from "react-icons/bi";

interface IRider {
  _id: string;
  phoneNumber: string;
  aadharNumber: string;
  drivingLicenseNumber: string;
  picture: string;
  name?: string;
  isVerified: boolean;
  isAvailable: boolean;
}

interface AvailableOrder {
  orderId: string;
  restaurantId: string;
  restaurantName?: string;
  totalAmount?: number;
  riderAmount?: number;
  readyForRiderAt: string | null;
  expiresAt: string | null;
  distanceMeters: number | null;
}

const RiderDashboard = () => {
  const { user, setUser, setIsAuth, darkMode } = useAppData();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<IRider | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [currentOrders, setCurrentOrders] = useState<IOrder[]>([]);
  const [activeOrderIndex, setActiveOrderIndex] = useState<number>(0);
  const currentOrder = currentOrders[activeOrderIndex] || null;
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<AvailableOrder[]>([]);
  const [stats, setStats] = useState({ deliveries: 0, rating: 4.8, totalEarnings: 0 });
  const [earnings, setEarnings] = useState({ today: 0, week: 0, total: 0 });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seenOrderIdsRef = useRef<Set<string>>(new Set());
  const coordsRef = useRef<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(audio);
    audioRef.current.preload = "auto";
  }, []);

  const unlockAudio = async () => {
    try {
      if (!audioRef.current) return;
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setAudioUnlocked(true);
      toast.success("Sound alerts enabled");
    } catch {
      toast.error("Enable sound again");
    }
  };

  const fetchProfile = async () => {
    try {
      const { data } = await axios.get(`${riderService}/api/rider/myprofile`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setProfile(data || null);
      // Consume both earnings and stats returned by the API
      if (data?.earnings) {
        setEarnings({
          today: data.earnings.today || 0,
          week: data.earnings.today || 0,
          total: data.earnings.total || 0,
        });
      }
      if (data?.stats) {
        setStats({
          deliveries: data.stats.deliveries || 0,
          rating: data.stats.rating ?? 5.0,
          totalEarnings: data.stats.totalEarnings || data.earnings?.total || 0,
        });
      }
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "rider") fetchProfile();
    else setLoading(false);
  }, [user]);

  const fetchCurrentOrder = async () => {
    try {
      const { data } = await axios.get(`${riderService}/api/rider/order/current`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const activeList = data.orders || (data.order ? [data.order] : []);
      setCurrentOrders(activeList);
    } catch {
      setCurrentOrders([]);
    }
  };

  useEffect(() => {
    fetchCurrentOrder();
    const interval = setInterval(fetchCurrentOrder, 5000);
    return () => clearInterval(interval);
  }, []);

  // Durable source of truth for "orders I can accept right now" — polled
  // on an interval so a rider who comes online after orders are already
  // waiting still sees them, not just orders that happened to go ready
  // while their dashboard was already open and connected.
  const fetchAvailableOrders = async () => {
    if (!profile?.isAvailable || currentOrders.length >= 2) {
      setAvailableOrders([]);
      return;
    }
    try {
      const params: Record<string, number> = {};
      if (coordsRef.current) {
        params.latitude = coordsRef.current.latitude;
        params.longitude = coordsRef.current.longitude;
      }
      const { data } = await axios.get(`${riderService}/api/rider/orders/available`, {
        params,
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const orders: AvailableOrder[] = data.orders || [];

      // Play the alert sound only for orders we haven't already shown.
      const newOnes = orders.filter((o) => !seenOrderIdsRef.current.has(o.orderId));
      if (newOnes.length > 0 && audioUnlocked && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
      seenOrderIdsRef.current = new Set(orders.map((o) => o.orderId));

      setAvailableOrders(orders);
    } catch {
      // Leave the existing list as-is on a transient fetch failure rather
      // than clearing it out from under the rider.
    }
  };

  useEffect(() => {
    fetchAvailableOrders();
    const interval = setInterval(fetchAvailableOrders, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.isAvailable, currentOrder?._id]);

  // ── Rider rating notification ──────────────────────────────────────────────
  // When a customer rates the rider after delivery, the backend emits
  // "rider:rated" on the rider's personal socket room.  We show a passive
  // 30-second read-only notification window (no action buttons) that
  // auto-dismisses and also triggers a profile re-fetch so the stats card
  // reflects the updated average rating immediately.
  const [ratingNotification, setRatingNotification] = useState<{
    rating: number;
    text: string;
  } | null>(null);
  const ratingDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!socket) return;

    const refresh = () => fetchAvailableOrders();

    socket.on("order:available", refresh);
    socket.on("orders:refresh", refresh);

    const onRiderRated = (payload: { rating: number; text?: string }) => {
      setRatingNotification({ rating: payload.rating, text: payload.text || "" });
      // Auto-dismiss after 30 seconds
      if (ratingDismissTimerRef.current) clearTimeout(ratingDismissTimerRef.current);
      ratingDismissTimerRef.current = setTimeout(() => {
        setRatingNotification(null);
      }, 30000);
      // Re-fetch profile so stats.rating updates without a page reload
      fetchProfile();
    };

    socket.on("rider:rated", onRiderRated);

    return () => {
      socket.off("order:available", refresh);
      socket.off("orders:refresh", refresh);
      socket.off("rider:rated", onRiderRated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, profile?.isAvailable, currentOrder?._id, audioUnlocked]);

  const toggleAvailability = async () => {
    setToggling(true);
    const performToggle = async (latitude: number, longitude: number) => {
      coordsRef.current = { latitude, longitude };
      const goingOnline = !profile?.isAvailable;
      try {
        await axios.patch(
          `${riderService}/api/rider/toggle`,
          { isAvailable: goingOnline, latitude, longitude },
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        toast.success(goingOnline ? "You are now online" : "You are now offline");
        if (!goingOnline) {
          setAvailableOrders([]);
          seenOrderIdsRef.current = new Set();
        }
        fetchProfile();
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to toggle status");
      } finally {
        setToggling(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          performToggle(position.coords.latitude, position.coords.longitude);
        },
        () => {
          performToggle(28.6139, 77.209);
        }
      );
    } else {
      performToggle(28.6139, 77.209);
    }
  };

  // FIXED: Use PUT /api/rider/order/status/:orderId to match backend route
  const handleStatusUpdate = async (newStatus: string) => {
    if (!currentOrder) return;
    try {
      await axios.put(
        `${riderService}/api/rider/order/status/${currentOrder._id}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success(`Order status updated to ${newStatus}`);
      fetchCurrentOrder();
      // FIXED BUG (rider stats "resetting"): the backend already persists
      // totalEarnings/totalDeliveries cumulatively via $inc on every
      // "delivered" update — but this screen's `stats`/`earnings` state was
      // only ever populated once on mount and never refreshed afterwards.
      // So a rider would finish a delivery, the bottom sheet would swap
      // back to the idle panel, and it would still show the numbers from
      // before the delivery — looking exactly like the data had been lost,
      // when really it was just stale on screen. Re-fetching the profile
      // here (not just the current order) keeps the displayed stats in
      // sync with what's actually been saved.
      if (newStatus === "delivered") {
        fetchProfile();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  const handleLogout = () => {
    // Best-effort server-side token blacklist
    axios
      .post(
        `${riderService.replace("5003", "5001")}/api/auth/logout`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      )
      .catch(() => {});
    localStorage.removeItem("token");
    setUser(null);
    setIsAuth(false);
    toast.success("Signed out");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--color-route)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--color-manifest)]">Loading rider dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen relative overflow-hidden">

      {/* ── Rider Rating Notification ── passive, read-only, auto-dismisses in 30 s */}
      {ratingNotification && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div
            className="relative mx-4 w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl"
            style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-rule)" }}
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="text-3xl">⭐</span>
              <p className="text-base font-black font-display" style={{ color: "var(--color-ink)" }}>
                New Rating Received
              </p>
              <div className="flex gap-1 justify-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={`text-xl ${i < ratingNotification.rating ? "text-amber-400" : "text-slate-300"}`}>★</span>
                ))}
              </div>
              <p className="text-2xl font-black font-display" style={{ color: "var(--color-route)" }}>
                {ratingNotification.rating} / 5
              </p>
              {ratingNotification.text ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic leading-relaxed">
                  "{ratingNotification.text}"
                </p>
              ) : (
                <p className="text-xs text-slate-400 font-mono">No comment left</p>
              )}
            </div>
            <p className="text-center text-[10px] font-mono text-slate-400">
              This message will close automatically in 30 seconds
            </p>
            <button
              onClick={() => { setRatingNotification(null); if (ratingDismissTimerRef.current) clearTimeout(ratingDismissTimerRef.current); }}
              className="w-full py-2 rounded-2xl text-xs font-bold font-mono tracking-widest uppercase transition-opacity hover:opacity-70"
              style={{ backgroundColor: "var(--color-rule)", color: "var(--color-ghost)" }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}


      {currentOrder ? (
        <div className="fixed inset-0 z-0">
          <RiderLiveMap
            orderId={currentOrder._id}
            restaurantLocation={{
              lat: currentOrder.restaurantLocation?.latitude ?? 28.6139,
              lng: currentOrder.restaurantLocation?.longitude ?? 77.209,
              name: currentOrder.restaurantName || "Restaurant",
              phone: currentOrder.riderPhone ?? "N/A",
              address: currentOrder.deliveryAddress?.formattedAddress || "Restaurant",
            }}
            customerLocation={{
              lat: currentOrder.deliveryAddress?.latitude || 28.5244,
              lng: currentOrder.deliveryAddress?.longitude || 77.1855,
              name: "Customer",
              phone: currentOrder.deliveryAddress?.mobile ?? "N/A",
              address: currentOrder.deliveryAddress?.formattedAddress || "Delivery Address",
            }}
            orderStatus={currentOrder.status}
            socket={socket}
          />
        </div>
      ) : (
        // FIXED: Real live map when idle, not a blank div
        <div className="fixed inset-0 z-0">
          <RiderIdleMap />
        </div>
      )}

      {/* LAYER 1: Floating top header */}
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 pt-safe pb-4"
        style={{
          background: "linear-gradient(to bottom, rgba(10,10,11,0.9) 0%, transparent 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <ForkfulLogo size={34} dark={darkMode} />
            <span style={{ fontFamily: "var(--font-display, system-ui)", fontWeight: 800, letterSpacing: "-0.04em", fontSize: "1.05rem", lineHeight: 1 }}>
              <span style={{ color: darkMode ? "#F0EEE9" : "#111111" }}>Fork</span>
              <span style={{
                color: darkMode ? "#FF6B45" : "#FF5733",
                textShadow: darkMode ? "0 0 20px rgba(255, 107, 69, 0.4)" : "none"
              }}>ful</span>
            </span>
          </div>
          <div className="h-4 w-px" style={{ backgroundColor: "var(--color-rule)" }} />
          <div>
            <p className="text-xs text-[var(--color-manifest)]">Rider Dashboard</p>
            <p className="text-sm font-bold text-[var(--color-ink)]">{profile?.name || user?.name || "Rider"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Online/Offline toggle */}
          <button
            onClick={toggleAvailability}
            disabled={toggling}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
              profile?.isAvailable
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-red-500/20 text-red-400 border border-red-500/30"
            } ${toggling ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                profile?.isAvailable ? "bg-green-400 animate-pulse" : "bg-red-400"
              }`}
            />
            {profile?.isAvailable ? "Online" : "Offline"}
          </button>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="glass-card w-10 h-10 rounded-xl flex items-center justify-center text-[var(--color-manifest)] hover:text-[var(--color-alert)] transition-colors"
            aria-label="Log out"
          >
            <BiLogOut className="text-lg" />
          </button>
        </div>
      </div>

      {/* LAYER 2: Incoming order request cards */}
      {availableOrders.length > 0 && (
        <div
          className="fixed left-0 right-0 z-45 px-4 space-y-3 max-h-[50vh] overflow-y-auto"
          style={{ bottom: currentOrder ? "220px" : "320px" }}
        >
          {availableOrders.map((o) => (
            <RiderOrderRequest
              key={o.orderId}
              orderId={o.orderId}
              restaurantName={o.restaurantName}
              riderAmount={o.riderAmount}
              distanceMeters={o.distanceMeters}
              expiresAt={o.expiresAt}
              onAccepted={() => {
                setAvailableOrders((prev) => prev.filter((x) => x.orderId !== o.orderId));
                fetchCurrentOrder();
              }}
              onRejected={(id) =>
                setAvailableOrders((prev) => prev.filter((x) => x.orderId !== id))
              }
            />
          ))}
        </div>
      )}

      {/* LAYER 3: Bottom sliding panel */}
      {currentOrder ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-base)] border-t border-[var(--color-rule)] max-w-lg mx-auto rounded-t-3xl shadow-2xl overflow-hidden">
          {currentOrders.length > 1 && (
            <div className="flex gap-2 p-3 bg-[var(--bg-surface-2)] border-b border-[var(--color-rule)]">
              {currentOrders.map((ord, idx) => (
                <button
                  key={ord._id}
                  onClick={() => setActiveOrderIndex(idx)}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                    activeOrderIndex === idx
                      ? "bg-[var(--color-route)] text-white shadow-md"
                      : "bg-white/5 text-[var(--color-manifest)] hover:bg-white/10"
                  }`}
                >
                  📍 Order #{idx + 1} ({ord.restaurantName})
                </button>
              ))}
            </div>
          )}
          <ActiveDeliveryPanel
            order={currentOrder}
            onStatusUpdate={handleStatusUpdate}
            socket={socket}
          />
        </div>
      ) : (
        <IdlePanel
          stats={stats}
          earnings={earnings}
          isAvailable={profile?.isAvailable || false}
          onToggleAvailability={toggleAvailability}
        />
      )}

      {/* Audio unlock button */}
      {!audioUnlocked && (
        <button
          onClick={unlockAudio}
          className="fixed bottom-4 left-4 z-30 glass-card px-3 py-2 rounded-lg text-xs text-yellow-400 border border-yellow-500/30"
        >
          🔊 Enable Sound
        </button>
      )}
    </div>
  );
};

export default RiderDashboard;
