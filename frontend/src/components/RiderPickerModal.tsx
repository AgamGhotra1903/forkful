import { useEffect, useState } from "react";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

interface NearbyRider {
  _id: string;
  name: string;
  phoneNumber: string;
  picture?: string;
}

interface RiderPickerModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
  onAssigned: () => void;
}

export const RiderPickerModal = ({ orderId, isOpen, onClose, onAssigned }: RiderPickerModalProps) => {
  const [riders, setRiders] = useState<NearbyRider[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isOpen || !orderId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    axios
      .get(`${restaurantService}/api/order/${orderId}/nearby-riders`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then(({ data }) => {
        if (!cancelled) setRiders(data.riders || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.message || "Failed to load nearby riders");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, orderId]);

  const handleAssign = async (riderId: string) => {
    setAssigningId(riderId);
    try {
      await axios.put(
        `${restaurantService}/api/order/manual-assign`,
        { orderId, riderId },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success("Rider assigned");
      onAssigned();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to assign rider");
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
          role="dialog"
          aria-label="Assign a rider manually"
          aria-modal="true"
        >
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 cursor-pointer"
            aria-hidden="true"
          />

          {/* Modal card */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={shouldReduceMotion ? { duration: 0.1 } : { type: "spring", stiffness: 300, damping: 28, delay: 0.05 }}
            className="relative w-full max-w-sm max-h-[80vh] flex flex-col shadow-2xl overflow-hidden glass-card z-10"
            style={{
              background: "rgba(10,10,11,0.85)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-rule)"
            }}
          >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 h-14 flex-shrink-0"
            style={{ borderBottom: "1px solid var(--color-rule)" }}
          >
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>
                Assign a Rider
              </p>
              <p className="text-[10px] font-mono" style={{ color: "var(--color-ghost)" }}>
                Order #{orderId.slice(-6).toUpperCase()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
              style={{ backgroundColor: "var(--color-muted)", color: "var(--color-ink)" }}
              aria-label="Close rider picker"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            {loading && (
              <p className="text-xs text-center py-8" style={{ color: "var(--color-ghost)" }}>
                Looking for available riders nearby…
              </p>
            )}

            {!loading && error && (
              <p className="text-xs text-center py-8" style={{ color: "var(--color-ghost)" }}>
                {error}
              </p>
            )}

            {!loading && !error && riders.length === 0 && (
              <p className="text-xs text-center py-8 leading-relaxed" style={{ color: "var(--color-ghost)" }}>
                No riders are currently online nearby.<br />Try again in a moment.
              </p>
            )}

            {!loading &&
              !error &&
              riders.map((rider) => (
                <div
                  key={rider._id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: "var(--color-receipt)", border: "1px solid var(--color-rule)" }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {rider.picture ? (
                      <img
                        src={rider.picture}
                        alt={rider.name}
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{ backgroundColor: "var(--color-muted)", color: "var(--color-route)" }}
                      >
                        {rider.name?.charAt(0).toUpperCase() || "R"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: "var(--color-ink)" }}>
                        {rider.name}
                      </p>
                      <p className="text-[10px] font-mono" style={{ color: "var(--color-ghost)" }}>
                        {rider.phoneNumber}
                      </p>
                    </div>
                  </div>
                  <button
                    disabled={assigningId === rider._id}
                    onClick={() => handleAssign(rider._id)}
                    className="h-8 px-3 rounded-lg text-xs font-bold text-white flex-shrink-0 transition-all active:scale-[0.97] disabled:opacity-50"
                    style={{ backgroundColor: "var(--color-signal)" }}
                  >
                    {assigningId === rider._id ? "Assigning…" : "Assign"}
                  </button>
                </div>
              ))}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
  );
};

export default RiderPickerModal;
