import { useSearchParams, useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect, useState } from "react";
import type { IRestaurant } from "../types";
import axios from "axios";
import { authService, restaurantService } from "../main";
import { AISearchBar } from "../components/AISearchBar";
import { Skeleton, LiveIndicator } from "../components/ui";
import toast from "react-hot-toast";
import { BiSolidBolt, BiGift, BiCycling, BiMoon, BiStore, BiCloudRain, BiStar } from "react-icons/bi";
import { initReveal } from "../utils/reveal";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import CountUp from "../components/CountUp";
import BlurUpImage from "../components/BlurUpImage";

const PanToss = () => {
  const shouldReduceMotion = useReducedMotion();
  if (shouldReduceMotion) return null;

  return (
    <motion.div
      className="pointer-events-none select-none"
      style={{ width: 120, height: 120, position: "relative" }}
    >
      {/* The pan — tilts on a pivot */}
      <motion.div
        style={{ originX: "80%", originY: "80%", position: "absolute", bottom: 0, left: 0 }}
        animate={{ rotate: [-8, 12, -8] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: [0.4, 0, 0.2, 1], times: [0, 0.45, 1] }}
      >
        <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
          {/* Handle */}
          <rect x="54" y="60" width="30" height="7" rx="3.5"
            fill="#6B7280" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          {/* Pan body */}
          <ellipse cx="38" cy="58" rx="28" ry="12"
            fill="#374151" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
          {/* Pan inner highlight */}
          <ellipse cx="38" cy="56" rx="22" ry="8" fill="#1F2937" opacity="0.7" />
          {/* Rim highlight */}
          <ellipse cx="38" cy="46" rx="28" ry="7"
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        </svg>
      </motion.div>

      {/* Food item — tosses upward and falls back */}
      <motion.div
        style={{ position: "absolute", left: 28, bottom: 44, fontSize: "1.6rem", lineHeight: 1 }}
        animate={{
          y:       [0, -55, 0],
          rotate:  [0, 180, 360],
          scale:   [1, 0.85, 1],
          opacity: [1, 1, 1],
        }}
        transition={{
          duration: 2.4,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.45, 1],
        }}
      >
        🥘
      </motion.div>
    </motion.div>
  );
};

const STATUS_LABEL: Record<string, string> = {
  placed: "Order placed",
  accepted: "Confirmed",
  preparing: "Preparing",
  ready_for_rider: "Ready for pickup",
  rider_assigned: "Rider on the way",
  picked_up: "Out for delivery",
};

const STATUS_EMOJI: Record<string, string> = {
  placed: "📋", accepted: "✅", preparing: "👨🍳",
  ready_for_rider: "📦", rider_assigned: "🛵", picked_up: "🚀",
};

