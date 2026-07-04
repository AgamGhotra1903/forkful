// components/DashboardShell.tsx
// Shared responsive console shell used by the Admin console and the Seller
// (Restaurant) dashboard. Purely additive layout chrome:
//   • Desktop (md+): fixed left sidebar, collapsible to an icon rail via a
//     minimise button (state persisted per-console with useSidebarCollapse).
//   • Mobile (< md): sidebar collapses into a fixed glass bottom nav bar that
//     genuinely adapts to the item count instead of a static fixed-width strip:
//       - Up to 5 nav items: every item gets an equal-width (flex-1) tab that
//         fluidly resizes with the viewport, same pattern as the customer
//         MobileBottomNav, plus a small fixed Sign Out icon at the end.
//       - More than 5 nav items (e.g. Admin's 7): the first 4 stay as
//         equal-width tabs and a 5th "More" tab opens a bottom sheet with the
//         rest of the sections + Sign Out, so the bar itself never overflows
//         or requires horizontal scrolling on any phone width.
// No page's data-fetching, handlers, or section content are touched —
// this component only owns navigation chrome + collapse/scroll behaviour.

import { type ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BiChevronRight, BiChevronsLeft, BiChevronsRight, BiSun, BiMoon, BiLogOut, BiDotsHorizontalRounded, BiX } from "react-icons/bi";
import ForkfulLogo from "./ForkfulLogo";

// Above this many nav items, the mobile bar switches from "show everything"
// to "show 4 + More sheet" so it never has to shrink tabs into illegibility
// or fall back to silent horizontal scrolling.
const MAX_INLINE_MOBILE_TABS = 5;

export interface DashboardNavItem {
  key: string;
  label: string;
  icon: ReactNode;
}

interface DashboardShellProps {
  items: DashboardNavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
  /** Full profile card shown when the sidebar is expanded */
  profile: ReactNode;
  /** Small avatar-only node shown when the sidebar is collapsed to a rail (optional) */
  profileCompact?: ReactNode;
  /** Extra footer content (e.g. a status toggle) shown above theme/logout, expanded only */
  footerExtra?: ReactNode;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Active-tab text/icon color */
  accentColor?: string;
  /** Active-tab pill background */
  accentBg?: string;
  /** Unique framer-motion layoutId so multiple shells on one page tree never collide */
  layoutId: string;
  /** Small caps role tag shown under the wordmark on the collapsed rail tooltip, e.g. "Admin" */
  roleLabel?: string;
  children: ReactNode;
}

