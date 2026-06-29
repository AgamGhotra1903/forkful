import { useState } from "react";
import axios from "axios";
import { adminService } from "../main";
import toast from "react-hot-toast";
import { BiPhone, BiMapPin, BiLoader } from "react-icons/bi";
import { motion, useReducedMotion } from "framer-motion";

interface AdminRestaurantCardProps {
  restaurant: any;
  onVerify: () => void;
}

const AdminRestaurantCard = ({ restaurant, onVerify }: AdminRestaurantCardProps) => {
  const [verifying, setVerifying] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await axios.patch(
        `${adminService}/api/v1/admin/restaurant/verify/${restaurant._id}`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success(`${restaurant.name} verified!`);
      onVerify();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
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
      whileHover="hover"
      variants={cardVariants}
      className="overflow-hidden glass-card relative"
    >
      {/* 1px glass lip top-border */}
      <div 
        className="absolute top-0 left-0 right-0 h-[1px] z-10 pointer-events-none"
        style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.12), transparent)" }}
      />
      {/* Cover image */}
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={
            restaurant.image ||
            "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=400&q=80"
          }
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <div
          className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider text-orange-600 bg-orange-50 border border-orange-100"
        >
          Pending
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <div>
          <p className="font-bold text-sm font-display" style={{ color: "var(--color-ink)" }}>
            {restaurant.name}
          </p>
          <p className="text-[11px] mt-1 line-clamp-2" style={{ color: "var(--color-manifest)" }}>
            {restaurant.description || "No description provided"}
          </p>
        </div>

        <div className="space-y-1 text-[11px] font-mono" style={{ color: "var(--color-manifest)" }}>
          <p className="flex items-center gap-1"><BiPhone className="text-xs flex-shrink-0" style={{ color: "var(--color-route)" }} /> {restaurant.phone || "—"}</p>
          {restaurant.autoLocation?.formattedAddress && (
            <p className="flex items-start gap-1 line-clamp-2 leading-relaxed">
              <BiMapPin className="text-xs flex-shrink-0 mt-0.5" style={{ color: "var(--color-route)" }} /> 
              <span>{restaurant.autoLocation?.formattedAddress}</span>
            </p>
          )}
        </div>

        <button
          onClick={handleVerify}
          disabled={verifying}
          className="w-full h-10 rounded-xl text-xs font-bold text-white transition-all active:scale-[0.97] disabled:opacity-50"
          style={{ backgroundColor: "var(--color-route)" }}
        >
          {verifying ? <BiLoader className="animate-spin mx-auto text-base" /> : "Approve Listing"}
        </button>
      </div>
    </motion.div>
  );
};

export default AdminRestaurantCard;
