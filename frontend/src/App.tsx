import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import ForkfulLogo from "./components/ForkfulLogo";
import Home from "./pages/Home";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import DevLogin from "./pages/DevLogin";
import Landing from "./pages/Landing";
import ProtectedRoute from "./components/protectedRote";
import PublicRoute from "./components/publicRoute";
import SelectRole from "./pages/SelectRole";
import Navbar from "./components/navbar";
import Account from "./pages/Account";
import { useAppData } from "./context/AppContext";
import { useSocket } from "./context/SocketContext";
import Restaurant from "./pages/Restaurant";
import RestaurantPage from "./pages/RestaurantPage";
import Cart from "./pages/Cart";
import AddAddressPage from "./pages/Address";
import Checkout from "./pages/Checkout";
import PaymentSuccess from "./pages/PaymentSuccess";
import OrderSuccess from "./pages/OrderSuccess";
import Orders from "./pages/Orders";
import OrderPage from "./pages/OrderPage";
import RiderDashboard from "./pages/RiderDashboard";
import Admin from "./pages/Admin";
import Instamart from "./pages/Instamart";
import Dineout from "./pages/Dineout";
import Genie from "./pages/Genie";
import { CommandPalette } from "./components/CommandPalette";
import AIAssistant from "./components/AIAssistant";
import GlobalFooter from "./components/GlobalFooter";
import MobileBottomNav from "./components/MobileBottomNav";
import AadhaarBanner from "./components/AadhaarBanner";

// Pages that manage their own full layout — no shared Navbar / GlobalFooter
const STANDALONE_PATHS = ["/landing", "/login", "/admin/login", "/dev/login"];

const PageWrapper = ({ children }: { children: React.ReactNode }) => {
  const shouldReduceMotion = useReducedMotion();
  const variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 8 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: shouldReduceMotion ? 0 : -8 }
  };
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

// ── Role-aware app shell ─────────────────────────────────────────────────────
// Only renders for authenticated users navigating within the app.
// Role-specific dashboards (seller/rider/admin) are shown here.
// Regular customers get Navbar + AnimatedRoutes.
const AppShell = () => {
  const { user } = useAppData();
  const location = useLocation();
  const isAccountPage = location.pathname === "/account";

  if (user && user.role === "seller" && !isAccountPage) return <Restaurant />;
  if (user && user.role === "rider" && !isAccountPage) return <RiderDashboard />;
  if (user && user.role === "admin" && !isAccountPage) return <Admin />;

  return (
    <>
      <AadhaarBanner />
      <Navbar />
      <CustomerRoutes />
      <AIAssistant />
      <MobileBottomNav />
    </>
  );
};

// ── Customer page routes (all protected) ────────────────────────────────────
const CustomerRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
          <Route path="/paymentsuccess/:paymentId" element={<PageWrapper><PaymentSuccess /></PageWrapper>} />
          <Route path="/orders" element={<PageWrapper><Orders /></PageWrapper>} />
          <Route path="/order/:id" element={<PageWrapper><OrderPage /></PageWrapper>} />
          <Route path="/ordersuccess" element={<PageWrapper><OrderSuccess /></PageWrapper>} />
          <Route path="/address" element={<PageWrapper><AddAddressPage /></PageWrapper>} />
          <Route path="/checkout" element={<PageWrapper><Checkout /></PageWrapper>} />
          <Route path="/restaurant/:id" element={<PageWrapper><RestaurantPage /></PageWrapper>} />
          <Route path="/cart" element={<PageWrapper><Cart /></PageWrapper>} />
          <Route path="/select-role" element={<PageWrapper><SelectRole /></PageWrapper>} />
          <Route path="/account" element={<PageWrapper><Account /></PageWrapper>} />
          <Route path="/instamart" element={<PageWrapper><Instamart /></PageWrapper>} />
          <Route path="/dineout" element={<PageWrapper><Dineout /></PageWrapper>} />
          <Route path="/genie" element={<PageWrapper><Genie /></PageWrapper>} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
};

