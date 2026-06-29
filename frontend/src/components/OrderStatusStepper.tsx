import { motion, useReducedMotion } from "framer-motion";

interface OrderStatusStepperProps {
  currentStatus: string;
  timestamps?: Record<string, string>;
}

const STEPS = [
  {
    key: "placed",
    label: "Order Placed",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
  {
    key: "accepted",
    label: "Accepted",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    key: "preparing",
    label: "Preparing",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2v7l2 3v8M11 2v3M11 10v3M15 2v5c0 1.66-1.34 3-3 3" />
      </svg>
    ),
  },
  {
    key: "ready_for_rider",
    label: "Ready",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01z" />
      </svg>
    ),
  },
  {
    key: "rider_assigned",
    label: "Rider Assigned",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="7" r="4" />
        <path d="M5.5 21a8.38 8.38 0 0113 0" />
      </svg>
    ),
  },
  {
    key: "picked_up",
    label: "Picked Up",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M16 12l-4 4-4-4M12 8v8" />
      </svg>
    ),
  },
  {
    key: "delivered",
    label: "Delivered",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.7 2 2 0 012-2.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 6a16 16 0 006.84 6.84l.45-.45a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7a2 2 0 011.72 2z" />
      </svg>
    ),
  },
];

const STATUS_ORDER: Record<string, number> = {
  placed: 0,
  accepted: 1,
  preparing: 2,
  ready_for_rider: 3,
  rider_assigned: 4,
  picked_up: 5,
  delivered: 6,
  cancelled: -1,
};

const OrderStatusStepper = ({ currentStatus, timestamps = {} }: OrderStatusStepperProps) => {
  const currentIdx = STATUS_ORDER[currentStatus] ?? 0;
  const isCancelled = currentStatus === "cancelled";
  const shouldReduceMotion = useReducedMotion();

  if (isCancelled) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl"
        style={{
          backgroundColor: "var(--color-alert-light)",
          border: "1px solid rgba(239,68,68,0.25)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-alert)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6M9 9l6 6" />
        </svg>
        <span className="text-sm font-bold" style={{ color: "var(--color-alert)" }}>Order Cancelled</span>
      </div>
    );
  }

  return (
    <div className="relative" role="list" aria-label="Order progress">
      {STEPS.map((step, idx) => {
        const isDone = idx < currentIdx;
        const isActive = idx === currentIdx;
        const ts = timestamps[step.key];

        return (
          <div
            key={step.key}
            role="listitem"
            className="flex items-start gap-3 relative"
            aria-current={isActive ? "step" : undefined}
          >
            {/* Connector line */}
            {idx < STEPS.length - 1 && (
              <div
                className="absolute left-[17px] top-9 w-0.5 h-7 bg-[var(--color-rule)] animate-fade-in"
                aria-hidden="true"
                style={isDone ? { boxShadow: "0 0 6px var(--color-signal)" } : {}}
              >
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: isDone ? 1 : 0 }}
                  transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.6, ease: "easeInOut" }}
                  style={{
                    transformOrigin: "top",
                    width: "100%",
                    height: "100%",
                    background: "var(--color-signal)",
                  }}
                />
              </div>
            )}

            {/* Icon circle */}
            <div
              className="relative flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: isDone
                  ? "var(--color-signal)"
                  : isActive
                  ? "var(--color-route)"
                  : "var(--color-muted)",
                color: isDone || isActive ? "white" : "var(--color-ghost)",
                boxShadow: isDone
                  ? "0 0 14px var(--color-signal)"
                  : isActive
                  ? "0 0 14px var(--color-route)"
                  : "none",
                transition: "background-color 0.4s ease, box-shadow 0.4s ease",
                minWidth: 36,
                minHeight: 36,
              }}
            >
              {isDone ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                step.icon
              )}

              {/* Pulsing ring for active */}
              {isActive && (
                <span
                  className="absolute inset-0 rounded-full animate-ping opacity-40"
                  style={{ backgroundColor: "var(--color-route)" }}
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Text */}
            <div className="flex-1 pb-7 min-w-0">
              <p
                className="text-sm font-bold leading-none"
                style={{
                  color: isDone
                    ? "var(--color-signal)"
                    : isActive
                    ? "var(--color-route)"
                    : "var(--color-ghost)",
                }}
              >
                {step.label}
              </p>
              {ts && (
                <p
                  className="text-[10px] font-mono mt-0.5"
                  style={{ color: "var(--color-ghost)" }}
                >
                  {new Date(ts).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </p>
              )}
              {isActive && !ts && (
                <p
                  className="text-[10px] font-mono mt-0.5 animate-pulse"
                  style={{ color: "var(--color-route)" }}
                >
                  In progress…
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OrderStatusStepper;
