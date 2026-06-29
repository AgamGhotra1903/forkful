import { useEffect, useState } from "react";
import type { IOrder } from "../types";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { restaurantService } from "../main";
import { SkeletonCard, StatusPill, LiveIndicator } from "../components/ui";

const ACTIVE_STATUSES = ["placed","accepted","preparing","ready_for_rider","rider_assigned","picked_up"];

const OrderRow = ({ order, onClick }: { order: IOrder; onClick: () => void }) => {
  const isActive = ACTIVE_STATUSES.includes(order.status);
  const date = new Date(order.createdAt ?? Date.now());
  const formattedDate = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const formattedTime = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="group relative flex items-center justify-between gap-4 px-4 py-4 cursor-pointer transition-colors duration-150"
      style={{
        borderBottom: "1px solid var(--color-rule)",
        backgroundColor: "transparent",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,87,51,0.04)")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      aria-label={`Order ${order._id.slice(-6)}, ${order.status}`}
    >
      {/* Active left-border indicator */}
      {isActive && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[4px] rounded-r"
          style={{
            backgroundColor: "var(--color-route)",
            boxShadow: "2px 0 8px var(--color-route)"
          }}
          aria-hidden="true"
        />
      )}

      <div className="flex-1 min-w-0 space-y-1 pl-1">
        {/* Row 1: ID + status */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono font-bold" style={{ color: "var(--color-ink)" }}>
            #{order._id.slice(-6).toUpperCase()}
          </span>
          <StatusPill status={order.status} />
          {isActive && (
            <span
              className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "var(--color-muted)", color: "var(--color-route)" }}
            >
              Live
            </span>
          )}
        </div>

        {/* Row 2: items */}
        <p className="text-sm truncate" style={{ color: "var(--color-ink)" }}>
          {order.items?.map((item: any, i: number) => (
            <span key={i}>
              {item.quantity}×{" "}
              {item.name ?? (item.itemId as any)?.name ?? "Item"}
              {i < order.items.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
      </div>

      {/* Right: date + total */}
      <div className="text-right flex-shrink-0 space-y-0.5">
        <p className="text-sm font-mono font-bold" style={{ color: "var(--color-ink)" }}>
          ₹{order.totalAmount}
        </p>
        <p className="text-[11px] font-mono" style={{ color: "var(--color-ghost)" }}>
          {formattedDate} · {formattedTime}
        </p>
      </div>

      {/* Arrow */}
      <svg
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="var(--color-ghost)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className="flex-shrink-0 group-hover:stroke-[var(--color-route)] transition-colors"
        aria-hidden="true"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </div>
  );
};

const Orders = () => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { socket } = useSocket();

  const fetchOrders = async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/order/myorder`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setOrders(data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  useEffect(() => {
    if (!socket) return;
    const onUpdate = () => fetchOrders();
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

  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const pastOrders = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status));

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--bg-base)" }}>
      <div className="mx-auto max-w-2xl px-4 py-8">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="section-eyebrow mb-1">History</p>
            <h2 className="text-h2 font-bold font-display" style={{ color: "var(--color-ink)" }}>Your Orders</h2>
          </div>
          {activeOrders.length > 0 && <LiveIndicator label={`${activeOrders.length} active`} />}
        </div>

        {loading && (
          <div className="flex flex-col gap-3 pt-4">
            <SkeletonCard className="h-24 w-full" />
            <SkeletonCard className="h-24 w-full" />
            <SkeletonCard className="h-24 w-full" />
            <SkeletonCard className="h-24 w-full" />
            <SkeletonCard className="h-24 w-full" />
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && orders.length === 0 && (
          <div className="text-center py-24">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ backgroundColor: "var(--color-muted)" }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-route)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
            </div>
            <p className="text-base font-bold" style={{ color: "var(--color-ink)" }}>No orders yet</p>
            <p className="text-sm mt-1" style={{ color: "var(--color-manifest)" }}>
              Place your first order from a restaurant near you.
            </p>
            <button
              onClick={() => navigate("/")}
              className="btn-primary mt-6 px-6 h-11 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] inline-flex items-center justify-center"
            >
              Browse restaurants
            </button>
          </div>
        )}

        {/* ── Active orders ── */}
        {!loading && activeOrders.length > 0 && (
          <section className="mb-5" aria-label="Active orders">
            <p className="text-[10px] font-mono tracking-widest uppercase mb-2 px-1 font-semibold" style={{ color: "var(--color-ghost)" }}>
              In progress
            </p>
            <div
              className="glass-card rounded-2xl overflow-hidden border-2"
              style={{ borderColor: "var(--color-route)" }}
            >
              {activeOrders.map((order) => (
                <OrderRow key={order._id} order={order} onClick={() => navigate(`/order/${order._id}`)} />
              ))}
            </div>
          </section>
        )}

        {/* ── Past orders ── */}
        {!loading && pastOrders.length > 0 && (
          <section aria-label="Past orders">
            <p className="text-[10px] font-mono tracking-widest uppercase mb-2 px-1 font-semibold" style={{ color: "var(--color-ghost)" }}>
              Past
            </p>
            <div
              className="glass-card rounded-2xl overflow-hidden"
              style={{}}
            >
              {pastOrders.map((order) => (
                <OrderRow key={order._id} order={order} onClick={() => navigate(`/order/${order._id}`)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
};

export default Orders;