const DashboardShell = ({
  items,
  activeKey,
  onSelect,
  darkMode,
  onToggleDarkMode,
  onLogout,
  profile,
  profileCompact,
  footerExtra,
  collapsed,
  onToggleCollapsed,
  accentColor = "var(--color-route)",
  accentBg = "var(--color-route-light)",
  layoutId,
  children,
}: DashboardShellProps) => {
  const [moreOpen, setMoreOpen] = useState(false);

  const fitsInline = items.length <= MAX_INLINE_MOBILE_TABS;
  const primaryItems = fitsInline ? items : items.slice(0, 4);
  const overflowItems = fitsInline ? [] : items.slice(4);
  const overflowHasActiveItem = overflowItems.some((i) => i.key === activeKey);

  const handleSelect = (key: string) => {
    onSelect(key);
    setMoreOpen(false);
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--bg-base)" }}>
      {/* ── Desktop sidebar (collapsible rail) ───────────────────────────── */}
      <aside
        className={`hidden md:flex flex-col justify-between fixed top-0 bottom-0 left-0 z-40 glass-panel transition-[width] duration-300 ease-out ${
          collapsed ? "md:w-[84px] p-3" : "md:w-60 p-5"
        }`}
        style={{ borderRight: "1px solid var(--color-rule)" }}
      >
        <div className="space-y-6 min-w-0">
          {/* Logo row + collapse toggle */}
          <div className={`flex items-center select-none ${collapsed ? "flex-col gap-3" : "justify-between px-1"}`}>
            <div className={`flex items-center gap-2 min-w-0 ${collapsed ? "" : ""}`}>
              <ForkfulLogo size={collapsed ? 30 : 34} dark={darkMode} />
              {!collapsed && (
                <span
                  style={{
                    fontFamily: "var(--font-display, system-ui)",
                    fontWeight: 800,
                    letterSpacing: "-0.04em",
                    fontSize: "1.05rem",
                    lineHeight: 1,
                  }}
                >
                  <span style={{ color: darkMode ? "#F0EEE9" : "#111111" }}>Fork</span>
                  <span
                    style={{
                      color: darkMode ? "#FF6B45" : "#FF5733",
                      textShadow: darkMode ? "0 0 20px rgba(255, 107, 69, 0.4)" : "none",
                    }}
                  >
                    ful
                  </span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onToggleCollapsed}
              title={collapsed ? "Expand sidebar" : "Minimise sidebar"}
              aria-label={collapsed ? "Expand sidebar" : "Minimise sidebar"}
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border transition-colors cursor-pointer active:scale-[0.94]"
              style={{ borderColor: "var(--color-rule)", color: "var(--color-manifest)", backgroundColor: "rgba(255,255,255,0.02)" }}
            >
              {collapsed ? <BiChevronsRight className="text-sm" /> : <BiChevronsLeft className="text-sm" />}
            </button>
          </div>

          {/* Profile card / compact avatar */}
          {collapsed ? (profileCompact ?? null) : profile}

          {/* Navigation Links */}
          <nav className="space-y-1.5 relative" aria-label="Console navigation">
            {items.map((link) => {
              const isActive = activeKey === link.key;
              return (
                <button
                  key={link.key}
                  type="button"
                  title={collapsed ? link.label : undefined}
                  onClick={() => onSelect(link.key)}
                  className={`w-full relative flex items-center rounded-xl text-xs font-bold transition-colors active:scale-[0.98] cursor-pointer ${
                    collapsed ? "justify-center h-11" : "justify-between px-3 py-2.5"
                  }`}
                  style={{
                    color: isActive ? accentColor : "var(--color-manifest)",
                    fontFamily: "var(--font-body)",
                    background: "transparent",
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId={layoutId}
                      className="absolute inset-0 rounded-xl z-0 pointer-events-none"
                      style={{
                        background: accentBg,
                        borderLeft: collapsed ? "none" : `2px solid ${accentColor}`,
                      }}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <div className={`flex items-center relative z-10 ${collapsed ? "" : "gap-2"}`}>
                    <span className="text-base">{link.icon}</span>
                    {!collapsed && <span>{link.label}</span>}
                  </div>
                  {!collapsed && isActive && <BiChevronRight className="text-sm relative z-10" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="space-y-3 pt-4 border-t min-w-0" style={{ borderColor: "var(--color-rule)" }}>
          {!collapsed && footerExtra}

          <button
            type="button"
            onClick={onToggleDarkMode}
            title={darkMode ? "Light Mode" : "Dark Mode"}
            className="w-full h-10 border rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition duration-200 active:scale-[0.98] cursor-pointer"
            style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)", backgroundColor: "rgba(255,255,255,0.01)" }}
          >
            {darkMode ? (
              <>
                <BiSun className="text-base text-amber-500" />
                {!collapsed && <span>Light Mode</span>}
              </>
            ) : (
              <>
                <BiMoon className="text-base" style={{ color: "var(--color-route)" }} />
                {!collapsed && <span>Dark Mode</span>}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onLogout}
            title="Sign Out"
            className="w-full h-10 border rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition duration-200 active:scale-[0.98] cursor-pointer"
            style={{ borderColor: "rgba(239,68,68,0.4)", color: "#f87171", backgroundColor: "rgba(239,68,68,0.06)" }}
          >
            <BiLogOut className="text-base" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main
        className={`flex-1 pl-0 pr-4 sm:pr-5 pt-6 md:pt-8 pb-28 md:pb-8 min-h-screen transition-[padding] duration-300 ease-out ${
          collapsed ? "md:pl-[84px]" : "md:pl-60"
        }`}
      >
        <div className="max-w-5xl mx-auto space-y-6 pl-4 sm:pl-5 md:pl-5">{children}</div>
      </main>

      {/* ── Mobile bottom nav (replaces sidebar below md) ──────────────────
          Genuinely responsive: every visible tab is flex-1, so the bar
          always fills exactly the screen width with no overflow/scrolling,
          on a 320px phone or a 480px one alike. */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-[9980]"
        aria-label="Console navigation"
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          background: "var(--glass-bg)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          borderTop: "1px solid var(--color-rule)",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.25)",
        }}
      >
        <div className="flex items-stretch px-1">
          {primaryItems.map((item) => {
            const isActive = activeKey === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSelect(item.key)}
                className="relative flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 px-1"
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="text-[18px] flex" style={{ color: isActive ? accentColor : "var(--color-manifest)" }}>
                  {item.icon}
                </span>
                <span
                  className="text-[9px] font-semibold whitespace-nowrap truncate max-w-full max-[360px]:hidden"
                  style={{ color: isActive ? accentColor : "var(--color-manifest)" }}
                >
                  {item.label}
                </span>
                {isActive && (
                  <motion.span
                    layoutId={`${layoutId}-mobile`}
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full"
                    style={{ width: 22, backgroundColor: accentColor }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
              </button>
            );
          })}

          {/* "More" tab only appears once items overflow the inline limit */}
          {!fitsInline && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="relative flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 px-1"
              aria-label="More sections"
              aria-haspopup="true"
              aria-expanded={moreOpen}
            >
              <span className="text-[18px] flex" style={{ color: overflowHasActiveItem ? accentColor : "var(--color-manifest)" }}>
                <BiDotsHorizontalRounded />
              </span>
              <span
                className="text-[9px] font-semibold whitespace-nowrap truncate max-w-full max-[360px]:hidden"
                style={{ color: overflowHasActiveItem ? accentColor : "var(--color-manifest)" }}
              >
                More
              </span>
              {overflowHasActiveItem && (
                <motion.span
                  layoutId={`${layoutId}-mobile`}
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full"
                  style={{ width: 22, backgroundColor: accentColor }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
            </button>
          )}

          {/* Sign Out: fixed-width icon, not part of the flexible tab set —
              always reachable, never crowds the primary sections. */}
          <button
            type="button"
            onClick={onLogout}
            className="flex-shrink-0 w-11 flex flex-col items-center justify-center gap-0.5 py-2"
            aria-label="Sign Out"
          >
            <BiLogOut className="text-[18px]" style={{ color: "#f87171" }} />
            <span className="text-[9px] font-semibold whitespace-nowrap max-[360px]:hidden" style={{ color: "#f87171" }}>
              Out
            </span>
          </button>
        </div>
      </nav>

      {/* ── "More" bottom sheet — only rendered/reachable when items overflow ── */}
      <AnimatePresence>
        {moreOpen && !fitsInline && (
          <>
            <motion.div
              key="more-backdrop"
              className="md:hidden fixed inset-0 z-[9985]"
              style={{ background: "rgba(0,0,0,0.5)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              key="more-sheet"
              className="md:hidden fixed bottom-0 inset-x-0 z-[9990] rounded-t-2xl overflow-hidden"
              style={{
                background: "var(--bg-surface, #16161a)",
                borderTop: "1px solid var(--color-rule)",
                paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)",
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              role="dialog"
              aria-label="More sections"
            >
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-manifest)" }}>
                  More
                </span>
                <button type="button" onClick={() => setMoreOpen(false)} aria-label="Close" className="p-1 rounded-full">
                  <BiX className="text-lg" style={{ color: "var(--color-manifest)" }} />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 px-3 pt-1 pb-3">
                {overflowItems.map((item) => {
                  const isActive = activeKey === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleSelect(item.key)}
                      className="flex flex-col items-center justify-center gap-1 rounded-xl py-3"
                      style={{ background: isActive ? accentBg : "rgba(255,255,255,0.04)" }}
                    >
                      <span className="text-lg" style={{ color: isActive ? accentColor : "var(--color-ink)" }}>
                        {item.icon}
                      </span>
                      <span className="text-[10px] font-semibold text-center leading-tight" style={{ color: isActive ? accentColor : "var(--color-ink)" }}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardShell;
