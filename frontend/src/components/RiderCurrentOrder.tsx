import { useState } from "react";
import axios from "axios";
import { riderService } from "../main";
import toast from "react-hot-toast";
import type { IOrder } from "../types";

const NEXT_STATUS: Record<string, string> = {
  accepted: "preparing",
  preparing: "ready_for_rider",
  ready_for_rider: "rider_assigned",
  rider_assigned: "picked_up",
  picked_up: "delivered",
};


interface RiderCurrentOrderProps {
  order: IOrder;
  onStatusUpdate: () => void;
}

const RiderCurrentOrder = ({ order, onStatusUpdate }: RiderCurrentOrderProps) => {
  const [updating, setUpdating] = useState(false);

  const nextStatus = NEXT_STATUS[order.status];

  const handleUpdate = async () => {
    if (!nextStatus) return;
    setUpdating(true);
    try {
      await axios.put(
        `${riderService}/api/rider/order/status/${order._id}`,
        { status: nextStatus },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success(`Status updated to: ${nextStatus.replace(/_/g, " ")}`);
      onStatusUpdate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const getStepIndex = (status: string) => {
    if (status === "picked_up") return 1;
    if (status === "delivered" || status === "completed") return 2;
    return 0;
  };
  const currentStepIdx = getStepIndex(order.status);

  const steps = [
    { label: "Assigned", icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      </svg>
    )},
    { label: "Picked Up", icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    )},
    { label: "Delivered", icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )}
  ];

  return (
    <div className="space-y-4">
      {/* Progress stepper */}
      <div className="flex items-center justify-between w-full px-2 py-2.5 relative">
        {/* Connecting Lines */}
        <div className="absolute left-[16.6%] right-[16.6%] top-[25px] h-[2px] z-0" style={{ backgroundColor: "var(--color-rule)" }}>
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${currentStepIdx * 50}%`, backgroundColor: "var(--color-route)" }}
          />
        </div>

        {/* Steps */}
        {steps.map((step, idx) => {
          const isCompleted = idx <= currentStepIdx;
          const isActive = idx === currentStepIdx;
          return (
            <div key={idx} className="flex flex-col items-center flex-1 z-10 relative">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
                style={{
                  backgroundColor: isCompleted ? "var(--color-route)" : "var(--color-rule)",
                  color: isCompleted ? "white" : "var(--color-ghost)",
                  boxShadow: isActive ? "0 0 0 4px rgba(255,87,51,0.18)" : "none"
                }}
              >
                {step.icon}
              </div>
              <span className="text-[10px] font-mono font-bold mt-2 text-center" style={{ color: isCompleted ? "var(--color-ink)" : "var(--color-ghost)" }}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Pickup block */}
      <div
        className="rounded-xl p-3 flex items-start gap-3"
        style={{
          backgroundColor: "var(--color-route-light)",
          border: "1px solid rgba(255,87,51,0.15)"
        }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
          style={{ backgroundColor: "var(--color-route)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-mono font-bold block leading-tight" style={{ color: "var(--color-route)" }}>PICKUP</span>
          <h4 className="text-[14px] font-bold truncate mt-0.5" style={{ color: "var(--color-ink)" }}>
            {order.restaurantName}
          </h4>
        </div>
      </div>

      {/* Dropoff block */}
      <div
        className="rounded-xl p-3 flex items-start gap-3"
        style={{
          backgroundColor: "var(--color-signal-light)",
          border: "1px solid rgba(16,185,129,0.15)"
        }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
          style={{ backgroundColor: "var(--color-signal)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-mono font-bold block leading-tight" style={{ color: "var(--color-signal)" }}>DROPOFF</span>
          <h4 className="text-[14px] font-bold mt-0.5 leading-snug" style={{ color: "var(--color-ink)" }}>
            {order.deliveryAddress?.formattedAddress}
          </h4>
        </div>
      </div>

      {/* Earnings row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl" style={{ backgroundColor: "var(--color-rule)" }}>
          <span className="text-[10px] font-mono block leading-tight" style={{ color: "var(--color-ghost)" }}>Order total</span>
          <span className="text-[14px] font-mono font-black mt-1 block" style={{ color: "var(--color-ink)" }}>
            ₹{order.totalAmount}
          </span>
        </div>
        <div className="p-3 rounded-xl" style={{ backgroundColor: "var(--color-route-light)" }}>
          <span className="text-[10px] font-mono block leading-tight" style={{ color: "var(--color-route)" }}>Your earning</span>
          <span className="text-[14px] font-mono font-black mt-1 block" style={{ color: "var(--color-route)" }}>
            ₹{order.riderAmount}
          </span>
        </div>
      </div>

      {/* Restaurant call row */}
      {order.restaurantPhone && (
        <div className="flex items-center justify-between p-3 rounded-xl border" style={{ borderColor: "var(--color-rule)" }}>
          <div>
            <span className="text-[10px] font-mono block leading-tight" style={{ color: "var(--color-ghost)" }}>Restaurant</span>
            <span className="text-[14px] font-mono font-bold mt-0.5 block" style={{ color: "var(--color-ink)" }}>
              {order.restaurantPhone}
            </span>
          </div>
          <a
            href={`tel:${order.restaurantPhone}`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm active:scale-95 transition-all duration-200"
            style={{ backgroundColor: "var(--color-route)", borderRadius: "var(--radius-md)" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span>Call</span>
          </a>
        </div>
      )}

      {/* Customer call row */}
      {order.deliveryAddress?.mobile && (
        <div className="flex items-center justify-between p-3 rounded-xl border" style={{ borderColor: "var(--color-rule)" }}>
          <div>
            <span className="text-[10px] font-mono block leading-tight" style={{ color: "var(--color-ghost)" }}>Customer</span>
            <span className="text-[14px] font-mono font-bold mt-0.5 block" style={{ color: "var(--color-ink)" }}>
              {order.deliveryAddress.mobile}
            </span>
          </div>
          <a
            href={`tel:${order.deliveryAddress.mobile}`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm active:scale-95 transition-all duration-200"
            style={{ backgroundColor: "var(--color-route)", borderRadius: "var(--radius-md)" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span>Call</span>
          </a>
        </div>
      )}

      {/* Action buttons */}
      {nextStatus && (["rider_assigned", "picked_up"] as string[]).includes(order.status) && (
        <button
          onClick={handleUpdate}
          disabled={updating}
          className="w-full text-sm font-bold text-white transition-all duration-200 active:scale-[0.97] disabled:opacity-50 cursor-pointer shadow-md py-3.5 hover:brightness-105"
          style={{
            backgroundColor: order.status === "rider_assigned" ? "var(--color-urgency)" : "var(--color-signal)",
            borderRadius: "var(--radius-md)"
          }}
        >
          {updating ? (
            "Updating…"
          ) : order.status === "rider_assigned" ? (
            "Reached Restaurant — Mark Picked Up"
          ) : (
            "Mark as delivered"
          )}
        </button>
      )}
    </div>
  );
};

export default RiderCurrentOrder;