// ── Root router — handles ALL paths ─────────────────────────────────────────
// Standalone pages (Landing, Login, AdminLogin) are matched first and render
// their own complete layout — no Navbar, no GlobalFooter injected here.
// Everything else flows through AppShell.
const RootRouter = () => {
  const location = useLocation();
  const isStandalone = STANDALONE_PATHS.some((p) => location.pathname === p);

  return (
    <>
      {/* Standalone full-page routes — own layout, no shared chrome */}
      <Routes location={location}>
        {/* Landing: always visible regardless of auth */}
        <Route path="/landing" element={<Landing />} />
        {/* Dev login: always accessible — developers may want to switch accounts */}
        <Route path="/dev/login" element={<DevLogin />} />
        {/* Auth pages: redirect away if already logged in */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
        </Route>
      </Routes>

      {/* App shell — only renders when NOT on a standalone page */}
      {!isStandalone && <AppShell />}

      {/* Global footer — only on app pages, not standalone */}
      {!isStandalone && <GlobalFooter />}
    </>
  );
};

// ── App ──────────────────────────────────────────────────────────────────────
const App = () => {
  const { user, loading } = useAppData();
  const { socket } = useSocket();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showOnlineStatus, setShowOnlineStatus] = useState(false);
  const [announcement, setAnnouncement] = useState<string | null>(null);

  // Admin broadcast announcements via WebSocket
  useEffect(() => {
    if (!socket) return;
    const onBroadcast = ({ message }: { message: string }) => {
      setAnnouncement(message);
      setTimeout(() => setAnnouncement(null), 8000);
    };
    socket.on("admin:broadcast", onBroadcast);
    return () => { socket.off("admin:broadcast", onBroadcast); };
  }, [socket]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("clear") === "true") {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/landing";
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowOnlineStatus(true);
      const timer = setTimeout(() => setShowOnlineStatus(false), 3000);
      return () => clearTimeout(timer);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setShowOnlineStatus(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (loading) {
    return (
      <div
        className="flex h-screen w-screen items-center justify-center"
        style={{ backgroundColor: "var(--bg-base)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <ForkfulLogo size={56} dark mono />
          <span style={{ fontFamily: "var(--font-display, system-ui)", fontWeight: 800, letterSpacing: "-0.04em", fontSize: "1.25rem", lineHeight: 1 }}>
            <span style={{ color: "var(--color-ink)" }}>Fork</span>
            <span style={{
              color: "#FF6B45",
              textShadow: "0 0 20px rgba(255, 107, 69, 0.4)"
            }}>ful</span>
          </span>
          <div className="w-4 h-4 border border-[#FF6B45] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {/* Global overlays (announcements, offline banner) — always on top */}
      <CommandPalette />

      {announcement && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-4 animate-fade-in" role="alert" aria-live="assertive">
          <div className="flex items-start gap-3 px-4 py-3 rounded-2xl border border-purple-500/30 bg-purple-500/15 backdrop-blur-md shadow-xl">
            <span className="text-purple-400 mt-0.5 flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.7 2 2 0 012-2.18h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 6" />
              </svg>
            </span>
            <div className="flex-1">
              <p className="text-[10px] font-mono tracking-widest uppercase font-bold text-purple-400 mb-0.5">Forkful Announcement</p>
              <p className="text-xs font-semibold text-white">{announcement}</p>
            </div>
            <button onClick={() => setAnnouncement(null)} className="text-purple-300 hover:text-white transition-colors flex-shrink-0" aria-label="Dismiss announcement">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {isOffline && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-4 animate-bounce">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-red-500/20 bg-red-500/10 backdrop-blur-md text-red-500 text-xs font-bold shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="flex-1">Operating in offline mode. Check your network connection.</span>
          </div>
        </div>
      )}
      {!isOffline && showOnlineStatus && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-4 animate-fade-in">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-green-500/20 bg-green-500/10 backdrop-blur-md text-green-500 text-xs font-bold shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="flex-1">Connection restored! Synchronizing app state.</span>
          </div>
        </div>
      )}

      {/* Main routing */}
      <RootRouter />
    </BrowserRouter>
  );
};

export default App;
