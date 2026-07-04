// components/MobileBottomNav.tsx
// Persistent bottom tab bar for small screens — the pattern every major
// food-delivery app (Swiggy, Zomato, DoorDash, Uber Eats) ships with.
// Purely additive: new navigation chrome only, no existing routes/logic touched.

import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import {
  BiHomeAlt,
  BiSolidHome,
  BiSearch,
  BiReceipt,
  BiSolidReceipt,
  BiShoppingBag,
  BiSolidShoppingBag,
  BiUser,
  BiSolidUserCircle,
  BiSolidMagicWand,
} from "react-icons/bi";
import { motion } from "framer-motion";

const MobileBottomNav = () => {
  const { isAuth, quantity, user } = useAppData();
  const location = useLocation();
  const navigate = useNavigate();

  // Same visibility rules as the main Navbar — keep them in lockstep.
  if (
    location.pathname === "/login" ||
    location.pathname === "/select-role" ||
    (isAuth && !user?.role) ||
    !isAuth
  ) {
    return null;
  }

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const openSearch = () => {
    // Reuses the existing CommandPalette's own Ctrl/Cmd+K listener —
    // no changes to CommandPalette itself, just triggers its shortcut.
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
  };

  const tabs = [
    {
      key: "home",
      label: "Home",
      icon: BiHomeAlt,
      activeIcon: BiSolidHome,
      active: isActive("/") && location.pathname === "/",
      onClick: () => navigate("/"),
    },
    {
      key: "search",
      label: "Search",
      icon: BiSearch,
      activeIcon: BiSearch,
      active: false,
      onClick: openSearch,
    },
    {
      key: "ai",
      label: "AI Shop",
      icon: BiSolidMagicWand,
      activeIcon: BiSolidMagicWand,
      active: false,
      onClick: () => window.dispatchEvent(new CustomEvent("forkful:open-ai", { detail: { expanded: true } })),
    },
    {
      key: "orders",
      label: "Orders",
      icon: BiReceipt,
      activeIcon: BiSolidReceipt,
      active: isActive("/orders") || isActive("/order/"),
      onClick: () => navigate("/orders"),
    },
    {
      key: "cart",
      label: "Cart",
      icon: BiShoppingBag,
      activeIcon: BiSolidShoppingBag,
      active: isActive("/cart"),
      onClick: () => navigate("/cart"),
      badge: quantity > 0 ? quantity : undefined,
    },
    {
      key: "account",
      label: "Account",
      icon: BiUser,
      activeIcon: BiSolidUserCircle,
      active: isActive("/account"),
      onClick: () => navigate("/account"),
    },
  ];

  return (
    <>
      {/* Spacer so page content / footer never sits under the fixed bar */}
      <div
        className="md:hidden"
        style={{ height: "calc(64px + env(safe-area-inset-bottom, 0px))" }}
        aria-hidden="true"
      />

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-[9980]"
        aria-label="Primary"
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          background: "var(--glass-bg)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          borderTop: "1px solid var(--color-rule)",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.25)",
        }}
      >
        <div className="flex items-stretch justify-between px-1">
          {tabs.map((tab) => {
            const Icon = tab.active ? tab.activeIcon : tab.icon;
            return (
              <Link
                key={tab.key}
                to="#"
                onClick={(e) => {
                  e.preventDefault();
                  tab.onClick();
                }}
                className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2"
                aria-label={tab.label}
                aria-current={tab.active ? "page" : undefined}
              >
                <div className="relative">
                  <Icon
                    size={22}
                    style={{ color: tab.active ? "var(--color-route)" : "var(--color-manifest)" }}
                  />
                  {typeof tab.badge === "number" && (
                    <motion.span
                      key={tab.badge}
                      initial={{ scale: 1.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 420, damping: 16 }}
                      className="absolute -top-1.5 -right-2 flex items-center justify-center rounded-full text-[9px] font-bold text-white"
                      style={{
                        minWidth: 15,
                        height: 15,
                        padding: "0 3px",
                        background: "linear-gradient(135deg, #FF5733, #c0392b)",
                        boxShadow: "0 0 0 2px var(--bg-surface)",
                      }}
                    >
                      {tab.badge}
                    </motion.span>
                  )}
                </div>
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: tab.active ? "var(--color-route)" : "var(--color-manifest)" }}
                >
                  {tab.label}
                </span>
                {tab.active && (
                  <motion.span
                    layoutId="bottomnav-indicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full"
                    style={{ width: 24, backgroundColor: "var(--color-route)" }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default MobileBottomNav;
