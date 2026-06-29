import React from 'react';
import { motion } from 'framer-motion';
import { BiNavigation, BiStar, BiTrendingUp } from 'react-icons/bi';

interface IdlePanelProps {
  stats: {
    deliveries: number;
    rating: number;
    totalEarnings: number;
  };
  earnings: {
    today: number;
    week: number;
    total: number;
  };
  isAvailable: boolean;
  onToggleAvailability: () => void;
}

const IdlePanel: React.FC<IdlePanelProps> = ({ stats, earnings, isAvailable, onToggleAvailability }) => {
  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-40 rounded-t-[2.5rem] px-5 pt-6 pb-8 border-t glass-panel"
      style={{
        background: 'rgba(10, 10, 11, 0.94)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 -12px 40px rgba(0,0,0,0.5)',
      }}
    >
      {/* Driver Console Stats Card */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="col-span-2 p-4 rounded-2xl glass-card glass-card-highlight flex flex-col justify-between min-h-24 border-l-4"
          style={{ borderLeftColor: 'var(--color-route)' }}
        >
          <div>
            <span className="text-[9px] font-mono tracking-widest uppercase font-bold text-slate-400 flex items-center gap-1">
              <BiTrendingUp className="text-sm text-[var(--color-route)]" /> Today's Pay
            </span>
            <p className="text-3xl font-black font-display text-[var(--color-ink)] mt-1">₹{earnings.today}</p>
          </div>
          <p className="text-[10px] text-[var(--color-manifest)] font-mono">
            Lifetime: ₹{(stats.totalEarnings || earnings.total || 0).toLocaleString()}
          </p>
        </motion.div>

        <div className="flex flex-col gap-3">
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="p-3 rounded-2xl glass-card glass-card-highlight text-center flex-1 flex flex-col justify-center"
          >
            <p className="text-lg font-black text-[var(--color-ink)] leading-none">{stats.deliveries}</p>
            <p className="text-[9px] font-mono tracking-wider uppercase font-bold text-slate-400 mt-1">Deliveries</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="p-3 rounded-2xl glass-card glass-card-highlight text-center flex-1 flex flex-col justify-center"
          >
            <p className="text-lg font-black text-amber-500 leading-none flex items-center justify-center gap-0.5">
              {stats.rating.toFixed(1)} <BiStar className="text-sm fill-amber-500 text-amber-500" />
            </p>
            <p className="text-[9px] font-mono tracking-wider uppercase font-bold text-slate-400 mt-1">Rating</p>
          </motion.div>
        </div>
      </div>

      {/* Waiting state message */}
      <div className="flex items-center gap-4 glass-card glass-card-highlight rounded-2xl p-4 mb-4 border" style={{ borderColor: 'var(--color-rule)' }}>
        <div className="w-12 h-12 rounded-xl bg-[var(--color-route)]/10 flex items-center justify-center text-xl text-[var(--color-route)] flex-shrink-0">
          <BiNavigation className="text-2xl animate-pulse" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm text-[var(--color-ink)]">
            {isAvailable ? 'Searching for deliveries' : 'Offline'}
          </p>
          <p className="text-[11px] text-[var(--color-manifest)] leading-tight">
            {isAvailable ? 'Stay in hot zones to receive requests' : 'Go online to start receiving orders'}
          </p>
        </div>
      </div>

      {/* Prominent online/offline control */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onToggleAvailability}
        className="w-full h-14 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg font-mono cursor-pointer"
        style={
          isAvailable
            ? { backgroundColor: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }
            : { backgroundColor: 'var(--color-signal)', color: 'white', boxShadow: '0 8px 24px rgba(34,197,94,0.3)' }
        }
      >
        {isAvailable ? 'Go Offline' : 'Go Online'}
      </motion.button>
    </div>
  );
};

export default IdlePanel;
