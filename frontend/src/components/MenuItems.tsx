import { useState } from "react";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import type { IMenuItem } from "../types";
import { BiTrash, BiPlus, BiSolidToggleLeft, BiSolidToggleRight, BiLoader } from "react-icons/bi";
import { motion, useReducedMotion } from "framer-motion";

interface MenuItemsProps {
  items: IMenuItem[];
  onItemDeleted: () => void;
  isSeller?: boolean;
  onAddTrigger?: () => void;
  onAddClick?: (item: IMenuItem) => void;
}

const MOCK_FOOD_IMAGES = [
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1484723091739-30a097e8f929?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=400&auto=format&fit=crop"
];

const getFoodImage = (id: string) => {
  const idx = id.charCodeAt(id.length - 1) % MOCK_FOOD_IMAGES.length;
  return MOCK_FOOD_IMAGES[idx];
};

const isVegItem = (name: string) => {
  const lower = name.toLowerCase();
  return !(lower.includes("chicken") || lower.includes("mutton") || lower.includes("egg") || lower.includes("fish") || lower.includes("beef") || lower.includes("non-veg") || lower.includes("pork") || lower.includes("kebab") || lower.includes("meat") || lower.includes("tandoori"));
};

const VegIndicator = ({ isVeg }: { isVeg: boolean }) => (
  <div className={`w-3.5 h-3.5 border flex items-center justify-center flex-shrink-0 rounded-[2px] ${isVeg ? "border-emerald-600" : "border-rose-600"}`} style={{ borderWidth: 1.5 }}>
    <div className={`w-3 h-3 rounded-full border ${isVeg ? "bg-emerald-600 border-emerald-600" : "bg-rose-600 border-rose-600"}`} style={{ borderWidth: 1 }} />
  </div>
);

