import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChatDrawer } from './ChatDrawer';
import { BiPhone, BiMessageRounded, BiMap, BiRestaurant, BiUser, BiReceipt } from 'react-icons/bi';

interface ActiveDeliveryPanelProps {
  order: any;
  onStatusUpdate: (status: string) => void;
  socket: any;
}

const ActiveDeliveryPanel: React.FC<ActiveDeliveryPanelProps> = ({ order, onStatusUpdate }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const [hasReached, setHasReached] = useState(false);

  // Reset local destination reached state when switching orders
  React.useEffect(() => {
    setHasReached(false);
  }, [order?._id]);

  // distance is already in km
  const distance = (order.distance || 3).toFixed(1);
  const travelTime = Math.ceil(((order.distance || 3) / 20) * 60);
  const eta = order.status === 'rider_assigned' ? travelTime + 5 : travelTime;

  const getNextStatus = () => {
    switch (order.status) {
      case 'rider_assigned':
        return 'picked_up';
      case 'picked_up':
        return 'delivered';
      default:
        return 'delivered';
    }
  };

  const getActionText = () => {
    switch (order.status) {
      case 'rider_assigned':
        return 'Confirm Pickup';
      case 'picked_up':
        return hasReached ? 'Mark as Delivered' : 'Reached Destination';
      default:
        return 'Delivered!';
    }
  };

  const handleButtonClick = () => {
    if (order.status === 'picked_up' && !hasReached) {
      setHasReached(true);
    } else {
      onStatusUpdate(getNextStatus());
    }
  };

  return (
    <>
      <motion.div
        layout
        onClick={() => {
          if (isCollapsed) {
            setIsCollapsed(false);
          }
        }}
        className={`fixed z-40 transition-all duration-300 ${
          isCollapsed
            ? "bottom-6 left-1/2 -translate-x-1/2 w-[150px] h-[46px] flex items-center justify-center cursor-pointer border border-white/10"
            : "left-0 right-0 bottom-0 border-t rounded-t-[2.5rem]"
        }`}
        style={{
          borderRadius: isCollapsed ? "23px" : "2.5rem 2.5rem 0px 0px",
          height: isCollapsed ? "46px" : (expanded ? "72vh" : "268px"),
          width: isCollapsed ? "150px" : "100%",
          background: isCollapsed ? "linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(11,15,25,0.99) 100%)" : "rgba(10, 10, 11, 0.94)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderColor: "rgba(255,255,255,0.08)",
          boxShadow: isCollapsed
            ? "inset 0 1px 0 rgba(255,255,255,0.12), 0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)"
            : "inset 0 1px 0 rgba(255,255,255,0.06), 0 -12px 40px rgba(0,0,0,0.5)",
          // Align at bottom of screen when collapsed to avoid clashing with the header
          ...(isCollapsed ? {
            left: "50%",
            transform: "translateX(-50%)",
            bottom: "24px",
            top: "auto"
          } : {
            left: 0,
            right: 0,
            bottom: 0,
            top: "auto",
            transform: "none"
          })
        }}
        transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
      >
        {isCollapsed ? (
          <div className="flex items-center gap-2.5 text-white font-bold text-xs select-none uppercase tracking-wider animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-base leading-none">🛵</span>
            <span className="font-mono text-[11px] font-black">{eta} min</span>
          </div>
        ) : (
          <div className="h-full w-full relative flex flex-col pt-3 overflow-hidden">
            {/* Close button for collapsing */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(true);
              }}
              className="absolute top-3 right-4 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white cursor-pointer hover:bg-white/20 active:scale-90 transition-all z-50"
              aria-label="Collapse panel"
            >
              ✕
            </button>

            {/* Drag handle */}
            <div
              className="flex flex-col items-center pb-1 cursor-pointer select-none"
              onClick={() => setExpanded(!expanded)}
            >
              <div className="w-10 h-1 rounded-full bg-white/20 mb-1.5" />
              <span className="text-[10px] font-bold text-[var(--color-manifest)] flex items-center gap-1 uppercase tracking-wider font-mono">
                {expanded ? "Hide Details" : "Order Details & Address"}
                <span className="inline-block transition-transform duration-200" style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}>
                  ▾
                </span>
              </span>
            </div>

            {/* Always visible section */}
            <div className="px-5 pb-4">
              {/* ETA + distance row */}
              <div className="flex items-center justify-between mb-4 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-black text-[var(--color-route)] font-display">{eta} min</span>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-manifest)]">ETA</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-[var(--color-ink)] font-display">{distance} km</span>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-manifest)]">away</span>
                </div>
                <div className="glass-card glass-card-highlight px-3 py-1 rounded-full border border-green-500/10">
                  <span className="text-xs font-bold text-green-400 font-mono">+₹{order.riderAmount || 45}</span>
                </div>
              </div>

              {/* Quick actions row */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <a
                  href={`tel:${order.restaurantPhone}`}
                  className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-wider font-mono hover:bg-green-500/20 transition-all border border-green-500/20 active:scale-[0.98]"
                >
                  <BiRestaurant className="text-lg" />
                  Restaurant
                </a>
                <a
                  href={`tel:${order.deliveryAddress?.mobile}`}
                  className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider font-mono hover:bg-blue-500/20 transition-all border border-blue-500/20 active:scale-[0.98]"
                >
                  <BiUser className="text-lg" />
                  Customer
                </a>
                <button
                  onClick={() => setChatOpen(true)}
                  className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl glass-card glass-card-highlight text-[var(--color-ink)] text-[10px] font-bold uppercase tracking-wider font-mono hover:bg-white/5 transition-all border border-white/5 active:scale-[0.98] relative cursor-pointer"
                >
                  <BiMessageRounded className="text-lg text-[var(--color-route)]" />
                  Chat
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-4 w-4 h-4 rounded-full bg-[var(--color-route)] text-white text-[9px] flex items-center justify-center font-mono">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Primary action button */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleButtonClick}
                disabled={order.status === 'delivered'}
                className="w-full py-4 rounded-2xl text-white font-black text-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer uppercase tracking-widest font-display shadow-lg animate-fade-in"
                style={{
                  background: 'linear-gradient(135deg, var(--color-route) 0%, var(--color-thermal) 100%)',
                  boxShadow: '0 8px 32px rgba(255, 87, 51, 0.35)',
                }}
              >
                {getActionText()}
              </motion.button>
            </div>

            {/* Expanded section */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  className="overflow-y-auto px-5 pb-8"
                  style={{ height: 'calc(72vh - 200px)' }}
                >
                  {/* Contact Cards */}
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-[var(--color-manifest)] uppercase tracking-widest font-mono mb-3">
                      Contacts
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Restaurant card */}
                      <div className="glass-card glass-card-highlight rounded-2xl p-4 border" style={{ borderColor: 'var(--color-rule)' }}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 text-lg flex-shrink-0">
                            <BiRestaurant />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-mono text-[var(--color-manifest)] uppercase font-bold leading-none">Restaurant</p>
                            <p className="text-xs font-bold text-[var(--color-ink)] leading-tight truncate mt-1">
                              {order.restaurantName}
                            </p>
                          </div>
                        </div>
                        <a
                          href={`tel:${order.restaurantPhone}`}
                          className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-green-500/10 text-green-400 text-xs font-bold uppercase tracking-wider font-mono hover:bg-green-500/20 transition-colors border border-green-500/10 active:scale-[0.98]"
                        >
                          <BiPhone /> Call
                        </a>
                      </div>

                      {/* Customer card */}
                      <div className="glass-card glass-card-highlight rounded-2xl p-4 border" style={{ borderColor: 'var(--color-rule)' }}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 text-lg flex-shrink-0">
                            <BiUser />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-mono text-[var(--color-manifest)] uppercase font-bold leading-none">Customer</p>
                            <p className="text-xs font-bold text-[var(--color-ink)] leading-tight truncate mt-1">
                              {order.deliveryAddress?.mobile ? `+91 ${order.deliveryAddress.mobile}` : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <a
                          href={`tel:${order.deliveryAddress?.mobile}`}
                          className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-wider font-mono hover:bg-blue-500/20 transition-colors border border-blue-500/10 active:scale-[0.98]"
                        >
                          <BiPhone /> Call
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Delivery address */}
                  <div className="glass-card glass-card-highlight rounded-2xl p-4 mb-4 border" style={{ borderColor: 'var(--color-rule)' }}>
                    <div className="flex items-start gap-3">
                      <BiMap className="text-xl text-[var(--color-route)] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[9px] font-mono font-bold text-[var(--color-manifest)] uppercase tracking-wider mb-1">Delivery Address</p>
                        <p className="text-xs font-medium text-[var(--color-ink)] leading-relaxed">
                          {order.deliveryAddress?.formattedAddress}
                        </p>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${order.deliveryAddress?.latitude},${order.deliveryAddress?.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[var(--color-route)] mt-2 inline-block hover:underline font-bold"
                        >
                          Open in Maps →
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Order items */}
                  <div className="glass-card glass-card-highlight rounded-2xl p-4 mb-4 border" style={{ borderColor: 'var(--color-rule)' }}>
                    <p className="text-[10px] font-bold text-[var(--color-manifest)] uppercase tracking-widest font-mono mb-3 flex items-center gap-1.5">
                      <BiReceipt className="text-sm" /> Items ({order.items?.length || 0})
                    </p>
                    <div className="space-y-2.5 divide-y divide-white/5">
                      {order.items?.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between pt-2.5 first:pt-0">
                          <span className="text-xs text-[var(--color-ink)]">{item.name}</span>
                          <span className="text-xs text-[var(--color-manifest)] font-mono font-bold">
                            x{item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chat button */}
                  <button
                    onClick={() => setChatOpen(true)}
                    className="w-full glass-card glass-card-highlight rounded-2xl py-4 flex items-center justify-center gap-3 text-[var(--color-ink)] font-semibold hover:bg-white/10 border border-white/5 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <BiMessageRounded className="text-xl text-[var(--color-route)]" />
                    Chat Support
                    {unreadCount > 0 && (
                      <span className="ml-auto w-5 h-5 rounded-full bg-[var(--color-route)] text-white text-xs flex items-center justify-center font-mono">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Render ChatDrawer for rider chat */}
      {chatOpen && (
        <ChatDrawer
          orderId={order._id}
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      )}
    </>
  );
};

export default ActiveDeliveryPanel;
