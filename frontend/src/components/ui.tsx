import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from "react";

/* ── Skeleton ── */
export const Skeleton = ({ className = "", style }: { className?: string; style?: CSSProperties }) => (
  <div className={`skeleton-shimmer ${className}`} style={style} />
);

/* ── SkeletonCard — animated shimmer placeholder ── */
export const SkeletonCard = ({ className = "" }: { className?: string }) => (
  <div className={`skeleton-shimmer rounded-2xl ${className}`} />
);

/* ── StatusPill ── */
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  placed:          { label: "Order placed",    bg: "rgba(37,99,235,0.15)",  color: "#60A5FA", dot: "#3B82F6" },
  accepted:        { label: "Confirmed",        bg: "rgba(5,150,105,0.15)",  color: "#34D399", dot: "#10B981" },
  preparing:       { label: "Preparing",        bg: "rgba(234,88,12,0.15)",  color: "#FB923C", dot: "#F97316" },
  ready_for_rider: { label: "Ready",            bg: "rgba(124,58,237,0.15)", color: "#A78BFA", dot: "#8B5CF6" },
  rider_assigned:  { label: "Rider assigned",   bg: "rgba(2,132,199,0.15)",  color: "#38BDF8", dot: "#0EA5E9" },
  picked_up:       { label: "On the way",       bg: "rgba(22,163,74,0.15)",  color: "#4ADE80", dot: "#22C55E" },
  delivered:       { label: "Delivered",        bg: "rgba(21,128,61,0.15)",  color: "#86EFAC", dot: "#16A34A" },
  cancelled:       { label: "Cancelled",        bg: "rgba(220,38,38,0.15)",  color: "#FCA5A5", dot: "#EF4444" },
  pending:         { label: "Pending",           bg: "rgba(115,115,115,0.15)",color: "#A3A3A3", dot: "#737373" },
};

export const StatusPill = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: "rgba(100,100,100,0.15)", color: "#9CA3AF", dot: "#6B7280" };
  const isLive = ["placed", "accepted", "preparing", "ready_for_rider", "rider_assigned", "picked_up", "pending"].includes(status);

  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase border border-white/5 shadow-inner"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {isLive && (
        <span className="relative flex h-2 w-2">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: cfg.dot }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ backgroundColor: cfg.dot }}
          />
        </span>
      )}
      {!isLive && (
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dot }} />
      )}
      {cfg.label}
    </span>
  );
};

/* ── LiveIndicator ── */
export const LiveIndicator = ({ label = "Live" }: { label?: string }) => (
  <span className="flex items-center gap-1.5">
    <span className="relative flex h-2 w-2">
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
        style={{ backgroundColor: "var(--color-route)" }}
      />
      <span
        className="relative inline-flex rounded-full h-2 w-2"
        style={{ backgroundColor: "var(--color-route)" }}
      />
    </span>
    <span
      className="text-[10px] font-body font-bold tracking-widest uppercase"
      style={{ color: "var(--color-route)" }}
    >
      {label}
    </span>
  </span>
);

/* ── Card ── */
interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children: ReactNode;
  className?: string;
}

export const Card = ({ as: Tag = "div", children, className = "", style, ...rest }: CardProps) => (
  <Tag
    className={`rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg glass-card ${className}`}
    style={{ ...style }}
    {...rest}
  >
    {children}
  </Tag>
);

export const StatusBadge = StatusPill;