const MenuItems = ({ items, onItemDeleted, isSeller, onAddTrigger, onAddClick }: MenuItemsProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.04,
      }
    }
  };

  const itemVariants: import("framer-motion").Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" as const }
    }
  };

  const cardHoverVariants: import("framer-motion").Variants = {
    hover: shouldReduceMotion ? {} : {
      y: -2,
      scale: 1.012,
      boxShadow: "0 0 0 1px rgba(255, 87, 51, 0.15), 0 20px 40px rgba(0, 0, 0, 0.25)",
      transition: { type: "spring" as const, stiffness: 300, damping: 20 }
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await axios.delete(`${restaurantService}/api/item/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      toast.success("Item deleted successfully");
      onItemDeleted();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete item");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleAvailability = async (id: string, currentAvailable: boolean) => {
    setTogglingId(id);
    try {
      // Attempt endpoint call
      await axios.put(
        `${restaurantService}/api/item/status/${id}`,
        { isAvailable: !currentAvailable },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success("Item availability updated");
      onItemDeleted();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update availability");
    } finally {
      setTogglingId(null);
    }
  };

  if (!isSeller) {
    // Renders custom menu for consumers (grid style)
    return (
      <motion.div
        variants={containerVariants}
        initial={shouldReduceMotion ? "visible" : "hidden"}
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4"
      >
        {items.filter(item => item.isAvailable !== false).map((item) => {
          const isVeg = isVegItem(item.name);
          const prepTime = (item.price % 15) + 12; // Dynamic but deterministic prep time
          return (
            <motion.div
              key={item._id}
              variants={itemVariants}
              whileHover={shouldReduceMotion ? {} : "hover"}
            >
              <motion.div
                variants={cardHoverVariants}
                className="flex gap-4 p-4 rounded-2xl glass-card relative overflow-hidden gradient-border"
              >
                {/* 1px glass lip top-border */}
                <div 
                  className="absolute top-0 left-0 right-0 h-[1px] z-10 pointer-events-none"
                  style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.12), transparent)" }}
                />
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 border border-black/5 dark:border-white/5">
                  <img
                    src={item.image || getFoodImage(item._id)}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  <span
                    className="absolute bottom-1 right-1 backdrop-blur-md text-[8px] text-white px-1.5 py-0.5 rounded font-mono font-bold"
                    style={{ backgroundColor: "rgba(15, 23, 42, 0.7)" }}
                  >
                    {prepTime}m prep
                  </span>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <VegIndicator isVeg={isVeg} />
                      <h4 className="text-xs font-bold font-display truncate text-slate-800 dark:text-slate-100" style={{ fontWeight: 700, letterSpacing: "-0.01em" }} title={item.name}>
                        {item.name}
                      </h4>
                    </div>
                    <p className="text-[11px] line-clamp-2 leading-relaxed text-slate-500 dark:text-slate-400">{item.description}</p>
                    {item.reason && (
                      <div className="mt-1.5">
                        <span className="inline-block text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--color-route-light)", color: "var(--color-route)", border: "1px solid rgba(255, 87, 51, 0.2)" }}>
                          💡 {item.reason}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: "var(--color-rule)" }}>
                    <p className="text-xs font-mono font-bold text-gradient-orange">₹{item.price}</p>
                    {onAddClick && (
                      <div className="glow-orange">
                        <button
                          onClick={() => onAddClick(item)}
                          className="px-3.5 h-7 rounded-xl text-[10px] font-bold text-white transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-md hover:brightness-105"
                          style={{ backgroundColor: "var(--color-route)" }}
                        >
                          <BiPlus size={12} /> Add
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial={shouldReduceMotion ? "visible" : "hidden"}
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-4"
    >
      {/* Position 1: Add new item card */}
      {onAddTrigger && (
        <motion.button
          variants={itemVariants}
          whileHover={{ y: -4 }}
          onClick={onAddTrigger}
          className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-3xl min-h-64 transition-all duration-200 hover:shadow-lg cursor-pointer bg-transparent"
          style={{ borderColor: "var(--color-route)", color: "var(--color-route)", backgroundColor: "var(--color-route-light)" }}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-dashed mb-3" style={{ borderColor: "var(--color-route)" }}>
            <BiPlus size={24} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Add New Item</span>
        </motion.button>
      )}

      {/* Menu item cards */}
      {items.map((item) => (
        <motion.div
          key={item._id}
          variants={itemVariants}
          whileHover={shouldReduceMotion ? {} : "hover"}
        >
          <motion.div
            variants={cardHoverVariants}
            className="flex flex-col justify-between overflow-hidden rounded-3xl glass-card glass-card-highlight min-h-64 border relative"
            style={{ borderColor: "var(--color-rule)" }}
          >
            {/* 1px glass lip top-border */}
            <div 
              className="absolute top-0 left-0 right-0 h-[1px] z-10 pointer-events-none"
              style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.12), transparent)" }}
            />
            <div>
              {/* 16:9 Image banner */}
              <div className="relative aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                  src={item.image || getFoodImage(item._id)}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  loading="lazy"
                />
                <span
                  className="absolute top-2 left-2 text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-md"
                  style={{
                    backgroundColor: item.category ? "var(--color-route-light)" : "var(--color-signal-light)",
                    color: item.category ? "var(--color-route)" : "var(--color-signal)",
                    border: `1px solid ${item.category ? "var(--color-route)" : "var(--color-signal)"}`
                  }}
                >
                  {item.category || "General"}
                </span>
              </div>

              {/* Info */}
              <div className="p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <VegIndicator isVeg={isVegItem(item.name)} />
                  <h4 className="text-sm font-bold font-display" style={{ color: "var(--color-ink)" }}>
                    {item.name}
                  </h4>
                </div>
                {item.description && (
                  <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: "var(--color-manifest)" }}>
                    {item.description}
                  </p>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 pt-0 flex items-center justify-between border-t" style={{ borderColor: "var(--color-rule)" }}>
              <span className="text-xs font-mono font-bold" style={{ color: "var(--color-ink)" }}>
                ₹{item.price}
              </span>

              <div className="flex items-center gap-3">
                {/* Availability Toggle */}
                <button
                  onClick={() => handleToggleAvailability(item._id, item.isAvailable)}
                  disabled={togglingId === item._id}
                  className="flex items-center text-xl transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-50"
                  style={{ color: item.isAvailable ? "var(--color-signal)" : "var(--color-ghost)" }}
                  title={item.isAvailable ? "Mark Unavailable" : "Mark Available"}
                >
                  {togglingId === item._id ? (
                    <BiLoader className="animate-spin text-base" />
                  ) : item.isAvailable ? (
                    <BiSolidToggleRight className="text-2xl" style={{ color: "var(--color-signal)" }} />
                  ) : (
                    <BiSolidToggleLeft className="text-2xl" />
                  )}
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => handleDelete(item._id)}
                  disabled={deletingId === item._id}
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition disabled:opacity-50 cursor-pointer"
                  title="Delete Item"
                >
                  {deletingId === item._id ? (
                    <BiLoader className="animate-spin text-xs" />
                  ) : (
                    <BiTrash size={15} />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default MenuItems;
