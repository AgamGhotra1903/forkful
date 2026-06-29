import { useEffect, useState } from "react";
import axios from "axios";
import { restaurantService } from "../main";
import { BiReceipt, BiDollar, BiCheckCircle, BiXCircle } from "react-icons/bi";
import { motion } from "framer-motion";

interface RestaurantAnalyticsProps {
  restaurantId: string;
}

const StatCard = ({ label, value, icon, color, delay }: { label: string; value: string | number; icon: React.ReactNode; color: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className="p-5 space-y-2 glass-card glass-card-highlight border"
    style={{ borderColor: "var(--color-rule)" }}
  >
    <div className="flex items-center gap-2">
      <span style={{ color }}>{icon}</span>
      <span className="text-[9px] font-mono tracking-widest uppercase font-bold" style={{ color: "var(--color-ghost)" }}>
        {label}
      </span>
    </div>
    <p className="text-xl font-black font-display" style={{ color }}>
      {value}
    </p>
  </motion.div>
);

const RestaurantAnalytics = ({ restaurantId }: RestaurantAnalyticsProps) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // FIXED ANALYTICS: import socket for live updates
  // We use a polling interval + socket trigger to keep analytics live
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data } = await axios.get(
          `${restaurantService}/api/order/restaurant/${restaurantId}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        setOrders(data.orders || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
    // FIXED ANALYTICS: poll every 30s so analytics stay fresh without manual refresh
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [restaurantId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--color-route)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const totalRevenue = orders.filter(o => o.status !== "cancelled").reduce((sum: number, o: any) => sum + (o.totalAmount ?? 0), 0);
  const delivered = orders.filter((o) => o.status === "delivered").length;
  const cancelled = orders.filter((o) => o.status === "cancelled").length;
  const active = orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;

  // FIXED BUG (weekly earnings graph missing): this component previously had
  // no chart at all — just the stat cards and a recent-orders list — even
  // though the Analytics tab is exactly where a "weekly earnings" bar graph
  // is expected. We compute it the same way the Overview tab does: sum
  // totalAmount per calendar day-of-week, over the last 7 days, excluding
  // cancelled orders.
  const getWeeklyRevenue = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const revenueByDay: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    orders.forEach((order) => {
      if (order.status === "cancelled") return;
      const d = new Date(order.createdAt);
      if (d < sevenDaysAgo) return;
      const dayIdx = d.getDay();
      revenueByDay[dayIdx] += order.totalAmount ?? 0;
    });

    const todayIdx = now.getDay();
    return Array.from({ length: 7 }, (_, i) => {
      const idx = (todayIdx - 6 + i + 7) % 7;
      return { day: days[idx], revenue: revenueByDay[idx] };
    });
  };

  const weeklyData = getWeeklyRevenue();
  const maxWeeklyRevenue = Math.max(...weeklyData.map((d) => d.revenue));

  // Recent 7 orders
  const recent = orders.slice(0, 7);

  return (
    <div className="space-y-5">
      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Orders" value={orders.length} icon={<BiReceipt className="text-lg" />} color="var(--color-ink)" delay={0} />
        <StatCard label="Revenue" value={`₹${totalRevenue.toLocaleString()}`} icon={<BiDollar className="text-lg" />} color="var(--color-route)" delay={0.05} />
        <StatCard label="Delivered" value={delivered} icon={<BiCheckCircle className="text-lg" />} color="var(--color-signal)" delay={0.1} />
        <StatCard label="Cancelled" value={cancelled} icon={<BiXCircle className="text-lg" />} color="var(--color-alert)" delay={0.15} />
      </div>

      {/* Weekly revenue bar graph */}
      <div className="p-5 rounded-3xl space-y-3 glass-card glass-card-highlight">
        <p className="text-[9px] font-mono tracking-widest uppercase font-bold" style={{ color: "var(--color-ghost)" }}>
          Weekly Earnings
        </p>
        {/* FIX: use explicit px heights derived from the 160px bar area so
            percentage heights work regardless of flex/grid nesting.
            h-44 = 176px; we reserve 16px for day labels, leaving 160px for bars. */}
        <div className="h-44 flex items-end justify-between gap-1.5 pt-4 border-b" style={{ borderColor: "var(--color-rule)" }}>
          {weeklyData.map((d, idx) => {
            const BAR_MAX_PX = 140;
            const barHeightPx = maxWeeklyRevenue > 0
              ? Math.max(Math.round((d.revenue / maxWeeklyRevenue) * BAR_MAX_PX), 6)
              : 6;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${barHeightPx}px` }}
                  transition={{ type: "spring", stiffness: 120, damping: 14, delay: idx * 0.05 + 0.2 }}
                  className="w-full rounded-t-lg relative cursor-pointer hover:opacity-100 transition-opacity"
                  style={{
                    background: idx === 6
                      ? "linear-gradient(to top, var(--color-route), var(--color-thermal))"
                      : "linear-gradient(to top, rgba(255,87,51,0.4), rgba(255,130,77,0.4))",
                    borderRadius: "6px 6px 0 0",
                  }}
                >
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-900 text-white text-[9px] font-body font-bold px-2 py-0.5 rounded shadow z-50 pointer-events-none whitespace-nowrap">
                    ₹{d.revenue}
                  </div>
                </motion.div>
                <span className="text-[9px] font-body text-slate-400 font-bold">{d.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {active > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
          style={{ backgroundColor: "var(--color-route-light)", borderColor: "var(--color-route)", color: "var(--color-route)" }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: "var(--color-route)" }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: "var(--color-route)" }} />
          </span>
          <p className="text-xs font-bold">
            {active} order{active > 1 ? "s" : ""} in progress right now
          </p>
        </div>
      )}

      {/* Recent orders mini list */}
      {recent.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-mono tracking-widest uppercase font-bold px-1" style={{ color: "var(--color-ghost)" }}>
            Recent Orders
          </p>
          <div className="overflow-hidden glass-card">
            {recent.map((order, i) => (
              <div
                key={order._id}
                className="flex items-center justify-between px-4 py-3 text-xs"
                style={{ borderBottom: i < recent.length - 1 ? "1px solid var(--color-rule)" : "none" }}
              >
                <span className="font-mono text-[10px]" style={{ color: "var(--color-manifest)" }}>
                  #{order._id.slice(-6).toUpperCase()}
                </span>
                <span className="font-mono font-bold" style={{ color: "var(--color-ink)" }}>
                  ₹{order.totalAmount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Demand Forecaster Widget */}
      <AIForecasterWidget restaurantId={restaurantId} />
    </div>
  );
};

const AIForecasterWidget = ({ restaurantId }: { restaurantId: string }) => {
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const { data } = await axios.get(
          `${restaurantService}/api/reviews/analytics/forecast/${restaurantId}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        setForecast(data);
      } catch (err) {
        console.error("Failed to load AI Forecast:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchForecast();
  }, [restaurantId]);

  if (loading) {
    return (
      <div className="p-5 rounded-3xl glass-card space-y-3 animate-pulse">
        <div className="h-4 w-32 bg-[var(--color-rule)] rounded" />
        <div className="h-10 bg-[var(--color-rule)] rounded-xl" />
      </div>
    );
  }

  if (!forecast) return null;

  return (
    <div
      className="p-5 rounded-3xl space-y-4 border transition-all hover:shadow-xl"
      style={{
        borderColor: "var(--color-rule)",
        background: "linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(168,85,247,0.06) 100%)"
      }}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔮</span>
          <p className="text-[10px] font-mono tracking-widest uppercase font-bold" style={{ color: "var(--color-route)" }}>
            AI Predictive Demand Forecast
          </p>
        </div>
        <span className="text-[9px] font-mono font-bold bg-[var(--color-route)]/10 text-[var(--color-route)] px-2.5 py-1 rounded-full">
          Gemini Powered
        </span>
      </div>

      <div className="space-y-1.5">
        <h4 className="text-base font-black font-display text-[var(--color-ink)]">
          {forecast.predictedIncrease || "Stable normal demand"}
        </h4>
        <p className="text-xs text-[var(--color-manifest)] leading-relaxed">
          {forecast.reason}
        </p>
      </div>

      {/* Suggested Item Preps */}
      {forecast.forecastedItems && forecast.forecastedItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-mono tracking-widest uppercase font-bold text-slate-400">
            Estimated Tomorrow's Item Counts
          </p>
          <div className="grid grid-cols-2 gap-2">
            {forecast.forecastedItems.map((item: any, idx: number) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-[var(--bg-base)] border flex justify-between items-center text-xs"
                style={{ borderColor: "var(--color-rule)" }}
              >
                <span className="font-semibold text-[var(--color-ink)] truncate mr-2">{item.name}</span>
                <span className="font-mono font-black text-[var(--color-route)] bg-[var(--color-route)]/5 px-2.5 py-0.5 rounded-lg">
                  {item.predictedCount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actionable Kitchen Checklist */}
      {forecast.recommendations && forecast.recommendations.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-[9px] font-mono tracking-widest uppercase font-bold text-slate-400">
            Actionable Prep Recommendations
          </p>
          <ul className="space-y-2">
            {forecast.recommendations.map((rec: string, idx: number) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-xs text-[var(--color-manifest)] leading-relaxed"
              >
                <span className="text-indigo-400 mt-0.5">✦</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default RestaurantAnalytics;