const ActiveOrderTile = ({
  order,
  expanded,
  onToggle,
  onNavigate,
}: {
  order: any;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) => {
  const shouldReduceMotion = useReducedMotion();
  const statusLabel = STATUS_LABEL[order.status] ?? order.status;
  const emoji = STATUS_EMOJI[order.status] ?? "🍽️";

  return (
    <AnimatePresence>
      <motion.div
        key="active-order-tile"
        layout
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 80 }}
        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 80 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        onClick={onToggle}
        className="fixed bottom-20 md:bottom-6 left-1/2 z-50 cursor-pointer"
        style={{
          x: "-50%",
          transform: "translateX(-50%)",
        }}
      >
        <motion.div
          layout
          style={{
            background:
              "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(11,15,25,0.98) 100%)",
            backdropFilter: "blur(32px) saturate(200%)",
            WebkitBackdropFilter: "blur(32px) saturate(200%)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: expanded ? "var(--radius-xl)" : "9999px",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.12), 0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,87,51,0.15)",
            overflow: "hidden",
            minWidth: expanded ? 320 : 200,
            maxWidth: 360,
          }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 300, damping: 30 }
          }
        >
          {/* Collapsed pill */}
          <div className="flex items-center gap-3 px-5 py-3">
            {/* Pulsing live dot */}
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                style={{ backgroundColor: "#FF5733" }}
              />
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{ backgroundColor: "#FF5733" }}
              />
            </span>

            <span className="text-base">{emoji}</span>

            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-bold truncate"
                style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}
              >
                {statusLabel}
              </p>
              {!expanded && (
                <p
                  className="text-[10px] truncate"
                  style={{ color: "var(--color-manifest)", fontFamily: "var(--font-mono)" }}
                >
                  #{order._id.slice(-6).toUpperCase()} · ₹{order.totalAmount}
                </p>
              )}
            </div>

            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.25 }}
              style={{ color: "var(--color-manifest)", fontSize: "0.75rem" }}
            >
              ▾
            </motion.span>
          </div>

          {/* Expanded detail panel */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={
                  shouldReduceMotion ? { duration: 0 } : { duration: 0.3, ease: "easeInOut" }
                }
                style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
                className="overflow-hidden"
              >
                <div className="px-5 py-4 space-y-3">
                  {/* Order ID + amount */}
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-mono font-bold"
                      style={{ color: "var(--color-ghost)" }}
                    >
                      #{order._id.slice(-6).toUpperCase()}
                    </span>
                    <span
                      className="text-sm font-black"
                      style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}
                    >
                      ₹{order.totalAmount}
                    </span>
                  </div>

                  {/* Items summary */}
                  <p className="text-xs truncate" style={{ color: "var(--color-manifest)" }}>
                    {order.items
                      ?.slice(0, 3)
                      .map((it: any, i: number) => `${it.quantity}×${it.name ?? "Item"}${i < Math.min(order.items.length, 3) - 1 ? ", " : ""}`)
                      .join("")}
                    {order.items?.length > 3 ? ` +${order.items.length - 3} more` : ""}
                  </p>

                  {/* Restaurant name */}
                  <p
                    className="text-[11px] font-semibold"
                    style={{ color: "var(--color-route)", fontFamily: "var(--font-body)" }}
                  >
                    {order.restaurantName ?? "Restaurant"}
                  </p>

                  {/* CTA */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onNavigate(); }}
                    className="w-full py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.97]"
                    style={{
                      background: "linear-gradient(135deg, #FF5733, #c0392b)",
                      boxShadow: "0 6px 20px rgba(255,87,51,0.4)",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    Track Order →
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const getRealRating = (res: IRestaurant) => {
  if (res.ratingCount && res.ratingCount > 0) {
    return ((res.overallRating ?? 0) / res.ratingCount).toFixed(1);
  }
  const id = res._id;
  const n = id.charCodeAt(id.length - 1) + id.charCodeAt(id.length - 2);
  return ((n % 10) / 10 + 4.0).toFixed(1);
};
const getMockDuration = (id: string) => (id.charCodeAt(id.length - 1) % 20) + 20;
const getMockCost = (id: string) => {
  const n = id.charCodeAt(id.length - 2) ?? 6;
  return (Math.floor(n / 3) + 2) * 100;
};
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return +(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
}

const FOOD_CATEGORIES = [
  { label: "Pizza", filter: "pizza", image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80", color: "#FF5733" },
  { label: "Burgers", filter: "burger", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80", color: "#E8A020" },
  { label: "Biryani", filter: "biryani", image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=300&q=80", color: "#C64B8C" },
  { label: "Noodles", filter: "noodles", image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=300&q=80", color: "#2196A6" },
  { label: "Salads", filter: "salad", image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=300&q=80", color: "#4CAF50" },
  { label: "Sushi", filter: "sushi", image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=300&q=80", color: "#9C27B0" },
  { label: "Café", filter: "cafe", image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=300&q=80", color: "#795548" },
  { label: "Desserts", filter: "dessert", image: "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=300&q=80", color: "#E91E63" },
  { label: "Chinese", filter: "chinese", image: "https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=300&q=80", color: "#FF5722" },
  { label: "South Indian", filter: "south indian", image: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=300&q=80", color: "#FF9800" },
];

const PROMO_BANNERS = [
  {
    id: 1,
    title: "50% OFF up to ₹100",
    subtitle: "On your first 3 orders",
    code: "NEW50",
    gradient: "linear-gradient(135deg, #FF593C 0%, #FF824D 100%)",
    icon: "",
  },
  {
    id: 2,
    title: "Free delivery",
    subtitle: "On orders above ₹199",
    code: "FREEDEL",
    gradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
    icon: "",
  },
  {
    id: 3,
    title: "Order at midnight",
    subtitle: "Late night specials available",
    code: "NIGHT30",
    gradient: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
    icon: "",
  },
];

const saveRecentlyViewed = (res: IRestaurant) => {
  try {
    const raw = localStorage.getItem("recently_viewed");
    let list = raw ? JSON.parse(raw) : [];
    list = list.filter((x: any) => x._id !== res._id);
    list.unshift({
      _id: res._id,
      name: res.name,
      image: res.image,
      overallRating: res.overallRating,
      ratingCount: res.ratingCount,
      description: res.description
    });
    localStorage.setItem("recently_viewed", JSON.stringify(list.slice(0, 6)));
  } catch (e) {
    console.error(e);
  }
};

const RestaurantCard = ({ restaurant, distance }: { restaurant: IRestaurant; distance: number }) => {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const rating = getRealRating(restaurant);
  const duration = getMockDuration(restaurant._id);
  const cost = getMockCost(restaurant._id);
  const isOpen = restaurant.isOpen;
  const ratingNum = parseFloat(rating);
  const isNew = restaurant._id.charCodeAt(restaurant._id.length - 1) % 3 === 0;
  const velocity = (restaurant._id.charCodeAt(restaurant._id.length - 1) % 15) + 12;

  const handleClick = () => {
    saveRecentlyViewed(restaurant);
    navigate(`/restaurant/${restaurant._id}`);
  };

  const cardVariants: import("framer-motion").Variants = {
    hover: shouldReduceMotion ? {} : {
      y: -2,
      scale: 1.012,
      boxShadow: "0 0 0 1px rgba(255, 87, 51, 0.15), 0 20px 40px rgba(0, 0, 0, 0.25)",
      transition: { type: "spring" as const, stiffness: 300, damping: 20 }
    }
  };

  return (
    <motion.div
      onClick={handleClick}
      className="group cursor-pointer glass-card card-lift overflow-hidden relative"
      style={{ borderRadius: "var(--radius-lg)" }}
      whileHover="hover"
      whileTap={{ scale: 0.98, transition: { type: "spring", stiffness: 500, damping: 25 } }}
      variants={cardVariants}
    >
      <div 
        className="absolute top-0 left-0 right-0 h-[1px] z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.20), transparent)",
        }}
      />
      <div className="relative overflow-hidden" style={{ height: 192, backgroundColor: "var(--bg-surface-2)", borderRadius: "var(--radius-lg) var(--radius-lg) 0 0" }}>
        <BlurUpImage
          src={
            restaurant.image ||
            "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800&auto=format&fit=crop"
          }
          alt={restaurant.name}
          className={[
            "w-full h-full object-cover transition-transform duration-500",
            "group-hover:scale-[1.04]",
            !isOpen ? "grayscale opacity-60" : "",
          ].join(" ")}
          style={{ height: 192 }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Delivery time chip */}
        <div
          className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg text-white text-[11px] font-mono font-semibold flex items-center gap-1"
          style={{ backgroundColor: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          {duration}–{duration + 5} min
        </div>

        {/* Discount badge */}
        {isOpen && ratingNum >= 4.5 && (
          <div
            className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold text-white"
            style={{ backgroundColor: "var(--color-route)" }}
          >
            TOP RATED
          </div>
        )}

        {!isOpen && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.35)" }}>
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: "rgba(0,0,0,0.75)" }}>
              Closed now
            </span>
          </div>
        )}

        {/* New Badge */}
        {isNew && (
          <div
            className="absolute top-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-md z-10"
            style={{
              backgroundColor: "var(--color-route)",
              right: isOpen ? "4.5rem" : "0.625rem"
            }}
          >
            NEW
          </div>
        )}

        {/* Open badge */}
        {isOpen && (
          <div
            className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold z-10"
            style={{ backgroundColor: "var(--color-signal-light)", color: "var(--color-signal)" }}
          >
            Open
          </div>
        )}
      </div>

      <div
        style={{
          borderTop: "1px solid var(--color-rule)",
          backdropFilter: "blur(4px)",
          padding: "var(--space-4) var(--space-4)",
        }}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-bold leading-snug truncate" style={{ color: "var(--color-ink)" }}>
            {restaurant.name}
          </h3>
          <span
            className="flex items-center gap-1 text-xs font-bold flex-shrink-0 px-1.5 py-0.5 rounded-md glow-orange"
            style={{
              color: ratingNum >= 4.5 ? "white" : "var(--color-signal)",
              backgroundColor: ratingNum >= 4.5 ? "var(--color-signal)" : "var(--color-signal-light)",
              letterSpacing: "-0.01em",
            }}
          >
            {rating}
            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </span>
        </div>
        
        {/* Order velocity indicators */}
        <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-500 mb-1.5">
          <BiSolidBolt className="text-amber-500 text-sm" />
          <span>{velocity} orders trending near you</span>
        </div>

        <p className="text-xs truncate mb-2" style={{ color: "var(--color-manifest)" }}>
          {restaurant.description || "Multi-cuisine · Fresh & fast"}
        </p>
        <div className="flex items-center gap-0 text-[11px]" style={{ color: "var(--color-ghost)" }}>
          <span className="font-mono">{distance} km away</span>
          <span className="mx-1.5">·</span>
          <span className="font-mono">₹{cost} for two</span>
        </div>

        {/* Offer tag */}
        {isOpen && (
          <div
            className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold pt-2.5"
            style={{ borderTop: "1px dashed var(--color-rule)", color: "var(--color-route)" }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            {getMockCost(restaurant._id) > 400 ? "₹100 OFF on ₹299+" : "Free delivery on ₹199+"}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const RestaurantSkeleton = () => (
  <div className="glass-card overflow-hidden" style={{ borderRadius: "var(--radius-lg)" }}>
    <Skeleton className="w-full" style={{ height: 192 }} />
    <div className="p-3.5 space-y-2">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-5 w-10 rounded-md" />
      </div>
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-1/3" />
      <div className="pt-2.5 mt-1" style={{ borderTop: "1px dashed var(--color-rule)" }}>
        <Skeleton className="h-3 w-2/5" />
      </div>
    </div>
  </div>
);

const FilterPill = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex-shrink-0 px-4 h-9 rounded-full text-xs font-semibold transition-all duration-200 active:scale-[0.96]"
    style={
      active
        ? { background: "linear-gradient(135deg, #FF5733, #c0392b)", color: "white", border: "none", boxShadow: "0 4px 12px rgba(255,87,51,0.4)", fontFamily: "var(--font-display)" }
        : { backgroundColor: "var(--bg-surface-2)", color: "var(--color-manifest)", border: "1px solid var(--color-rule)", fontFamily: "var(--font-body)" }
    }
    onMouseEnter={(e) => {
      if (!active) {
        e.currentTarget.style.borderColor = "rgba(255,87,51,0.35)";
        e.currentTarget.style.color = "var(--color-route)";
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        e.currentTarget.style.borderColor = "var(--color-rule)";
        e.currentTarget.style.color = "var(--color-manifest)";
      }
    }}
    aria-pressed={active}
  >
    {label}
  </button>
);

const CategoryChip = ({ image, label, active, onClick }: { image: string; label: string; active: boolean; onClick: () => void }) => (
  <motion.button
    onClick={onClick}
    className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer"
    style={{ minWidth: 72 }}
    whileHover={active ? {} : { y: -4, scale: 1.06 }}
    whileTap={{ scale: 0.93 }}
    transition={{ type: "spring", stiffness: 450, damping: 18 }}
  >
    <div
      className="w-16 h-16 rounded-2xl overflow-hidden transition-all duration-200 img-container"
      style={{
        ...(active ? {
          border: "2px solid #FF5733",
          boxShadow:
            "0 0 0 4px rgba(255,87,51,0.15), 0 0 20px rgba(255,87,51,0.3), 0 4px 20px rgba(255,87,51,0.35)",
          transform: "translateY(-4px) scale(1.05)",
        } : {
          border: "1px solid var(--color-rule)",
          boxShadow: "none",
        })
      }}
    >
      <img src={image} alt={label} className="w-full h-full object-cover" />
    </div>
    <span className="text-[11px] font-bold" style={{ color: active ? "#FF5733" : "var(--color-manifest)", fontFamily: "var(--font-body)" }}>
      {label}
    </span>
  </motion.button>
);

const PromoBanner = ({ banner }: { banner: typeof PROMO_BANNERS[0] }) => (
  <motion.div
    className="flex-shrink-0 w-72 h-28 rounded-2xl p-4 flex items-center justify-between cursor-pointer relative overflow-hidden noise-overlay"
    style={{
      background: banner.gradient,
      borderRadius: "var(--radius-lg)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 8px 32px rgba(0,0,0,0.3)",
    }}
    whileHover={{ scale: 1.025, y: -3 }}
    whileTap={{ scale: 0.97 }}
    transition={{ type: "spring", stiffness: 380, damping: 22 }}
  >
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, height: "1px",
      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
      zIndex: 5,
    }} aria-hidden="true" />
    {/* Background decoration */}
    <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.12)" }} />
    <div className="absolute -right-2 -bottom-8 w-32 h-32 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />

    <div className="relative z-10 flex-1 pr-2">
      <p className="text-white/80 text-[10px] font-semibold uppercase tracking-wider mb-1">{banner.subtitle}</p>
      <p className="text-white text-base font-bold leading-tight mb-2">{banner.title}</p>
      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold" style={{ backgroundColor: "rgba(255,255,255,0.25)", color: "white" }}>
        USE: {banner.code}
      </div>
    </div>
    <div className="text-2xl text-white relative z-10 flex items-center justify-center bg-white/20 w-11 h-11 rounded-xl backdrop-blur-sm shadow-inner flex-shrink-0">
      {banner.id === 1 && <BiGift />}
      {banner.id === 2 && <BiCycling />}
      {banner.id === 3 && <BiMoon />}
    </div>
  </motion.div>
);

const Home = () => {
  const { location, user, setUser, city } = useAppData();
  const navigate = useNavigate();

  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>(user?.dietaryPreferences || []);
  const [allergyList, setAllergyList] = useState<string[]>(user?.allergies || []);
  const [healthGoals, setHealthGoals] = useState<string>(user?.healthGoals || "");
  const [newAllergy, setNewAllergy] = useState<string>("");
  const [, setSavingProfile] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      setDietaryPrefs(user.dietaryPreferences || []);
      setAllergyList(user.allergies || []);
      setHealthGoals(user.healthGoals || "");
    }
  }, [user]);

  const savePreferences = async (updatedPrefs?: string[], updatedAllergies?: string[], updatedGoals?: string) => {
    setSavingProfile(true);
    try {
      const prefs = updatedPrefs !== undefined ? updatedPrefs : dietaryPrefs;
      const allergiesVal = updatedAllergies !== undefined ? updatedAllergies : allergyList;
      const goals = updatedGoals !== undefined ? updatedGoals : healthGoals;

      const { data } = await axios.put(
        `${authService}/api/auth/profile`,
        { dietaryPreferences: prefs, allergies: allergiesVal, healthGoals: goals },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      setUser(data.user);
      toast.success("AI Profile updated");
    } catch (err: any) {
      console.error("Failed to update AI profile:", err);
      toast.error("Failed to update AI profile");
    } finally {
      setSavingProfile(false);
    }
  };
  const shouldReduceMotion = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") || "";

  const [restaurants, setRestaurants] = useState<IRestaurant[]>([]);
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.04,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" as const }
    }
  };
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [weatherDismissed, setWeatherDismissed] = useState(false);
  const [weatherCondition, setWeatherCondition] = useState<{ show: boolean; label: string; suggestion: string; category: string } | null>(null);

  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [orderTileOpen, setOrderTileOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "customer") return;
    const fetchActive = async () => {
      try {
        const { data } = await axios.get(`${restaurantService}/api/order/myorder`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const ACTIVE = ["placed","accepted","preparing","ready_for_rider","rider_assigned","picked_up"];
        const found = (data.orders || []).find((o: any) => ACTIVE.includes(o.status));
        setActiveOrder(found || null);
      } catch { /* silent */ }
    };
    fetchActive();
    const interval = setInterval(fetchActive, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Fire reveal observer whenever restaurants list updates (cards may be new DOM nodes)
  useEffect(() => {
    // Small defer so DOM has painted before we measure intersections
    const t = setTimeout(initReveal, 80);
    return () => clearTimeout(t);
  }, [restaurants, loading]);

  // Detect real local weather via Open-Meteo (free, no API key required)
  useEffect(() => {
    // If user already dismissed the banner this session, don't re-fetch
    if (sessionStorage.getItem("weather_dismissed") === "1") {
      setWeatherDismissed(true);
      return;
    }

    const detectWeather = async () => {
      // Default to hidden — only flip show:true on a confirmed severe WMO code
      const hide = { show: false, label: "", suggestion: "", category: "" };

      try {
        // Require explicit geolocation consent — no location, no banner
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 6000,
            maximumAge: 5 * 60 * 1000, // reuse cached position up to 5 min
          })
        );
        const { latitude, longitude } = pos.coords;

        // WMO weather code descriptions: https://open-meteo.com/en/docs
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=weathercode,temperature_2m,precipitation&timezone=auto`;

        let res: Response;
        try {
          res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        } catch {
          // Network failure (DNS, timeout) — hide banner silently
          setWeatherCondition(hide);
          return;
        }

        if (!res.ok) {
          setWeatherCondition(hide);
          return;
        }

        const json = await res.json();

        // Strictly validate that we received a real numeric weathercode.
        // If the shape is unexpected, treat as "unknown" and hide.
        const rawCode = json?.current?.weathercode;
        if (typeof rawCode !== "number" || !Number.isFinite(rawCode)) {
          setWeatherCondition(hide);
          return;
        }

        // Precipitation must also be present and non-trivial for drizzle codes
        // to avoid showing "raining" when the API returns a stale rainy code
        // from a previous forecast cycle but current precip is actually 0.
        const precipitation: number = json?.current?.precipitation ?? 0;

        // WMO codes — only show for actively precipitating conditions:
        // 51–67: Drizzle / Rain (require precipitation > 0 for 51–55 drizzle)
        // 71–77: Snow
        // 95+:   Thunderstorm
        const code = rawCode;

        if (code >= 51 && code <= 67) {
          const isHeavyRain = rawCode >= 61; // heavy rain codes — show unconditionally
          if (isHeavyRain || precipitation > 0) {
            setWeatherCondition({ show: true, label: "It's raining", suggestion: "Perfect weather for hot soup & noodles!", category: "noodles" });
          } else {
            setWeatherCondition(hide);
          }
        } else if (rawCode >= 71 && rawCode <= 77) {
          setWeatherCondition({ show: true, label: "It's snowing outside", suggestion: "Stay cozy — hot drinks & desserts incoming!", category: "dessert" });
        } else if (rawCode >= 95) {
          setWeatherCondition({ show: true, label: "Thunderstorm outside", suggestion: "Stay safe indoors! Comfort food delivered to your door.", category: "biryani" });
        } else {
          // Clear, cloudy, fog, windy — no banner
          setWeatherCondition(hide);
        }
      } catch {
        // Geolocation denied/unavailable, parse error — never show banner
        setWeatherCondition(hide);
      }
    };

    // Small delay so the banner never flickers in before the API call resolves,
    // and to avoid triggering on React Fast Refresh hot reloads in dev.
    const timer = setTimeout(detectWeather, 1500);
    return () => clearTimeout(timer);
  }, []);



  const getGreeting = () => {
    const hours = new Date().getHours();
    const name = user?.name?.split(" ")[0] || "Rahul";
    let greeting = "Good morning";
    let sub = "Ready for breakfast?";
    if (hours >= 12 && hours < 17) {
      greeting = "Good afternoon";
      sub = "Ready for lunch?";
    } else if (hours >= 17 && hours < 22) {
      greeting = "Good evening";
      sub = "Ready for dinner?";
    } else if (hours >= 22 || hours < 4) {
      greeting = "Late night";
      sub = "Craving a midnight snack?";
    }
    return { title: `${greeting}, ${name}`, subtitle: sub };
  };

  const { title: greetingTitle, subtitle: greetingSubtitle } = getGreeting();

  const handleSearchChange = (value: string) => {
    if (value) setSearchParams({ search: value });
    else setSearchParams({});
  };

  const fetchRestaurants = async () => {
    if (!location?.latitude || !location?.longitude) return;
    try {
      setLoading(true);
      const { data } = await axios.get(`${restaurantService}/api/restaurant/all`, {
        // FIXED BUG: explicitly request the 30km customer-feed radius.
        // The backend also clamps to 30km regardless, but sending it here
        // keeps the contract between frontend and backend explicit.
        params: { latitude: location.latitude, longitude: location.longitude, radius: 30000, search },
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setRestaurants(data.restaurants ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [usualItems, setUsualItems] = useState<any[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const { fetchCart } = useAppData();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("recently_viewed");
      if (raw) {
        setRecentlyViewed(JSON.parse(raw));
      }
    } catch (e) {
      console.error(e);
    }
  }, [restaurants]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data } = await axios.get(`${restaurantService}/api/order/myorder`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (data && data.orders && data.orders.length > 0) {
          // Devise the top 2 most ordered items by the customer
          const itemFreq: Record<string, { count: number; item: any; restaurantId: string; restaurantName: string }> = {};
          data.orders.forEach((o: any) => {
            if (!o.items) return;
            o.items.forEach((it: any) => {
              if (!it.itemId) return;
              const id = it.itemId.toString();
              if (!itemFreq[id]) {
                itemFreq[id] = { count: 0, item: it, restaurantId: o.restaurantId, restaurantName: o.restaurantName };
              }
              itemFreq[id].count += it.quantity || 1;
            });
          });

          const topItems = Object.values(itemFreq).sort((a, b) => b.count - a.count).slice(0, 2);
          if (topItems.length > 0) {
            setUsualItems(topItems);
          }
        }
      } catch (err) {
        console.error("Failed to fetch past orders", err);
      }
    };
    if (user && user.role === "customer") {
      fetchOrders();
    }
  }, [user]);

  const handleReorderItem = async (topItem: any) => {
    if (!topItem || !topItem.restaurantId || !topItem.item) return;

    const restaurantId = typeof topItem.restaurantId === "object" && topItem.restaurantId !== null
      ? (topItem.restaurantId._id ?? topItem.restaurantId).toString()
      : topItem.restaurantId?.toString();

    const itemName: string = topItem.item.name ?? "";

    if (!restaurantId || !itemName) {
      toast.error("Couldn't reorder — item details missing");
      return;
    }

    const loadToast = toast.loading(`Finding ${itemName} on current menu…`);
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    // ── Step 1: Fetch the CURRENT menu for this restaurant ──────────────────
    // The item may have been deleted and re-added, so the old itemId is stale.
    // We resolve by name match against the live menu instead.
    let resolvedItemId: string | null = null;
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/item/all/${restaurantId}`,
        { headers }
      );
      const menuItems: any[] = data.items ?? data ?? [];
      const nameLower = itemName.trim().toLowerCase();

      // Exact match first, then partial match as fallback
      let matched = menuItems.find(
        (m: any) => m.name?.trim().toLowerCase() === nameLower
      );
      if (!matched) {
        matched = menuItems.find(
          (m: any) => m.name?.trim().toLowerCase().includes(nameLower) || nameLower.includes(m.name?.trim().toLowerCase())
        );
      }

      if (matched) {
        resolvedItemId = (matched._id ?? matched.id).toString();
      }
    } catch {
      // Menu fetch failed — fall back to the stored itemId
    }

    // Fallback: use the original itemId from the order (may or may not work)
    if (!resolvedItemId) {
      const rawItemId = topItem.item.itemId;
      resolvedItemId = typeof rawItemId === "object" && rawItemId !== null
        ? (rawItemId._id ?? rawItemId).toString()
        : rawItemId?.toString() ?? null;
    }

    if (!resolvedItemId) {
      toast.error(`"${itemName}" is no longer available on this restaurant's menu`, { id: loadToast });
      return;
    }

    // ── Step 2: Clear existing cart, then add the resolved item ─────────────
    try {
      await axios.delete(`${restaurantService}/api/cart/clear`, { headers });
    } catch {
      // Ignore — cart may already be empty
    }

    try {
      await axios.post(
        `${restaurantService}/api/cart/add`,
        { restaurantId, itemId: resolvedItemId },
        { headers }
      );
      await fetchCart();
      toast.success(`${itemName} added to cart! 🛒`, { id: loadToast });
      navigate("/cart");
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to add item to cart";
      toast.error(msg, { id: loadToast });
      console.error("[Reorder] failed:", { restaurantId, resolvedItemId, err });
    }
  };

  useEffect(() => { fetchRestaurants(); }, [location, search]);

  const filteredRestaurants = restaurants.filter((res) => {
    if (activeCategory) {
      const catLower = activeCategory.toLowerCase();
      const matchesName = res.name.toLowerCase().includes(catLower);
      const matchesDesc = (res.description || "").toLowerCase().includes(catLower);
      const matchesMenuItems = ((res as any).menuItems || []).some((item: any) => 
        item.name.toLowerCase().includes(catLower) ||
        (item.description || "").toLowerCase().includes(catLower) ||
        (item.category || "").toLowerCase().includes(catLower)
      );
      if (!matchesName && !matchesDesc && !matchesMenuItems) {
        return false;
      }
    }

    if (activeFilter === "open" && !res.isOpen) return false;
    if (activeFilter === "fast" && getMockDuration(res._id) > 28) return false;
    if (activeFilter === "top" && parseFloat(getRealRating(res)) < 4.5) return false;

    return true;
  });

  const filters = [
    { label: "All", value: null },
    { label: "Open now", value: "open" },
    { label: "Under 30 min", value: "fast" },
    { label: "Top rated ⭐", value: "top" },
  ];

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--bg-base)" }}>

      {/* ── Hero section ── */}
      <section className="relative w-full" style={{ minHeight: 400, background: "linear-gradient(135deg, #0B0F19 0%, #1a0a05 60%, #0B0F19 100%)" }}>
        {/* Background image (no parallax to avoid overflow:hidden clipping) */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop"
            alt="Hero background"
            className="w-full h-full object-cover opacity-40"
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, rgba(11,15,25,0.75) 0%, rgba(11,15,25,0.4) 55%, rgba(11,15,25,0.65) 100%)" }}
          />
          {/* Ambient Gradient Drift Blobs */}
          {!shouldReduceMotion && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
              <motion.div
                animate={{
                  x: ["-20%", "30%", "-20%"],
                  y: ["-10%", "20%", "-10%"],
                }}
                transition={{
                  duration: 25,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="absolute w-[400px] h-[400px] rounded-full opacity-[0.15]"
                style={{
                  background: "radial-gradient(circle, #FF5733 0%, transparent 70%)",
                  filter: "blur(60px)",
                  left: "10%",
                  top: "10%"
                }}
              />
              <motion.div
                animate={{
                  x: ["20%", "-20%", "20%"],
                  y: ["10%", "-10%", "10%"],
                }}
                transition={{
                  duration: 30,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="absolute w-[500px] h-[500px] rounded-full opacity-[0.12]"
                style={{
                  background: "radial-gradient(circle, #9b5de5 0%, transparent 70%)",
                  filter: "blur(70px)",
                  right: "10%",
                  bottom: "10%"
                }}
              />
            </div>
          )}
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-4 pt-12 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">

            {/* Left — headline + search + stat chips */}
            <div className="space-y-6">
              <div className="md:hidden flex justify-center mb-2">
                <PanToss />
              </div>
              <div className="space-y-3 animate-slide-up">
                <p className="eyebrow">🍳 Food Delivery Platform</p>
                <h1
                  className="font-black text-white leading-[0.95]"
                  style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.5rem, 6vw, 4.5rem)", letterSpacing: "-0.02em" }}
                >
                  {greetingTitle.split(",")[0]},
                  <br />
                  <span className="headline-gradient">{greetingTitle.split(",")[1]?.trim() ?? ""}</span>
                </h1>
                <p className="text-base" style={{ color: "rgba(255,255,255,0.65)", maxWidth: 420, fontFamily: "var(--font-body)" }}>
                  {greetingSubtitle} Discover the best restaurants near you, delivered fast.
                </p>
              </div>

              <div
                className="p-4 rounded-3xl animate-slide-up"
                style={{
                  position: "relative",
                  animationDelay: "0.1s",
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)",
                  backdropFilter: "blur(32px) saturate(200%)",
                  WebkitBackdropFilter: "blur(32px) saturate(200%)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "var(--radius-xl)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.35)",
                }}
              >
                <div aria-hidden="true" style={{
                  position: "absolute", top: 0, left: "12px", right: "12px", height: "1px",
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
                  borderRadius: "1px", pointerEvents: "none",
                }} />
                <div className="flex items-center gap-2 mb-3">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF5733" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span className="text-xs font-semibold truncate max-w-[200px]" style={{ color: "rgba(255,255,255,0.8)", fontFamily: "var(--font-body)" }}>
                    {location?.formattedAddress?.split(",")[0] ?? "Detecting location…"}
                  </span>
                  <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e", fontFamily: "var(--font-body)" }}>
                    ● Live
                  </span>
                </div>
                <AISearchBar
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Search for restaurants, cuisines or dishes…"
                />
                <div style={{
                  position: "absolute", bottom: "-40px", left: "50%", transform: "translateX(-50%)",
                  width: "60%", height: "80px",
                  background: "radial-gradient(ellipse, rgba(255,87,51,0.18) 0%, transparent 70%)",
                  filter: "blur(20px)",
                  pointerEvents: "none",
                  zIndex: -1,
                }} aria-hidden="true" />
              </div>

              {/* Stat chips */}
              <div className="flex gap-3 flex-wrap animate-slide-up" style={{ animationDelay: "0.2s" }}>
                <div
                  className="px-4 py-2 rounded-2xl animate-fade-in"
                  style={{
                    background:
                      "linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)",
                    backdropFilter: "blur(20px) saturate(180%)",
                    WebkitBackdropFilter: "blur(20px) saturate(180%)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "var(--radius-lg)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.25)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <motion.div whileHover={{ y: -2, scale: 1.04 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                    <p className="eyebrow" style={{ marginBottom: 2 }}>ORDERS</p>
                    <p className="text-sm font-black" style={{ fontFamily: "var(--font-display)", color: "white" }}>
                      <CountUp end={4200} suffix="+" />
                    </p>
                  </motion.div>
                </div>
                <div
                  className="px-4 py-2 rounded-2xl animate-fade-in"
                  style={{
                    background:
                      "linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)",
                    backdropFilter: "blur(20px) saturate(180%)",
                    WebkitBackdropFilter: "blur(20px) saturate(180%)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "var(--radius-lg)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.25)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <motion.div whileHover={{ y: -2, scale: 1.04 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                    <p className="eyebrow" style={{ marginBottom: 2 }}>AVG DELIVERY</p>
                    <p className="text-sm font-black" style={{ fontFamily: "var(--font-display)", color: "white" }}>
                      <CountUp end={22} suffix=" min" />
                    </p>
                  </motion.div>
                </div>
                <div
                  className="px-4 py-2 rounded-2xl animate-fade-in"
                  style={{
                    background:
                      "linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)",
                    backdropFilter: "blur(20px) saturate(180%)",
                    WebkitBackdropFilter: "blur(20px) saturate(180%)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "var(--radius-lg)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.25)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <motion.div whileHover={{ y: -2, scale: 1.04 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                    <p className="eyebrow" style={{ marginBottom: 2 }}>TOP RATED</p>
                    <p className="text-sm font-black" style={{ fontFamily: "var(--font-display)", color: "white" }}>
                      <CountUp end={4.9} decimals={1} suffix=" ★" />
                    </p>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Right — floating restaurant card */}
            <div className="hidden md:flex items-center justify-center">
              {restaurants.length > 0 ? (
                (() => {
                  const topRated = [...restaurants].sort((a, b) => {
                    const ratingA = a.ratingCount ? ((a.overallRating ?? 0) / a.ratingCount) : 0;
                    const ratingB = b.ratingCount ? ((b.overallRating ?? 0) / b.ratingCount) : 0;
                    return ratingB - ratingA;
                  })[0];
                  
                  return (
                    <div className="flex flex-col items-center gap-4">
                      <PanToss />
                      <div
                        className="animate-float glass-card overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-350"
                        style={{ width: 280, transform: "rotate(-2deg)", boxShadow: "0 20px 60px rgba(255,87,51,0.3), 0 8px 24px rgba(0,0,0,0.5)" }}
                        onClick={() => {
                          saveRecentlyViewed(topRated);
                          navigate(`/restaurant/${topRated._id}`);
                        }}
                      >
                        <BlurUpImage
                          src={topRated.image || "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=560&q=80"}
                          alt={topRated.name}
                          className="w-full object-cover"
                          style={{ height: 160 }}
                        />
                        <div className="p-4">
                          <p className="eyebrow" style={{ marginBottom: 4 }}>TOP CHOICE</p>
                          <h3 className="font-black text-base truncate" style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}>{topRated.name}</h3>
                          <p className="text-xs mt-1 truncate" style={{ color: "var(--color-manifest)" }}>{topRated.description || "Fresh & fast delivery"}</p>
                          <div className="flex items-center gap-2 mt-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              topRated.isOpen ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500"
                            }`}>
                              {topRated.isOpen ? "Open" : "Closed"}
                            </span>
                            <span className="text-[10px] font-bold" style={{ color: "#FF5733", fontFamily: "var(--font-display)" }}>
                              {getRealRating(topRated)} ★
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <PanToss />
                  <div
                    className="animate-float glass-card p-6 flex flex-col items-center justify-center space-y-2 text-center"
                    style={{ width: 280, height: 260, transform: "rotate(-2deg)", boxShadow: "0 20px 60px rgba(255,87,51,0.1), 0 8px 24px rgba(0,0,0,0.2)" }}
                  >
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-orange-500 animate-spin flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full border border-orange-200" />
                    </div>
                    <p className="text-xs font-semibold" style={{ color: "var(--color-ghost)" }}>Loading premium choice…</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick nav tabs ── */}
      <section style={{ backgroundColor: "var(--bg-surface)", borderBottom: "1px solid var(--color-rule)" }}>
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex overflow-x-auto no-scrollbar">
            {[
              { label: "Delivery",  icon: <BiCycling className="text-base" />,                  path: "/",         active: true },
              { label: "Dine-out",  icon: <BiStore className="text-base" />,                    path: "/dineout",   active: false },
              { label: "Instamart", icon: <BiSolidBolt className="text-base text-amber-500" />, path: "/instamart", active: false },
              { label: "Genie",     icon: <BiGift className="text-base" />,                     path: "/genie",     active: false },
            ].map((tab) => (
              <button
                key={tab.label}
                onClick={() => navigate(tab.path)}
                className="flex items-center gap-1.5 px-5 py-3.5 text-sm font-semibold relative transition-colors flex-shrink-0"
                style={{
                  color: tab.active ? "#FF5733" : "var(--color-manifest)",
                  fontFamily: "var(--font-body)",
                }}
                onMouseEnter={(e) => {
                  if (!tab.active) e.currentTarget.style.color = "var(--color-route)";
                }}
                onMouseLeave={(e) => {
                  if (!tab.active) e.currentTarget.style.color = "var(--color-manifest)";
                }}
              >
                {tab.icon}
                {tab.label}
                {tab.active && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-t"
                    style={{ background: "linear-gradient(90deg, #FF5733, #c0392b)" }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Promo banners ── */}
      <section className="py-5" style={{ backgroundColor: "var(--bg-surface)", borderBottom: "1px solid var(--color-rule)" }}>
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {PROMO_BANNERS.map((banner) => (
              <PromoBanner key={banner.id} banner={banner} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Dynamic Interactivity & Loyalty ── */}
      <section className="py-6 border-b reveal" style={{ backgroundColor: "var(--bg-base)", borderColor: "var(--color-rule)" }}>
        <div className="mx-auto max-w-5xl px-4 space-y-6">
          
          {/* Weather Contextual Banner — only shown when real weather conditions warrant it */}
          {!weatherDismissed && weatherCondition?.show && (
            <div
              className="p-5 rounded-3xl relative overflow-hidden shadow-md flex items-center justify-between gap-4 border text-white animate-fade-in"
              style={{
                backgroundImage: `linear-gradient(135deg, rgba(9, 13, 22, 0.95) 0%, rgba(15, 23, 42, 0.8) 100%), url('https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=600&q=80')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                borderColor: "rgba(255, 255, 255, 0.15)"
              }}
            >
              <div className="space-y-1 relative z-10 flex-1">
                <span className="text-[10px] font-body tracking-wider uppercase font-bold text-amber-400">Weather Suggestion</span>
                <h3 className="text-sm font-bold font-display text-white flex items-center gap-1.5">
                  {weatherCondition.label} in {city || "your city"} <BiCloudRain className="text-lg animate-pulse" /> {weatherCondition.suggestion}
                </h3>
                <p className="text-[11px] text-slate-300">Grab piping hot meals from our curated selection.</p>
              </div>
              <div className="flex items-center gap-3 relative z-10">
                <button
                  onClick={() => {
                    setActiveCategory(weatherCondition.category);
                    const el = document.getElementById("restaurant-grid-anchor");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                    toast.success(`Filtered by ${weatherCondition.category}`);
                  }}
                  className="px-4 h-9 rounded-xl text-xs font-bold bg-white text-slate-900 shadow-md hover:scale-[1.02] active:scale-95 transition cursor-pointer"
                >
                  Show {weatherCondition.category.charAt(0).toUpperCase() + weatherCondition.category.slice(1)}
                </button>
                <button
                  onClick={() => { setWeatherDismissed(true); sessionStorage.setItem("weather_dismissed", "1"); }}
                  className="w-8 h-8 rounded-full flex items-center justify-center border border-white/30 text-white/70 hover:text-white cursor-pointer active:scale-95 transition"
                  aria-label="Dismiss weather alert"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Reorder Your Usual Strip */}
            <div className="p-5 rounded-3xl glass-card border flex flex-col justify-between space-y-4" style={{ borderColor: "var(--color-rule)" }}>
              {usualItems.length > 0 ? (
                <div>
                  <h3 className="text-xs font-body tracking-wider uppercase font-bold text-slate-400 mb-3">Reorder Your Usual</h3>
                  <div className="flex flex-col gap-2">
                    {usualItems.map((topItem, idx) => (
                      <div
                        key={idx}
                        className="w-full p-3 rounded-2xl flex items-center justify-between gap-3 border"
                        style={{ borderColor: "var(--color-rule)", backgroundColor: "rgba(255, 255, 255, 0.02)" }}
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold font-display text-slate-800 dark:text-slate-200">{topItem.item.name}</h4>
                          <p className="text-[10px] truncate text-slate-500">
                            {topItem.restaurantName} · Ordered {topItem.count} {topItem.count === 1 ? "time" : "times"}
                          </p>
                          <p className="text-[10px] font-mono font-bold text-orange-500 mt-0.5">₹{topItem.item.price}</p>
                        </div>
                        <button
                          onClick={() => handleReorderItem(topItem)}
                          className="px-3.5 py-2 text-white rounded-xl text-[10px] font-bold shadow active:scale-95 transition cursor-pointer"
                          style={{ backgroundColor: "var(--color-route)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.1)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.filter = ""; }}
                        >
                          Reorder
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-xs font-body tracking-wider uppercase font-bold text-slate-400 mb-2">Popular Choice Near You</h3>
                  {restaurants.length > 0 ? (
                    <div
                      className="p-3.5 rounded-2xl flex items-center justify-between gap-3 border cursor-pointer hover:border-orange-500 transition-colors"
                      style={{ borderColor: "var(--color-rule)", backgroundColor: "rgba(255, 255, 255, 0.02)" }}
                      onClick={() => navigate(`/restaurant/${restaurants[0]._id}`)}
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold font-display text-slate-800 dark:text-slate-200">{restaurants[0].name}</h4>
                        <p className="text-[10px] truncate text-slate-500">{restaurants[0].description || "Highest rated near you · Fresh culinary delights"}</p>
                        <p className="text-[10px] font-bold text-orange-500 mt-0.5">⭐ {getRealRating(restaurants[0])} Rating</p>
                      </div>
                      <button
                        onClick={() => navigate(`/restaurant/${restaurants[0]._id}`)}
                        className="px-3.5 py-2 border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white rounded-xl text-[10px] font-bold shadow-sm active:scale-95 transition cursor-pointer"
                      >
                        Explore Menu
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 py-2">Add items to get started!</p>
                  )}
                </div>
              )}
            </div>

            {/* Loyalty Points Banner */}
            <div className="p-5 rounded-3xl glass-card border flex flex-col justify-between" style={{ borderColor: "var(--color-rule)" }}>
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-xs font-body tracking-wider uppercase font-bold text-slate-400">Loyalty Rewards</h3>
                    <p className="text-sm font-bold font-display text-slate-800 dark:text-slate-200 mt-1">
                      You have {user?.rewardPoints || 0} points · {(user?.rewardPoints || 0) >= 500 ? "Diamond" : (user?.rewardPoints || 0) >= 200 ? "Gold" : "Silver"} Tier
                    </p>
                  </div>
                  <span className="text-[10px] font-body font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">Active</span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden mt-3 mb-1">
                  <div className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, ((user?.rewardPoints || 0) / ((user?.rewardPoints || 0) < 200 ? 200 : 500)) * 100)}%` }} />
                </div>
                <div className="flex justify-between text-[9px] font-body font-bold text-slate-500">
                  <span>{user?.rewardPoints || 0} pts</span>
                  <span>{Math.max(0, ((user?.rewardPoints || 0) < 200 ? 200 : 500) - (user?.rewardPoints || 0))} pts to flat {(user?.rewardPoints || 0) < 200 ? "₹55" : "₹200"} OFF</span>
                </div>
              </div>
              <button
                onClick={() => toast.success(`Get ${(user?.rewardPoints || 0) < 200 ? "₹55" : "₹200"} OFF automatically on checkout when you reach ${(user?.rewardPoints || 0) < 200 ? 200 : 500} points!`)}
                className="mt-3 w-full h-8 text-[10px] font-bold border rounded-xl flex items-center justify-center transition active:scale-[0.98] cursor-pointer"
                style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)", backgroundColor: "transparent" }}
              >
                Reward Details
              </button>
            </div>
          </div>

          {/* ── AI Dietary & Health Profile ── */}
          <div 
            className="p-5 mt-5 space-y-4 glass-card transition-all duration-300 reveal"
            style={{
              border: "1px solid rgba(255, 87, 51, 0.25)",
              boxShadow: "0 8px 32px 0 rgba(255, 87, 51, 0.05), inset 0 0 12px 0 rgba(255, 87, 51, 0.03)",
              background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,87,51,0.02) 100%)",
              borderRadius: "var(--radius-xl)"
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg select-none"
                  style={{ 
                    background: "linear-gradient(135deg, rgba(255,87,51,0.2) 0%, rgba(255,130,77,0.08) 100%)",
                    border: "1px solid rgba(255,87,51,0.2)"
                  }}
                >
                  🍳
                </div>
                <div>
                  <h2 className="text-xs font-bold font-display tracking-wide uppercase" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>
                    AI Dietary & Health Profile
                  </h2>
                  <p className="text-[9px]" style={{ color: "var(--color-manifest)" }}>
                    Dynamic RAG engine filters menus and intercepts allergens.
                  </p>
                </div>
              </div>
              {/* Pulsing Active Indicator */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest font-mono">Active</span>
              </div>
            </div>

            {/* Dietary Preferences */}
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-wider font-mono block" style={{ color: "var(--color-ghost)" }}>
                Dietary Preferences
              </label>
              <div className="flex flex-wrap gap-1.5">
                {["Vegetarian", "Vegan", "Keto", "Gluten-Free", "Low-Carb", "Halal"].map((pref) => {
                  const active = dietaryPrefs.includes(pref);
                  return (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => {
                        const next = active
                          ? dietaryPrefs.filter((p) => p !== pref)
                          : [...dietaryPrefs, pref];
                        setDietaryPrefs(next);
                        savePreferences(next, undefined, undefined);
                      }}
                      className="px-2.5 py-1 rounded-full text-[9px] font-bold transition-all duration-200 border cursor-pointer animate-fade-in"
                      style={{
                        backgroundColor: active ? "rgba(255,87,51,0.18)" : "rgba(255,255,255,0.02)",
                        borderColor: active ? "#FF5733" : "rgba(255,255,255,0.06)",
                        color: active ? "#FF824D" : "var(--color-manifest)",
                        boxShadow: active ? "0 2px 10px rgba(255,87,51,0.15)" : "none"
                      }}
                    >
                      {active ? "✓ " : ""}{pref}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Allergies */}
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-wider font-mono block" style={{ color: "var(--color-ghost)" }}>
                Allergen Profile
              </label>
              <div className="flex flex-wrap gap-1.5">
                {allergyList.length === 0 ? (
                  <span className="text-[10px] italic font-body" style={{ color: "var(--color-ghost)" }}>
                    No allergen locks active. Type below to add.
                  </span>
                ) : (
                  allergyList.map((allergy) => (
                    <span
                      key={allergy}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-bold border"
                      style={{ 
                        backgroundColor: "rgba(239,68,68,0.08)", 
                        borderColor: "rgba(239,68,68,0.25)",
                        color: "var(--color-alert)",
                        boxShadow: "0 2px 8px rgba(239,68,68,0.05)"
                      }}
                    >
                      🚫 {allergy}
                      <button
                        type="button"
                        onClick={() => {
                          const next = allergyList.filter((a) => a !== allergy);
                          setAllergyList(next);
                          savePreferences(undefined, next, undefined);
                        }}
                        className="hover:text-white transition-colors duration-150 focus:outline-none text-[12px] font-bold leading-none cursor-pointer"
                      >
                        &times;
                      </button>
                    </span>
                  ))
                )}
              </div>
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  placeholder="Lock new allergen (e.g. Peanut)"
                  className="flex-1 min-w-0 h-8 px-3 rounded-lg text-xs outline-none transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--color-ink)",
                    fontFamily: "var(--font-body)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,87,51,0.4)";
                    e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)";
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newAllergy.trim() && !allergyList.includes(newAllergy.trim())) {
                        const next = [...allergyList, newAllergy.trim()];
                        setAllergyList(next);
                        setNewAllergy("");
                        savePreferences(undefined, next, undefined);
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newAllergy.trim() && !allergyList.includes(newAllergy.trim())) {
                      const next = [...allergyList, newAllergy.trim()];
                      setAllergyList(next);
                      setNewAllergy("");
                      savePreferences(undefined, next, undefined);
                    }
                  }}
                  className="px-3 h-8 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer"
                  style={{ 
                    background: "linear-gradient(135deg, #FF5733 0%, #FF824D 100%)", 
                    color: "#fff", 
                    fontFamily: "var(--font-display)",
                    boxShadow: "0 4px 12px rgba(255,87,51,0.2)"
                  }}
                >
                  Lock
                </button>
              </div>
            </div>

            {/* Health Goals */}
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-wider font-mono block" style={{ color: "var(--color-ghost)" }}>
                Caloric Target & Health Goals
              </label>
              <textarea
                value={healthGoals}
                onChange={(e) => setHealthGoals(e.target.value)}
                placeholder="e.g. 1800 kcal daily target, High protein, Low sodium"
                rows={2}
                className="w-full px-3 py-2 rounded-xl text-xs outline-none resize-none transition-all duration-200 font-mono"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#FF824D",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,87,51,0.4)";
                  e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)";
                  savePreferences(undefined, undefined, healthGoals);
                }}
              />
            </div>
          </div>

        </div>
      </section>

      {/* ── Recently viewed strip ── */}
      {recentlyViewed.length > 0 && (
        <section className="py-5 border-b reveal" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--color-rule)" }}>
          <div className="mx-auto max-w-5xl px-4">
            <div className="flex flex-col gap-2 pb-2 mb-4 border-b border-white/5">
              <div className="flex items-baseline gap-2 border-l-[3px] border-orange-500 pl-3">
                <h2 className="text-h3 font-bold font-display leading-none" style={{ color: "var(--color-ink)" }}>Recently Viewed</h2>
                <span className="text-sm opacity-50 font-medium">({recentlyViewed.length})</span>
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {recentlyViewed.map((item) => (
                <div
                  key={item._id}
                  onClick={() => navigate(`/restaurant/${item._id}`)}
                  className="flex-shrink-0 w-44 rounded-2xl overflow-hidden border glass-card shadow-sm cursor-pointer hover:translate-y-[-2px] transition-all"
                  style={{ borderColor: "var(--color-rule)" }}
                >
                  <div className="h-24 relative overflow-hidden bg-slate-100">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold text-white bg-slate-900/80 backdrop-blur-md flex items-center gap-0.5">
                      {getRealRating(item)} <BiStar className="text-[10px] fill-amber-400" />
                    </span>
                  </div>
                  <div className="p-3">
                    <h4 className="text-xs font-bold truncate text-slate-800 dark:text-slate-200">{item.name}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">{item.description || "Fresh food delivered"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Category scroll ── */}
      <section className="py-5 reveal" style={{ backgroundColor: "var(--bg-surface)", borderBottom: "1px solid var(--color-rule)" }}>
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex flex-col gap-2 pb-2 mb-4 border-b border-white/5">
            <div className="flex items-baseline gap-2 border-l-[3px] border-orange-500 pl-3">
              <h2 className="text-h3 font-bold font-display leading-none" style={{ color: "var(--color-ink)" }}>What's on your mind?</h2>
              <span className="text-sm opacity-50 font-medium">({FOOD_CATEGORIES.length} options)</span>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {FOOD_CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat.filter}
                image={cat.image}
                label={cat.label}
                active={activeCategory === cat.filter}
                onClick={() => setActiveCategory(activeCategory === cat.filter ? null : cat.filter)}
              />
            ))}
          </div>
        </div>
      </section>

      <div id="restaurant-grid-anchor" className="mx-auto max-w-5xl px-4 py-6 space-y-5">

        {/* ── Live indicator + filters ── */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LiveIndicator label="Live" />
            {!loading && (
              <span className="text-xs font-mono" style={{ color: "var(--color-ghost)" }}>
                {filteredRestaurants.length} {filteredRestaurants.length === 1 ? "restaurant" : "restaurants"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {filters.map((f) => (
              <FilterPill
                key={f.label}
                label={f.label}
                active={activeFilter === f.value}
                onClick={() => setActiveFilter(activeFilter === f.value ? null : f.value)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 pb-2 mb-4 border-b border-white/5">
          <div className="flex items-baseline gap-2 border-l-[3px] border-orange-500 pl-3">
            <h2 className="text-h3 font-bold font-display leading-none" style={{ color: "var(--color-ink)" }}>
              {search ? `Results for "${search}"` : "All Restaurants"}
            </h2>
            {!loading && (
              <span className="text-sm opacity-50 font-medium">
                ({filteredRestaurants.length} {filteredRestaurants.length === 1 ? "restaurant" : "restaurants"})
              </span>
            )}
          </div>
        </div>

        {/* ── Grid ── */}
        <AnimatePresence mode="wait">
          {loading || !location ? (
            <motion.div
              key="skeletons"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {Array.from({ length: 6 }).map((_, i) => <RestaurantSkeleton key={i} />)}
            </motion.div>
          ) : filteredRestaurants.length > 0 ? (
            <motion.div
              key="cards"
              variants={containerVariants}
              initial={shouldReduceMotion ? "visible" : "hidden"}
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredRestaurants.map((res) => {
                const [lng, lat] = res.autoLocation?.coordinates || [77.2090, 28.6139];
                const dist = getDistanceKm(location?.latitude || 28.6139, location?.longitude || 77.2090, lat, lng);
                return (
                  <motion.div key={res._id} variants={itemVariants}>
                    <RestaurantCard restaurant={res} distance={dist} />
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="text-center py-20"
            >
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: "var(--color-muted)" }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-route)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <p className="text-base font-bold" style={{ color: "var(--color-ink)" }}>
                {search ? `No results for "${search}"` : "No restaurants available right now"}
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--color-manifest)" }}>
                {search ? "Try a different dish or restaurant name" : "Check back in a few minutes"}
              </p>
              {search && (
                <button
                  onClick={() => setSearchParams({})}
                  className="mt-5 px-6 h-11 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[0.97]"
                  style={{ backgroundColor: "var(--color-route)", color: "white" }}
                >
                  Clear search
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Active order floating tile */}
      {activeOrder && (
        <ActiveOrderTile
          order={activeOrder}
          expanded={orderTileOpen}
          onToggle={() => setOrderTileOpen((prev) => !prev)}
          onNavigate={() => navigate(`/order/${activeOrder._id}`)}
        />
      )}
    </main>
  );
};

export default Home;
