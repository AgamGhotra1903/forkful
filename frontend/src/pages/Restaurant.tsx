import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { IMenuItem, IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import { motion } from "framer-motion";
import ForkfulLogo from "../components/ForkfulLogo";
import AddRestaurant from "../components/AddRestaurant";
import RestaurantProfile from "../components/RestaurantProfile";
import MenuItems from "../components/MenuItems";
import AddMenuItem from "../components/AddMenuItem";
import RestaurantOrders from "../components/RestaurantOrders";
import RestaurantAnalytics from "../components/RestaurantAnalytics";
import { useAppData } from "../context/AppContext";
import { useSocket } from "../context/SocketContext";
import {
  BiHomeAlt,
  BiReceipt,
  BiDish,
  BiBarChartAlt,
  BiCog,
  BiSun,
  BiMoon,
  BiLoader,
  BiChevronRight,
  BiStar,
  BiLogOut
} from "react-icons/bi";
import toast from "react-hot-toast";

type SellerSection = "overview" | "orders" | "menu" | "analytics" | "settings";

const Restaurant = () => {
  const { darkMode, toggleDarkMode, setUser, setIsAuth } = useAppData();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<SellerSection>("overview");
  const [menuItems, setMenuItems] = useState<IMenuItem[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [togglingStatus, setTogglingStatus] = useState(false);
  // REMOVED ("Seller AI"): insights/insightsLoading state for the Owner AI
  // Insights panel has been replaced with a plain Customer Reviews list.
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const fetchMyRestaurant = async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/restaurant/my`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      // Backend returns a refreshed token with restaurantId embedded when the
      // current token doesn't already have it — save it so downstream API calls
      // (e.g. addMenuItem) carry the correct restaurantId claim.
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      setRestaurant(data.restaurant || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async (restaurantId: string) => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/item/all/${restaurantId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setMenuItems(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async (restaurantId: string) => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/order/restaurant/${restaurantId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setOrders(data.orders || []);
    } catch (err) {
      console.error(err);
    }
  };

  // REMOVED ("Seller AI"): fetchOwnerInsights called the now-deleted
  // GET /api/reviews/insights/:restaurantId LLM summary endpoint. Replaced
  // with a plain fetch of the restaurant's customer reviews (the same data
  // model/endpoint customers' own review submissions already populate).
  const fetchReviews = async (restaurantId: string) => {
    setReviewsLoading(true);
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/reviews/restaurant/${restaurantId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setReviews(data || []);
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => { fetchMyRestaurant(); }, []);

  useEffect(() => {
    if (!restaurant?._id) return;
    const id = restaurant._id;
    fetchMenuItems(id);
    fetchOrders(id);
    fetchReviews(id);

    // Poll orders every 15s (live order queue) and reviews every 30s
    // so the dashboard reflects new customer activity without a manual reload.
    const ordersInterval = setInterval(() => fetchOrders(id), 15000);
    const reviewsInterval = setInterval(() => fetchReviews(id), 30000);

    return () => {
      clearInterval(ordersInterval);
      clearInterval(reviewsInterval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?._id]);

  // Listen for real-time table booking notifications
  useEffect(() => {
    if (!socket || !restaurant?._id) return;

    // Join the restaurant-specific room to receive updates
    socket.emit("join", `restaurant:${restaurant._id}`);

    const handleBooking = (booking: any) => {
      toast.success(
        `📅 Table Booked!\n${booking.name} reserved a table for ${booking.guests} guests on ${booking.date} at ${booking.time}.`,
        {
          duration: 9000,
          icon: "🍽️",
          style: {
            background: "rgba(17, 24, 39, 0.95)",
            color: "#F8FAFC",
            border: "1px solid var(--color-rule)",
            backdropFilter: "blur(12px)",
          }
        }
      );
    };

    socket.on("table:booked_notification", handleBooking);

    return () => {
      socket.off("table:booked_notification", handleBooking);
      socket.emit("leave", `restaurant:${restaurant._id}`);
    };
  }, [socket, restaurant?._id]);

  const handleToggleStatus = async () => {
    if (!restaurant) return;
    setTogglingStatus(true);
    try {
      const nextOpen = !restaurant.isOpen;
      await axios.patch(
        `${restaurantService}/api/restaurant/toggle/${restaurant._id}`,
        { isOpen: nextOpen },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setRestaurant({ ...restaurant, isOpen: nextOpen });
      toast.success(nextOpen ? "Restaurant opened" : "Restaurant closed");
    } catch (err: any) {
      toast.error("Failed to update status");
    } finally {
      setTogglingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--bg-base)" }}>
        <div className="flex flex-col items-center gap-3">
          <BiLoader className="text-2xl animate-spin" style={{ color: "var(--color-route)" }} />
          <p className="text-xs font-mono animate-pulse" style={{ color: "var(--color-manifest)" }}>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (!restaurant) return <AddRestaurant fetchMyRestaurant={fetchMyRestaurant} />;

  // ── Overview calculations ────────────────────────────────────────────────

  // TODAY'S revenue: only orders created on today's calendar date
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayRevenue = orders
    .filter(o => o.status !== "cancelled" && new Date(o.createdAt) >= todayStart)
    .reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);

  const activeOrdersCount = orders.filter(o => !["delivered", "cancelled"].includes(o.status)).length;

  // Avg rating: aligned with customer-side getRealRating logic to ensure consistency
  const avgRating = restaurant.ratingCount && restaurant.ratingCount > 0
    ? ((restaurant.overallRating ?? 0) / restaurant.ratingCount).toFixed(1)
    : (() => {
        const id = restaurant._id;
        const n = id.charCodeAt(id.length - 1) + id.charCodeAt(id.length - 2);
        return ((n % 10) / 10 + 4.0).toFixed(1);
      })();

  const totalItemsCount = menuItems.length;

  // Star distribution calculations
  const starCounts = [0, 0, 0, 0, 0]; // index 0 for 1 star ... index 4 for 5 stars
  reviews.forEach(r => {
    const star = Math.max(1, Math.min(5, r.rating ?? 5));
    starCounts[star - 1]++;
  });

  const featuredReview = reviews.length > 0
    ? [...reviews].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0]
    : null;

  // Chart data — real orders from the last 7 calendar days
  const getWeeklyRevenue = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const revenueByDay: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    const now = new Date();
    // Midnight at the start of 6 days ago (so we cover today + 6 prior days = 7 days total)
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    orders.forEach((order) => {
      if (order.status === "cancelled") return;
      if (!order.createdAt) return;
      const d = new Date(order.createdAt);
      if (isNaN(d.getTime())) return;
      if (d < sevenDaysAgo) return;
      const dayIdx = d.getDay(); // 0=Sun … 6=Sat
      revenueByDay[dayIdx] = (revenueByDay[dayIdx] ?? 0) + (order.totalAmount ?? 0);
    });

    // Build ordered array from (today − 6) → today so the rightmost bar is always today
    const todayIdx = now.getDay();
    return Array.from({ length: 7 }, (_, i) => {
      const idx = (todayIdx - 6 + i + 7) % 7;
      return { day: days[idx], revenue: revenueByDay[idx] ?? 0 };
    });
  };

  const chartData = getWeeklyRevenue();
  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1); // avoid division by zero

  // Metric chips — scope to the 7-day window to match the chart
  const weekOrders = orders.filter(o => {
    if (o.status === "cancelled" || !o.createdAt) return false;
    const d = new Date(o.createdAt);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    return d >= sevenDaysAgo;
  });
  const weekRevenue = weekOrders.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);
  const bestDayData = [...chartData].sort((a, b) => b.revenue - a.revenue)[0];
  const bestDay = bestDayData && bestDayData.revenue > 0
    ? `${bestDayData.day} (₹${bestDayData.revenue.toLocaleString()})`
    : "No sales yet";
  const avgOrderValue = weekOrders.length > 0 ? Math.round(weekRevenue / weekOrders.length) : 0;
  const totalOrdersThisWeek = weekOrders.length;

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--bg-base)" }}>

      {/* ── Sidebar Layout (240px) ── */}
      <aside
        className="w-60 fixed top-0 bottom-0 left-0 z-40 p-5 flex flex-col justify-between glass-panel"
        style={{ borderRight: "1px solid var(--color-rule)" }}
      >
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-2 select-none px-1">
            <ForkfulLogo size={34} dark={darkMode} />
            <span style={{ fontFamily: "var(--font-display, system-ui)", fontWeight: 800, letterSpacing: "-0.04em", fontSize: "1.05rem", lineHeight: 1 }}>
              <span style={{ color: darkMode ? "#F0EEE9" : "#111111" }}>Fork</span>
              <span style={{
                color: darkMode ? "#FF6B45" : "#FF5733",
                textShadow: darkMode ? "0 0 20px rgba(255, 107, 69, 0.4)" : "none"
              }}>ful</span>
            </span>
          </div>

          {/* Restaurant Profile */}
          <div className="flex items-center gap-3 p-2 rounded-2xl border" style={{ borderColor: "var(--color-rule)", backgroundColor: "rgba(255,255,255,0.02)" }}>
            <img
              src={restaurant.image || "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=300&q=80"}
              alt="Restaurant avatar"
              className="w-10 h-10 rounded-full object-cover flex-shrink-0 border"
              style={{ borderColor: "var(--color-rule)" }}
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-bold truncate leading-snug" style={{ color: "var(--color-ink)" }}>{restaurant.name}</h2>
              <span className="text-[9px] font-body tracking-wider uppercase font-bold" style={{ color: "var(--color-ghost)" }}>Seller</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 relative" aria-label="Seller dashboard navigation">
            {[
              { key: "overview",  label: "Overview",  icon: <BiHomeAlt /> },
              { key: "orders",    label: "Orders",    icon: <BiReceipt /> },
              { key: "menu",      label: "Menu List", icon: <BiDish /> },
              { key: "analytics", label: "Analytics", icon: <BiBarChartAlt /> },
              { key: "settings",  label: "Settings",  icon: <BiCog /> },
            ].map((link) => {
              const isActive = activeSection === link.key;
              return (
                <button
                  key={link.key}
                  onClick={() => setActiveSection(link.key as SellerSection)}
                  className="w-full relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors active:scale-[0.98] cursor-pointer"
                  style={{
                    color: isActive ? "#FF5733" : "var(--color-manifest)",
                    fontFamily: "var(--font-body)",
                    background: "transparent",
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeSellerTabIndicator"
                      className="absolute inset-0 bg-[rgba(255,87,51,0.08)] border-l-2 border-[#FF5733] rounded-xl z-0 pointer-events-none"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <div className="flex items-center gap-2 relative z-10">
                    <span className="text-base">{link.icon}</span>
                    <span>{link.label}</span>
                  </div>
                  {isActive && <BiChevronRight className="text-sm relative z-10" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="space-y-4 pt-4 border-t" style={{ borderColor: "var(--color-rule)" }}>
          {/* Status Toggle Switch */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: "var(--color-manifest)" }}>
              {restaurant.isOpen && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
              {restaurant.isOpen ? "Kitchen Open" : "Kitchen Closed"}
            </span>

            <button
              onClick={handleToggleStatus}
              disabled={togglingStatus}
              className="relative w-10 h-5 rounded-full transition-colors cursor-pointer"
              style={{ backgroundColor: restaurant.isOpen ? "var(--color-signal)" : "var(--color-rule)" }}
            >
              <div
                className="absolute w-4 h-4 bg-white rounded-full top-0.5 left-0.5 transition-transform"
                style={{ transform: restaurant.isOpen ? "translateX(20px)" : "none" }}
              />
            </button>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleDarkMode}
            className="w-full h-10 border rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition duration-200 active:scale-[0.98] cursor-pointer"
            style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)", backgroundColor: "rgba(255,255,255,0.01)" }}
          >
            {darkMode ? (
              <>
                <BiSun className="text-base text-amber-500" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <BiMoon className="text-base" style={{ color: "var(--color-route)" }} />
                <span>Dark Mode</span>
              </>
            )}
          </button>

          {/* Sign Out */}
          <button
            onClick={() => {
              localStorage.removeItem("token");
              setUser(null);
              setIsAuth(false);
              toast.success("Signed out");
              navigate("/login");
            }}
            className="w-full h-10 border rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition duration-200 active:scale-[0.98] cursor-pointer"
            style={{ borderColor: "rgba(239,68,68,0.4)", color: "#f87171", backgroundColor: "rgba(239,68,68,0.06)" }}
          >
            <BiLogOut className="text-base" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="flex-1 pl-64 pr-5 py-8 min-h-screen">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* SECTION: Overview */}
          {activeSection === "overview" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black font-display tracking-tight" style={{ color: "var(--color-ink)" }}>
                    Overview
                  </h1>
                  <p className="text-xs" style={{ color: "var(--color-manifest)" }}>
                    Real-time operational dashboard for your restaurant.
                  </p>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* Hero Stat - Today's Revenue */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="col-span-2 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between min-h-36 glass-card glass-card-highlight border-t-4"
                  style={{ borderTopColor: "var(--color-route)" }}
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-[0.06]"
                    style={{ backgroundImage: `url('https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=600&q=80')` }}
                  />
                  <div className="space-y-1 relative z-10 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-slate-400">
                        Today's Revenue
                      </span>
                      <h3 className="text-4xl md:text-5xl font-black font-display tracking-tight mt-2 text-[var(--color-route)]">
                        ₹{todayRevenue.toLocaleString()}
                      </h3>
                    </div>
                    <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 mt-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live calculations
                    </div>
                  </div>
                </motion.div>

                {/* Other Stats */}
                {[
                  {
                    label: "Active Orders",
                    value: activeOrdersCount,
                    color: "var(--color-route)",
                    bgPhoto: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80",
                    pulse: true,
                    delay: 0.1
                  },
                  {
                    label: "Avg Rating",
                    value: reviewsLoading
                      ? <span className="text-xs font-mono text-slate-400">...</span>
                      : <span className="flex items-center gap-1">{avgRating} <BiStar className="text-sm fill-amber-500 text-amber-500" /></span>,
                    color: "#E8A020",
                    bgPhoto: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=300&q=80",
                    delay: 0.2
                  },
                  {
                    label: "Total Items",
                    value: totalItemsCount,
                    color: "#2196A6",
                    bgPhoto: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80",
                    delay: 0.3,
                    colSpan: "col-span-2 md:col-span-1"
                  }
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut", delay: stat.delay }}
                    className={`p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between min-h-36 glass-card glass-card-highlight border-t-4 ${stat.colSpan || "col-span-1"}`}
                    style={{
                      borderTopColor: stat.color,
                    }}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-[0.08]"
                      style={{ backgroundImage: `url('${stat.bgPhoto}')` }}
                    />
                    <div className="space-y-1 relative z-10 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-slate-400">
                          {stat.label}
                        </span>
                        <p className="text-2xl font-black font-body mt-2 flex items-center gap-1.5" style={{ color: "var(--color-ink)" }}>
                          {stat.value}
                          {stat.pulse && (
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: stat.color }} />
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: stat.color }} />
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Lower Section Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Live orders queue (2/3 width) */}
                <div className="lg:col-span-2 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400 px-1">
                    Live Order Queue
                  </h3>
                  <RestaurantOrders restaurantId={restaurant._id} limit={4} />
                </div>

                {/* Revenue chart (1/3 width) */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400 px-1">
                    Weekly Revenue
                  </h3>
                  <div className="p-5 rounded-3xl space-y-4 glass-card glass-card-highlight">
                    {/* HTML Chart — use px heights (not %) because flex children ignore
                        percentage heights when the parent has no explicit CSS height.
                        The container is 176px (h-44). We reserve 20px for day labels,
                        leaving 156px of drawable bar space. */}
                    <div className="flex items-end justify-between gap-1.5 border-b" style={{ borderColor: "var(--color-rule)", height: "176px", paddingTop: "4px" }}>
                      {chartData.map((d, idx) => {
                        const BAR_MAX_PX = 140; // drawable px for bars (176 - 20px label - 16px padding)
                        const barPx = maxRevenue > 0
                          ? Math.max(Math.round((d.revenue / maxRevenue) * BAR_MAX_PX), 6)
                          : 6;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative" style={{ height: "100%", justifyContent: "flex-end" }}>
                            {/* Bar segment */}
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${barPx}px` }}
                              transition={{ type: "spring", stiffness: 120, damping: 14, delay: idx * 0.05 + 0.3 }}
                              className="w-full rounded-t-lg relative cursor-pointer hover:opacity-100 transition-opacity"
                              style={{
                                background: idx === 6
                                  ? "linear-gradient(to top, var(--color-route), var(--color-thermal))"
                                  : "linear-gradient(to top, rgba(255,87,51,0.4), rgba(255,130,77,0.4))",
                                borderRadius: "6px 6px 0 0",
                              }}
                            >
                              {/* Custom tooltips */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-900 text-white text-[9px] font-body font-bold px-2 py-0.5 rounded shadow z-50 pointer-events-none whitespace-nowrap">
                                ₹{d.revenue}
                              </div>
                            </motion.div>
                            <span className="text-[9px] font-body text-slate-400 font-bold">{d.day}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* metric chips */}
                    <div className="space-y-2 pt-1">
                      {[
                        { label: "Best Sales Day", val: bestDay },
                        { label: "Avg Order Value", val: `₹${avgOrderValue}` },
                        { label: "Total Orders", val: totalOrdersThisWeek },
                      ].map((chip, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs py-1 border-b last:border-0" style={{ borderColor: "var(--color-rule)" }}>
                          <span style={{ color: "var(--color-manifest)" }}>{chip.label}</span>
                          <span className="font-body font-bold" style={{ color: "var(--color-ink)" }}>{chip.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── KPI Summary Strip ── */}
              {(() => {
                const today = new Date().toDateString();
                const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today).length;
                const totalRevenue = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
                const avgRating = reviews.length
                  ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
                  : "—";
                const kpis = [
                  { label: "Today's orders", value: todayOrders, icon: <BiReceipt className="text-lg" /> },
                  { label: "Total revenue",  value: `₹${totalRevenue.toLocaleString("en-IN")}`, icon: <BiBarChartAlt className="text-lg" /> },
                  { label: "Avg rating",     value: avgRating, icon: <BiStar className="text-lg" /> },
                ];
                return (
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {kpis.map(k => (
                      <div key={k.label} className="rounded-2xl p-4 flex flex-col gap-2"
                           style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--color-rule)" }}>
                        <span style={{ color: "var(--color-manifest)" }} className="text-xs font-medium flex items-center gap-1.5">
                          {k.icon}{k.label}
                        </span>
                        <span style={{ color: "var(--color-ink)" }} className="text-2xl font-bold tracking-tight">
                          {k.value}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}


              {/* Customer Reviews Section with Rating Distribution & Spotlight */}
              <div className="p-6 rounded-3xl glass-card glass-card-highlight border space-y-6 shadow-md" style={{ borderColor: "var(--color-rule)" }}>
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--color-rule)" }}>
                  <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-[var(--color-route)]">Customer Feedback & Reviews</span>
                  {reviews.length > 0 && (
                    <span className="text-[10px] font-mono text-slate-400">{reviews.length} total review{reviews.length > 1 ? "s" : ""}</span>
                  )}
                </div>

                {reviewsLoading ? (
                  <div className="flex items-center gap-2 py-4 justify-center">
                    <BiLoader className="animate-spin text-slate-400 text-lg" />
                    <span className="text-xs text-slate-400 font-mono">Loading feedback details...</span>
                  </div>
                ) : reviews.length > 0 ? (
                  <div className="space-y-6">
                    {/* Star Distribution Summary Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center bg-white/2 dark:bg-black/10 p-5 rounded-2xl border" style={{ borderColor: "var(--color-rule)" }}>
                      {/* Left: Overall aggregate score */}
                      <div className="text-center md:border-r border-slate-700/30 dark:border-slate-700/50 py-2">
                        <p className="text-5xl font-black font-display text-amber-500">{avgRating}</p>
                        <p className="text-xs text-[var(--color-manifest)] mt-1">out of 5 stars</p>
                        <div className="flex justify-center gap-0.5 mt-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <BiStar key={i} className={`text-base ${i < Math.round(Number(avgRating) || 5) ? "fill-amber-500 text-amber-500" : "text-slate-600"}`} />
                          ))}
                        </div>
                      </div>

                      {/* Middle: Star breakdown progress bars */}
                      <div className="space-y-1.5 md:col-span-2 px-2">
                        {starCounts.map((count, index) => {
                          const starsCount = index + 1;
                          const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
                          return (
                            <div key={index} className="flex items-center gap-3 text-xs">
                              <span className="w-12 text-right text-[10px] font-mono text-slate-400">{starsCount} star</span>
                              <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.1 }}
                                  className="h-full bg-amber-500 rounded-full"
                                />
                              </div>
                              <span className="w-8 text-[10px] font-mono text-slate-400 text-right">{pct}%</span>
                            </div>
                          );
                        }).reverse()}
                      </div>
                    </div>

                    {/* Spotlight Featured Review (only if we have reviews) */}
                    {featuredReview && (
                      <div
                        className="p-5 rounded-2xl border-l-4 relative overflow-hidden bg-gradient-to-r from-amber-500/5 to-transparent"
                        style={{ borderColor: "var(--color-urgency)", backgroundColor: "rgba(245, 158, 11, 0.03)" }}
                      >
                        <div className="absolute top-3 right-3 text-3xl font-serif text-[var(--color-urgency)] opacity-20 pointer-events-none select-none">
                          “
                        </div>
                        <div className="space-y-2">
                          <span className="inline-block text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--color-urgency-light)] text-[var(--color-urgency)]">
                            Featured Review
                          </span>
                          <p className="text-xs leading-relaxed font-medium italic text-slate-700 dark:text-slate-200">
                            "{featuredReview.text}"
                          </p>
                          <div className="flex justify-between items-center pt-2">
                            <span className="text-[10px] font-bold" style={{ color: "var(--color-ink)" }}>
                              — {featuredReview.userId?.name || "Verified Customer"}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {new Date(featuredReview.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* All Reviews Feed List */}
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {reviews.map((review, i) => (
                        <motion.div
                          key={review._id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.5) }}
                          className="p-4 rounded-2xl border space-y-1.5 glass-card-highlight bg-white/1"
                          style={{ borderColor: "var(--color-rule)" }}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold" style={{ color: "var(--color-ink)" }}>
                              {review.userId?.name || "Verified Customer"}
                            </span>
                            <span className="text-xs font-bold text-amber-500 flex gap-0.5">
                              {Array.from({ length: review.rating }).map((_, idx) => (
                                <BiStar key={idx} className="fill-amber-500 text-sm" />
                              ))}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{review.text}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {new Date(review.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed rounded-2xl" style={{ borderColor: "var(--color-rule)" }}>
                    <p className="text-xs text-slate-400 font-mono">No reviews yet. Ask your customers to leave one after delivery!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION: Orders */}
          {activeSection === "orders" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-black font-display tracking-tight" style={{ color: "var(--color-ink)" }}>
                  Order Queue
                </h1>
                <p className="text-xs" style={{ color: "var(--color-manifest)" }}>
                  Track incoming, active, and past orders.
                </p>
              </div>
              <RestaurantOrders restaurantId={restaurant._id} />
            </div>
          )}

          {/* SECTION: Menu */}
          {activeSection === "menu" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-black font-display tracking-tight" style={{ color: "var(--color-ink)" }}>
                  Menu Management
                </h1>
                <p className="text-xs" style={{ color: "var(--color-manifest)" }}>
                  Configure pricing, descriptions, and toggle item availability.
                </p>
              </div>
              <MenuItems
                items={menuItems}
                onItemDeleted={() => fetchMenuItems(restaurant._id)}
                isSeller={true}
                onAddTrigger={() => setActiveSection("settings")}
              />
            </div>
          )}

          {/* SECTION: Analytics */}
          {activeSection === "analytics" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-black font-display tracking-tight" style={{ color: "var(--color-ink)" }}>
                  Performance Analytics
                </h1>
                <p className="text-xs" style={{ color: "var(--color-manifest)" }}>
                  Deep-dive restaurant sales statistics logs.
                </p>
              </div>
              <RestaurantAnalytics restaurantId={restaurant._id} />
            </div>
          )}

          {/* SECTION: Settings */}
          {activeSection === "settings" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black font-display tracking-tight" style={{ color: "var(--color-ink)" }}>
                  Business Settings
                </h1>
                <p className="text-xs" style={{ color: "var(--color-manifest)" }}>
                  Configure your restaurant menu items and business listing.
                </p>
              </div>

              {/* Add item helper form card */}
              <AddMenuItem onItemAdded={() => { fetchMenuItems(restaurant._id); setActiveSection("menu"); }} />

              <RestaurantProfile restaurant={restaurant} onUpdate={setRestaurant} isSeller={true} />
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default Restaurant;
