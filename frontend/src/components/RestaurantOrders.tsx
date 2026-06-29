import { useEffect, useState } from "react";
import axios from "axios";
import { restaurantService } from "../main";
import { StatusPill } from "./ui";
import { useSocket } from "../context/SocketContext";
import { BiReceipt, BiTime, BiLoader, BiChat, BiUserPlus } from "react-icons/bi";
import toast from "react-hot-toast";
import { ChatDrawer } from "./ChatDrawer";
import { RiderPickerModal } from "./RiderPickerModal";

interface RestaurantOrdersProps {
  restaurantId: string;
  limit?: number; // Optional limit for Overview section
}

const CUSTOMER_AVATARS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80"
];

const getCustomerAvatar = (id: string) => {
  const idx = id.charCodeAt(id.length - 1) % CUSTOMER_AVATARS.length;
  return CUSTOMER_AVATARS[idx];
};


const RestaurantOrders = ({ restaurantId, limit }: RestaurantOrdersProps) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);
  const [riderPickerOrderId, setRiderPickerOrderId] = useState<string | null>(null);
  const [noRiderOrderIds, setNoRiderOrderIds] = useState<Set<string>>(new Set());
  const { socket } = useSocket();

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

  useEffect(() => { fetchOrders(); }, [restaurantId]);

  useEffect(() => {
    if (!socket) return;
    socket.on("order:new", fetchOrders);
    socket.on("order:update", fetchOrders);
    socket.on("order:rider_assigned", fetchOrders);
    socket.on("order:picked_up", fetchOrders);
    socket.on("order:delivered", fetchOrders);

    const onNoRiders = ({ orderId }: { orderId: string }) => {
      toast.error(`No riders available for Order #${orderId.slice(-6).toUpperCase()}!`, { duration: 6000 });
      setNoRiderOrderIds((prev) => new Set(prev).add(orderId));
      fetchOrders();
    };
    socket.on("order:no_riders", onNoRiders);

    return () => {
      socket.off("order:new", fetchOrders);
      socket.off("order:update", fetchOrders);
      socket.off("order:rider_assigned", fetchOrders);
      socket.off("order:picked_up", fetchOrders);
      socket.off("order:delivered", fetchOrders);
      socket.off("order:no_riders", onNoRiders);
    };
  }, [socket]);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setActionId(orderId);
    try {
      await axios.put(
        `${restaurantService}/api/order/status/${orderId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success(`Order marked as ${newStatus.replace(/_/g, " ")}`);
      fetchOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update status");
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <BiLoader className="text-2xl animate-spin" style={{ color: "var(--color-route)" }} />
      </div>
    );
  }

  const activeOrders = orders.filter(o => o.status !== "cancelled" && o.status !== "delivered");
  const displayOrders = limit ? activeOrders.slice(0, limit) : activeOrders;

  if (displayOrders.length === 0) {
    return (
      <div className="text-center py-16 glass-card rounded-2xl flex flex-col items-center space-y-3">
        <div className="w-16 h-16 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
          <BiReceipt size={28} style={{ color: "var(--color-route)" }} />
        </div>
        <p className="text-sm font-bold font-display" style={{ color: "var(--color-ink)" }}>No Active Orders</p>
        <p className="text-xs" style={{ color: "var(--color-manifest)" }}>Orders will appear here as soon as they are placed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayOrders.map((order) => {
        const avatar = getCustomerAvatar(order._id);
        const date = new Date(order.createdAt);
        const formattedTime = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

        return (
          <div
            key={order._id}
            className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl gap-4 glass-card transition-all duration-200 hover:translate-y-[-2px] hover:shadow-lg animate-fade-in"
          >
            {/* Left side: Avatar + Order Details */}
            <div className="flex items-start gap-4 flex-1">
              <img
                src={avatar}
                alt="Customer profile"
                className="w-11 h-11 rounded-full object-cover border"
                style={{ borderColor: "var(--color-rule)" }}
              />
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold font-display leading-none" style={{ color: "var(--color-ink)" }}>
                    {order.deliveryAddress?.mobile ? `Customer #${order.deliveryAddress.mobile.toString().slice(-4)}` : "Priya Sharma"}
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    ID: #{order._id.slice(-6).toUpperCase()}
                  </span>
                  <StatusPill status={order.status} />
                </div>
                <p className="text-xs font-semibold leading-relaxed" style={{ color: "var(--color-manifest)" }}>
                  {order.items?.map((item: any) => `${item.quantity}× ${item.name}`).join(", ")}
                </p>
                <div className="flex items-center gap-3 text-[10px] font-mono" style={{ color: "var(--color-ghost)" }}>
                  <span className="flex items-center gap-1"><BiTime /> {formattedTime}</span>
                  <span>•</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">₹{order.totalAmount}</span>
                </div>
              </div>
            </div>

            {/* Right side: Interactive Actions */}
            <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
              {order.status === "placed" && (
                <>
                  <button
                    disabled={actionId === order._id}
                    onClick={() => handleStatusUpdate(order._id, "cancelled")}
                    className="h-10 px-4 rounded-xl text-xs font-bold text-white transition-all duration-200 active:scale-[0.97] bg-rose-500 hover:bg-rose-600 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    disabled={actionId === order._id}
                    onClick={() => handleStatusUpdate(order._id, "accepted")}
                    className="h-10 px-4 rounded-xl text-xs font-bold text-white transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
                    style={{ backgroundColor: "var(--color-signal)" }}
                  >
                    {actionId === order._id ? <BiLoader className="animate-spin text-base" /> : "Accept"}
                  </button>
                </>
              )}

              {order.status === "accepted" && (
                <button
                  disabled={actionId === order._id}
                  onClick={() => handleStatusUpdate(order._id, "preparing")}
                  className="h-10 px-5 rounded-xl text-xs font-bold text-white transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-route)" }}
                >
                  {actionId === order._id ? <BiLoader className="animate-spin text-base" /> : "Start Preparing"}
                </button>
              )}

              {order.status === "preparing" && (
                <button
                  disabled={actionId === order._id}
                  onClick={() => handleStatusUpdate(order._id, "ready_for_rider")}
                  className="h-10 px-5 rounded-xl text-xs font-bold text-white transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-route)" }}
                >
                  {actionId === order._id ? <BiLoader className="animate-spin text-base" /> : "Mark Ready"}
                </button>
              )}

              {order.status === "ready_for_rider" && (
                <button
                  onClick={() => setRiderPickerOrderId(order._id)}
                  className={`h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-200 active:scale-[0.97] ${
                    noRiderOrderIds.has(order._id) ? "text-white animate-pulse" : ""
                  }`}
                  style={
                    noRiderOrderIds.has(order._id)
                      ? { backgroundColor: "#ef4444" }
                      : { backgroundColor: "var(--color-muted)", color: "var(--color-route)" }
                  }
                  title="Assign a real, available rider manually"
                >
                  <BiUserPlus className="text-base" />
                  {noRiderOrderIds.has(order._id) ? "Find Rider Now" : "Assign Manually"}
                </button>
              )}

              {/* Chat button for active orders */}
              <button
                onClick={() => setChatOrderId(order._id)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
                style={{ backgroundColor: "var(--color-muted)", color: "var(--color-route)" }}
                aria-label={`Chat for order ${order._id.slice(-6)}`}
                title="Chat with customer / rider"
              >
                <BiChat />
              </button>
            </div>
          </div>
        );
      })}

      {/* Chat drawer */}
      {chatOrderId && (
        <ChatDrawer
          orderId={chatOrderId}
          isOpen={!!chatOrderId}
          onClose={() => setChatOrderId(null)}
        />
      )}

      {/* Manual rider assignment picker */}
      {riderPickerOrderId && (
        <RiderPickerModal
          orderId={riderPickerOrderId}
          isOpen={!!riderPickerOrderId}
          onClose={() => setRiderPickerOrderId(null)}
          onAssigned={() => {
            setNoRiderOrderIds((prev) => {
              const next = new Set(prev);
              next.delete(riderPickerOrderId);
              return next;
            });
            fetchOrders();
          }}
        />
      )}
    </div>
  );
};

export default RestaurantOrders;
