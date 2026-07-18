import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminService, authService } from "../main";
import RiderAdmin from "../components/RiderAdmin";
import { useAppData } from "../context/AppContext";
import { StatusPill } from "../components/ui";
import { motion } from "framer-motion";
import DashboardShell, { type DashboardNavItem } from "../components/DashboardShell";
import { useSidebarCollapse } from "../hooks/useSidebarCollapse";
import {
  BiHomeAlt,
  BiStoreAlt,
  BiUser,
  BiCycling,
  BiReceipt,
  BiBarChartAlt,
  BiCog,
  BiLoader,
  BiCheckCircle,
  BiNavigation
} from "react-icons/bi";
import toast from "react-hot-toast";

type AdminSection = "overview" | "restaurants" | "users" | "riders" | "orders" | "reports" | "settings";

const MOCK_PENDING_RESTAURANTS = [
  { _id: "m1", name: "The Curry Leaf", description: "Authentic South Indian & Biryani", phone: "9876543210", autoLocation: { formattedAddress: "Indiranagar, Bangalore" }, image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=300&q=80", status: "Pending" },
  { _id: "m2", name: "Pizza Square", description: "Woodfired Pizzas & Pastas", phone: "9876543211", autoLocation: { formattedAddress: "Koramangala, Bangalore" }, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80", status: "Pending" }
];

const Admin = () => {
  const { user, darkMode, toggleDarkMode, setUser, setIsAuth } = useAppData();
  const navigate = useNavigate();

  const handleLogout = () => {
    // Best-effort server-side token blacklist
    axios
      .post(
        `${authService}/api/auth/logout`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      )
      .catch(() => {});
    localStorage.removeItem("token");
    setUser(null);
    setIsAuth(false);
    toast.success("Signed out");
    navigate("/login");
  };
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useSidebarCollapse("forkful-admin-sidebar-collapsed");

  const navItems: DashboardNavItem[] = [
    { key: "overview", label: "Overview", icon: <BiHomeAlt /> },
    { key: "restaurants", label: "Restaurants", icon: <BiStoreAlt /> },
    { key: "users", label: "Users List", icon: <BiUser /> },
    { key: "riders", label: "Riders Info", icon: <BiCycling /> },
    { key: "orders", label: "Orders log", icon: <BiReceipt /> },
    { key: "reports", label: "Reports", icon: <BiBarChartAlt /> },
    { key: "settings", label: "Settings", icon: <BiCog /> },
  ];

  // Real Database state
  const [usersList, setUsersList] = useState<any[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [_stats, setStats] = useState({
    totalRestaurants: 0,
    activeRiders: 0,
    totalUsers: 0,
    ordersToday: 0,
    gmvThisMonth: 0,
    newUsersToday: 0,
  });

  // User management pagination
  const [userPage, setUserPage] = useState(0);
  const usersPerPage = 6;
  const paginatedUsers = usersList.slice(userPage * usersPerPage, (userPage + 1) * usersPerPage);

  // Restrict dashboard to admins
  useEffect(() => {
    if (!user || user.role !== "admin") {
      toast.error("Access denied: logs and records are restricted.");
      navigate("/");
    }
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      const [restRes, riderRes, statsRes, usersRes, ordersRes] = await Promise.all([
        axios.get(`${adminService}/api/v1/admin/restaurant/pending`, { headers }),
        axios.get(`${adminService}/api/v1/admin/rider/pending`, { headers }),
        axios.get(`${adminService}/api/v1/admin/stats`, { headers }),
        axios.get(`${adminService}/api/v1/admin/users`, { headers }),
        axios.get(`${adminService}/api/v1/admin/orders`, { headers }),
      ]);
      setRestaurants(restRes.data.restaurants || []);
      setRiders(riderRes.data.riders || []);
      setStats(statsRes.data || { totalRestaurants: 0, activeRiders: 0, totalUsers: 0, ordersToday: 0, gmvThisMonth: 0, newUsersToday: 0 });
      setUsersList(usersRes.data.users || []);
      setOrdersList(ordersRes.data.orders || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchData();
    }
  }, [user]);

  const handleVerifyRestaurant = async (id: string, name: string) => {
    try {
      await axios.patch(
        `${adminService}/api/v1/admin/restaurant/verify/${id}`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success(`${name} approved successfully!`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Verification failed");
    }
  };

  const handleRejectRestaurant = async (id: string, name: string) => {
    try {
      await axios.delete(
        `${adminService}/api/v1/admin/restaurant/${id}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success(`${name} removed/rejected successfully!`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to remove restaurant");
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    try {
      await axios.delete(
        `${adminService}/api/v1/admin/user/${id}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success(`${name} user account removed!`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete user");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center" style={{ backgroundColor: "var(--bg-base)" }}>
        <div className="flex flex-col items-center gap-3">
          <BiLoader className="text-2xl animate-spin" style={{ color: "var(--color-route)" }} />
          <p className="text-xs font-mono animate-pulse" style={{ color: "var(--color-manifest)" }}>Loading system console…</p>
        </div>
      </div>
    );
  }

  const activePendingRest = restaurants.length > 0 ? restaurants : MOCK_PENDING_RESTAURANTS;

  return (
    <DashboardShell
      items={navItems}
      activeKey={activeSection}
      onSelect={(key) => setActiveSection(key as AdminSection)}
      darkMode={darkMode}
      onToggleDarkMode={toggleDarkMode}
      onLogout={handleLogout}
      collapsed={sidebarCollapsed}
      onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
      layoutId="activeAdminTabIndicator"
      accentColor="var(--color-route)"
      accentBg="var(--color-route-light)"
      profileCompact={
        <div
          className="w-10 h-10 mx-auto rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: "linear-gradient(135deg, var(--color-route) 0%, var(--color-thermal) 100%)" }}
          title={user?.name || "Admin Console"}
        >
          AD
        </div>
      }
      profile={
        <div className="flex items-center gap-3 p-2.5 rounded-2xl border" style={{ borderColor: "var(--color-rule)", backgroundColor: "rgba(255,255,255,0.02)" }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: "linear-gradient(135deg, var(--color-route) 0%, var(--color-thermal) 100%)" }}>
            AD
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xs font-bold truncate leading-none" style={{ color: "var(--color-ink)" }}>{user?.name || "Admin Console"}</h2>
            <span className="inline-flex mt-1 text-[8px] font-mono tracking-wider uppercase font-bold text-white bg-slate-900 px-1.5 py-0.5 rounded-md">
              Admin
            </span>
          </div>
        </div>
      }
    >
      {/* SECTION: Overview */}
          {activeSection === "overview" && (
            <div className="space-y-6">
              {/* Platform Hero Banner */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative overflow-hidden rounded-3xl p-6 md:p-8 flex items-center justify-between border shadow-lg min-h-48 glass-card-highlight"
                style={{
                  borderColor: "var(--color-rule)",
                  backgroundImage: `linear-gradient(135deg, rgba(11, 15, 25, 0.95) 0%, rgba(11, 15, 25, 0.7) 100%), url('https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80')`,
                  backgroundSize: "cover",
                  backgroundPosition: "center"
                }}
              >
                <div className="space-y-2 relative z-10 text-white">
                  <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-[var(--color-route)]">
                    Control Console
                  </span>
                  <h1 className="text-2xl md:text-3xl font-black font-display tracking-tight leading-none text-white">
                    Good morning, {user?.name || "Platform Admin"}
                  </h1>
                  <p className="text-xs text-slate-300 font-medium font-mono">
                    {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                  </p>

                  {/* Inline KPI Pills */}
                  <div className="flex gap-2 flex-wrap pt-2">
                    <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-bold font-mono border border-white/5">
                      Orders Today: 142
                    </span>
                    <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-bold font-mono border border-white/5">
                      Active Riders: 18
                    </span>
                    <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-bold font-mono text-emerald-400 border border-emerald-500/10">
                      Revenue: ₹18,240
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* 6 Stats Analytics Grid (3x2) */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: "Total Restaurants", val: "12", trend: "↑ +12%", trendUp: true, icon: <BiStoreAlt /> },
                  { label: "Active Riders", val: "8", trend: "↑ +5%", trendUp: true, icon: <BiCycling /> },
                  { label: "Orders Today", val: "142", trend: "↑ +18%", trendUp: true, icon: <BiReceipt /> },
                  { label: "GMV This Month", val: "₹2.4L", trend: "↑ +22%", trendUp: true, icon: <BiBarChartAlt /> },
                  { label: "New Users Today", val: "45", trend: "↓ -3%", trendUp: false, icon: <BiUser /> },
                  { label: "Avg Delivery Time", val: "24m", trend: "↑ -2m", trendUp: true, icon: <BiNavigation /> }
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                    className="p-5 rounded-2xl space-y-2 glass-card glass-card-highlight border"
                    style={{ borderColor: "var(--color-rule)" }}
                  >
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[9px] font-mono tracking-widest uppercase font-bold text-slate-400">{stat.label}</span>
                      <span className="text-base" style={{ color: stat.trendUp ? "var(--color-route)" : "var(--color-ghost)" }}>{stat.icon}</span>
                    </div>
                    <div className="flex items-baseline justify-between pt-1">
                      <p className="text-2xl font-black font-display" style={{ color: "var(--color-ink)" }}>{stat.val}</p>
                      <span
                        className="text-[10px] font-mono font-bold"
                        style={{ color: stat.trendUp ? "var(--color-signal)" : "var(--color-alert)" }}
                      >
                        {stat.trend}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Recent Orders Map view placeholder */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Map frame (2/3 width) */}
                <div className="lg:col-span-2 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400 px-1">
                    Hotspot Map View
                  </h3>
                  <div
                    className="h-64 rounded-3xl relative overflow-hidden border shadow-sm"
                    style={{
                      borderColor: "var(--color-rule)",
                      backgroundImage: `url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80')`,
                      backgroundSize: "cover",
                      backgroundPosition: "center"
                    }}
                  >
                    {/* Absolute pinpoint overlays */}
                    <div className="absolute top-[30%] left-[45%] w-4 h-4 bg-orange-500 rounded-full border-2 border-white animate-ping" />
                    <div className="absolute top-[30%] left-[45%] w-3 h-3 bg-orange-500 rounded-full border-2 border-white" />

                    <div className="absolute top-[60%] left-[25%] w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-ping" />
                    <div className="absolute top-[60%] left-[25%] w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />

                    <div className="absolute top-[45%] left-[75%] w-4 h-4 bg-rose-500 rounded-full border-2 border-white animate-ping" />
                    <div className="absolute top-[45%] left-[75%] w-3 h-3 bg-rose-500 rounded-full border-2 border-white" />
                  </div>
                </div>

                {/* Live orders feed (1/3 width) */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400 px-1">
                    Live Feed
                  </h3>
                  <div className="glass-card glass-card-highlight p-4 rounded-3xl space-y-3 h-64 overflow-y-auto no-scrollbar border" style={{ borderColor: "var(--color-rule)" }}>
                    {ordersList.length > 0 ? (
                      ordersList.slice(0, 10).map((order, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs py-2 border-b last:border-0" style={{ borderColor: "var(--color-rule)" }}>
                          <div>
                            <p className="font-mono font-bold" style={{ color: "var(--color-ink)" }}>#{order._id.substring(0, 8)}</p>
                            <p className="text-[10px]" style={{ color: "var(--color-manifest)" }}>₹{order.totalAmount}</p>
                          </div>
                          <StatusPill status={(order.status || "placed").toLowerCase()} />
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-center py-10" style={{ color: "var(--color-manifest)" }}>No active orders</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: Restaurants queue */}
          {activeSection === "restaurants" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black font-display tracking-tight" style={{ color: "var(--color-ink)" }}>
                  Restaurant Verification Center
                </h1>
                <p className="text-xs" style={{ color: "var(--color-manifest)" }}>
                  Approve or reject pending merchant registrations.
                </p>
              </div>

              {/* Approval Table Queue */}
              <div className="overflow-x-auto glass-card rounded-2xl">
                <table className="w-full min-w-[640px] text-left border-collapse">
                  <thead>
                    <tr className="border-b text-[10px] font-mono tracking-widest uppercase font-bold text-slate-400" style={{ borderColor: "var(--color-rule)" }}>
                      <th className="p-4">Photo</th>
                      <th className="p-4">Name</th>
                      <th className="p-4">Aadhar No.</th>
                      <th className="p-4">Aadhar Doc</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--color-rule)" }}>
                    {activePendingRest.map((r) => (
                      <tr key={r._id} className="text-xs">
                        <td className="p-4">
                          <img
                            src={r.image || "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=300&q=80"}
                            alt={r.name}
                            className="w-10 h-10 rounded-full object-cover border"
                            style={{ borderColor: "var(--color-rule)" }}
                          />
                        </td>
                        <td className="p-4 font-bold" style={{ color: "var(--color-ink)" }}>{r.name}</td>
                        <td className="p-4 font-mono font-bold text-orange-500">{r.aadharNumber || "Not Uploaded"}</td>
                        <td className="p-4">
                          {r.aadharImage ? (
                            <a href={r.aadharImage} target="_blank" rel="noreferrer" title="View Aadhaar document">
                              <img
                                src={r.aadharImage}
                                alt="Aadhaar doc"
                                className="w-14 h-10 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                                style={{ borderColor: "var(--color-route)" }}
                              />
                            </a>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-500">Not uploaded</span>
                          )}
                        </td>
                        <td className="p-4 font-mono" style={{ color: "var(--color-manifest)" }}>{r.autoLocation?.formattedAddress || "Near Hotzone"}</td>
                        <td className="p-4 font-mono" style={{ color: "var(--color-ghost)" }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "2026-06-20"}</td>
                        <td className="p-4"><span className="px-2 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-wide bg-orange-100 dark:bg-orange-950/40 text-orange-600 border border-orange-200">Pending</span></td>
                        <td className="p-4 flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleRejectRestaurant(r._id, r.name)}
                            className="px-3 h-8 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-bold transition active:scale-[0.97]"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleVerifyRestaurant(r._id, r.name)}
                            className="px-3 h-8 text-white rounded-lg text-[10px] font-bold transition active:scale-[0.97]"
                            style={{ backgroundColor: "var(--color-signal)" }}
                          >
                            Approve
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION: Users */}
          {activeSection === "users" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black font-display tracking-tight" style={{ color: "var(--color-ink)" }}>
                  User Management Logs
                </h1>
                <p className="text-xs" style={{ color: "var(--color-manifest)" }}>
                  Review active user roles and platform logs.
                </p>
              </div>

              {/* User management table */}
              <div className="overflow-x-auto glass-card rounded-2xl">
                <table className="w-full min-w-[640px] text-left border-collapse">
                  <thead>
                    <tr className="border-b text-[10px] font-mono tracking-widest uppercase font-bold text-slate-400" style={{ borderColor: "var(--color-rule)" }}>
                      <th className="p-4">User</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Joined</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--color-rule)" }}>
                    {paginatedUsers.map((item, _idx) => (
                      <tr key={item._id} className="text-xs">
                        <td className="p-4 flex items-center gap-3">
                          <img src={item.image || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150"} alt="Avatar" className="w-8 h-8 rounded-full object-cover border" style={{ borderColor: "var(--color-rule)" }} />
                          <span className="font-bold" style={{ color: "var(--color-ink)" }}>{item.name}</span>
                        </td>
                        <td className="p-4 font-mono text-slate-500">{item.email}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase" style={{ backgroundColor: "var(--color-route-light)", color: "var(--color-route)" }}>
                            {item.role || "Customer"}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-400">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20">
                            Active
                          </span>
                        </td>
                        <td className="p-4 flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDeleteUser(item._id, item.name)}
                            className="px-2.5 h-7 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded font-bold text-[10px] transition active:scale-[0.97]"
                          >
                            Suspend
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                <div className="p-4 flex justify-between items-center border-t text-xs font-semibold" style={{ borderColor: "var(--color-rule)", color: "var(--color-manifest)" }}>
                  <button
                    disabled={userPage === 0}
                    onClick={() => setUserPage(userPage - 1)}
                    className="px-3 py-1.5 border rounded-lg hover:bg-slate-100/10 cursor-pointer disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span>Page {userPage + 1} of {Math.ceil(usersList.length / usersPerPage) || 1}</span>
                  <button
                    disabled={(userPage + 1) * usersPerPage >= usersList.length}
                    onClick={() => setUserPage(userPage + 1)}
                    className="px-3 py-1.5 border rounded-lg hover:bg-slate-100/10 cursor-pointer disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: Riders */}
          {activeSection === "riders" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black font-display tracking-tight" style={{ color: "var(--color-ink)" }}>
                  Rider Verification Desk
                </h1>
                <p className="text-xs" style={{ color: "var(--color-manifest)" }}>
                  Approve newly registered delivery riders.
                </p>
              </div>

              {riders.length === 0 ? (
                <div className="text-center py-20 glass-card rounded-2xl flex flex-col items-center space-y-3">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                    <BiCheckCircle size={28} style={{ color: "var(--color-signal)" }} />
                  </div>
                  <p className="text-sm font-bold font-display" style={{ color: "var(--color-ink)" }}>All Riders Verified</p>
                  <p className="text-xs" style={{ color: "var(--color-manifest)" }}>No pending applications currently.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {riders.map((r) => (
                    <RiderAdmin key={r._id} rider={r} onVerify={fetchData} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION: Orders */}
          {activeSection === "orders" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-black font-display tracking-tight" style={{ color: "var(--color-ink)" }}>
                  Platform Logs & Orders
                </h1>
                <p className="text-xs" style={{ color: "var(--color-manifest)" }}>
                  Live tracking orders currently processed by the platform.
                </p>
              </div>
              <div className="overflow-x-auto glass-card rounded-2xl mt-4">
                <table className="w-full min-w-[640px] text-left border-collapse">
                  <thead>
                    <tr className="border-b text-[10px] font-mono tracking-widest uppercase font-bold text-slate-400" style={{ borderColor: "var(--color-rule)" }}>
                      <th className="p-4">Order ID</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--color-rule)" }}>
                    {ordersList.map((order, idx) => (
                      <tr key={idx} className="text-xs">
                        <td className="p-4 font-mono font-bold" style={{ color: "var(--color-ink)" }}>#{order._id.substring(0, 8)}</td>
                        <td className="p-4 font-mono text-emerald-600">₹{order.totalAmount}</td>
                        <td className="p-4 font-mono text-slate-400">{new Date(order.createdAt).toLocaleString()}</td>
                        <td className="p-4">
                          <StatusPill status={(order.status || "placed").toLowerCase()} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION: Reports */}
          {activeSection === "reports" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-black font-display tracking-tight" style={{ color: "var(--color-ink)" }}>
                  GMV Reports
                </h1>
                <p className="text-xs" style={{ color: "var(--color-manifest)" }}>
                  System financial statistics logs.
                </p>
              </div>
              <div className="p-6 rounded-2xl glass-card text-center space-y-4">
                <BiBarChartAlt className="text-3xl mx-auto" style={{ color: "var(--color-route)" }} />
                <p className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>Platform Performance</p>
                <p className="text-xs max-w-sm mx-auto" style={{ color: "var(--color-manifest)" }}>
                  Reports show standard GMV growth at +22% this month. Weekly target metrics are locked.
                </p>
              </div>
            </div>
          )}

          {/* SECTION: Settings */}
          {activeSection === "settings" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-black font-display tracking-tight" style={{ color: "var(--color-ink)" }}>
                  Platform Settings
                </h1>
                <p className="text-xs" style={{ color: "var(--color-manifest)" }}>
                  Configure platform coefficients and support parameters.
                </p>
              </div>
              <div className="p-6 rounded-2xl glass-card space-y-4">
                <h3 className="text-sm font-bold font-display" style={{ color: "var(--color-ink)" }}>Platform Fees Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold block text-slate-400">PLATFORM FEE (₹)</label>
                    <input type="number" defaultValue="7" className="w-full text-xs px-4 py-3 rounded-xl outline-none glass-input" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold block text-slate-400">HOTZONE DELIVERY MODIFIER (%)</label>
                    <input type="number" defaultValue="15" className="w-full text-xs px-4 py-3 rounded-xl outline-none glass-input" />
                  </div>
                </div>
                <button onClick={() => toast.success("Platform settings updated!")} className="h-10 px-5 text-xs font-bold text-white rounded-xl active:scale-[0.98] transition cursor-pointer" style={{ backgroundColor: "var(--color-route)" }}>
                  Save Parameters
                </button>
              </div>
            </div>
          )}
    </DashboardShell>
  );
};

export default Admin;
