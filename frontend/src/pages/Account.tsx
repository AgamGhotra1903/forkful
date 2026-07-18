import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import toast from "react-hot-toast";
import { BiCycling, BiHeart, BiStar, BiPackage } from "react-icons/bi";
import { useState, useEffect } from "react";
import axios from "axios";
import { restaurantService, riderService } from "../main";

const Account = () => {
  const { user, setUser, setIsAuth } = useAppData();
  const navigate = useNavigate();

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileVerified, setProfileVerified] = useState(true);
  const [aadharNumber, setAadharNumber] = useState("");
  const [aadharImage, setAadharImage] = useState(""); // stored image URL from backend
  const [aadharInput, setAadharInput] = useState("");
  const [aadharImageFile, setAadharImageFile] = useState<File | null>(null);
  const [aadharImagePreview, setAadharImagePreview] = useState("");
  const [updatingAadhar, setUpdatingAadhar] = useState(false);
  const [pastDeliveries, setPastDeliveries] = useState<any[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user || (user.role !== "seller" && user.role !== "rider")) return;
      setProfileLoading(true);
      try {
        const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
        if (user.role === "seller") {
          const { data } = await axios.get(`${restaurantService}/api/restaurant/my`, { headers });
          if (data.restaurant) {
            setProfileVerified(data.restaurant.isVerified);
            setAadharNumber(data.restaurant.aadharNumber || "");
            setAadharImage(data.restaurant.aadharImage || "");
          }
        } else if (user.role === "rider") {
          const { data } = await axios.get(`${riderService}/api/rider/myprofile`, { headers });
          if (data) {
            setProfileVerified(data.isVerified);
            setAadharNumber(data.aadharNumber || "");
            setAadharImage(data.aadharImage || "");
          }
        }
      } catch (err) {
        console.error("Failed to fetch verification status:", err);
      } finally {
        setProfileLoading(false);
      }
    };

    const fetchPastDeliveries = async () => {
      if (!user || user.role !== "rider") return;
      setLoadingDeliveries(true);
      try {
        const { data } = await axios.get(`${riderService}/api/rider/orders/completed`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setPastDeliveries(data.orders || []);
      } catch {
        setPastDeliveries([]);
      } finally {
        setLoadingDeliveries(false);
      }
    };

    fetchProfileData();
    fetchPastDeliveries();
  }, [user]);

  // Convert file to base64 for preview and backend submission
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setAadharImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAadharImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAadhar = async () => {
    if (!aadharInput.trim()) {
      toast.error("Please enter a valid Aadhar number");
      return;
    }
    setUpdatingAadhar(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };

      // Convert image file to base64 string if provided
      let aadharImageBase64 = "";
      if (aadharImageFile) {
        aadharImageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(aadharImageFile);
        });
      }

      if (user?.role === "seller") {
        const { data } = await axios.put(
          `${restaurantService}/api/restaurant/aadhar`,
          { aadharNumber: aadharInput, aadharImage: aadharImageBase64 || undefined },
          { headers }
        );
        setProfileVerified(data.restaurant.isVerified);
        setAadharNumber(data.restaurant.aadharNumber);
        setAadharImage(data.restaurant.aadharImage || "");
        toast.success("Restaurant Aadhar updated! Awaiting manual verification.");
      } else if (user?.role === "rider") {
        const { data } = await axios.put(
          `${riderService}/api/rider/aadhar`,
          { aadharNumber: aadharInput, aadharImage: aadharImageBase64 || undefined },
          { headers }
        );
        setProfileVerified(data.rider.isVerified);
        setAadharNumber(data.rider.aadharNumber);
        setAadharImage(data.rider.aadharImage || "");
        toast.success("Rider Aadhar updated! Awaiting manual verification.");
      }
      setAadharInput("");
      setAadharImageFile(null);
      setAadharImagePreview("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update Aadhar");
    } finally {
      setUpdatingAadhar(false);
    }
  };

  const logoutHandler = () => {
    localStorage.removeItem("token");
    setUser(null);
    setIsAuth(false);
    navigate("/login");
    toast.success("Signed out");
  };

  interface MenuItemType {
    label: string;
    description: string;
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    action: () => void;
    danger?: boolean;
  }

  interface MenuSectionType {
    title: string;
    items: MenuItemType[];
  }

  const MENU_SECTIONS: MenuSectionType[] = [
    {
      title: user?.role === "rider" ? "Rider activity" : "Your activity",
      items: [
        ...(user?.role === "rider"
          ? [] // riders don't need the generic orders link
          : [
              {
                label: "Your orders",
                description: "Track active and past orders",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                  </svg>
                ),
                iconBg: "var(--color-route-light)",
                iconColor: "var(--color-route)",
                action: () => navigate("/orders"),
              },
              {
                label: "Saved addresses",
                description: "Add or manage delivery locations",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                ),
                iconBg: "var(--color-route-light)",
                iconColor: "var(--color-route)",
                action: () => navigate("/address"),
              },
            ]),
      ],
    },
    {
      title: "Account",
      items: [
        {
          label: "Sign out",
          description: `Currently signed in as ${user?.email ?? ""}`,
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          ),
          iconBg: "var(--color-alert-light)",
          iconColor: "var(--color-alert)",
          action: logoutHandler,
          danger: true,
        },
      ],
    },
  ];

  const initials = user?.name
    ?.split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() ?? "U";

  return (
    <main className="min-h-screen pb-12" style={{ backgroundColor: "var(--bg-base)" }}>
      <div className="mx-auto max-w-md px-4 py-8 space-y-6">

        {user?.role && user.role !== "customer" && (
          <button 
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold font-mono uppercase tracking-wider text-[var(--color-manifest)] hover:text-[var(--color-route)] transition-all cursor-pointer"
            style={{ borderColor: "var(--color-rule)", backgroundColor: "rgba(255,255,255,0.02)" }}
          >
            ⬅ Back to Dashboard
          </button>
        )}

        {/* ── Profile card ── */}
        <div className="p-5 flex items-center gap-4 glass-card">
          {/* Avatar */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, var(--color-route) 0%, var(--color-thermal) 100%)" }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold truncate font-display" style={{ color: "var(--color-ink)" }}>
              {user?.name ?? "Guest"}
            </h1>
            <p className="text-xs font-mono mt-0.5 truncate" style={{ color: "var(--color-manifest)" }}>
              {user?.email}
            </p>
            {user?.role && (
              <div
                className="inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-body"
                style={{ backgroundColor: "var(--color-route-light)", color: "var(--color-route)" }}
              >
                {user.role}
              </div>
            )}
          </div>
        </div>

        {/* ── Aadhar Verification Status Card ── */}
        {(user?.role === "seller" || user?.role === "rider") && !profileLoading && (
          <div 
            className="p-5 space-y-4 glass-card border reveal"
            style={{
              borderColor: profileVerified ? "rgba(34, 197, 94, 0.25)" : "rgba(245, 158, 11, 0.25)",
              background: profileVerified 
                ? "linear-gradient(135deg, rgba(34, 197, 94, 0.03) 0%, rgba(15, 23, 42, 0.4) 100%)" 
                : "linear-gradient(135deg, rgba(245, 158, 11, 0.03) 0%, rgba(15, 23, 42, 0.4) 100%)",
              borderRadius: "var(--radius-xl)"
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base select-none"
                  style={{ 
                    backgroundColor: profileVerified ? "rgba(34, 197, 94, 0.1)" : "rgba(245, 158, 11, 0.1)",
                    color: profileVerified ? "rgb(34, 197, 94)" : "rgb(245, 158, 11)",
                    border: profileVerified ? "1px solid rgba(34, 197, 94, 0.2)" : "1px solid rgba(245, 158, 11, 0.2)"
                  }}
                >
                  🆔
                </div>
                <div>
                  <h3 className="text-xs font-bold font-display uppercase tracking-wide" style={{ color: "var(--color-ink)" }}>
                    Aadhar Verification Status
                  </h3>
                  <p className="text-[10px]" style={{ color: "var(--color-manifest)" }}>
                    {profileVerified 
                      ? "Your identity profile is fully verified." 
                      : "Verification is required to operate on Forkful."}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <span 
                className="px-2.5 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-wider uppercase border"
                style={{
                  backgroundColor: profileVerified ? "rgba(34, 197, 94, 0.1)" : "rgba(245, 158, 11, 0.1)",
                  color: profileVerified ? "#4ade80" : "#fbbf24",
                  borderColor: profileVerified ? "rgba(34, 197, 94, 0.2)" : "rgba(245, 158, 11, 0.2)"
                }}
              >
                {profileVerified ? "Verified" : "Pending"}
              </span>
            </div>

            {/* Aadhar details & update input */}
            <div className="pt-2 border-t border-slate-700/30 space-y-4">
              {/* Current Aadhaar info row */}
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-[10px] text-slate-400">Current Aadhar No.</span>
                <span className="font-bold text-[var(--color-ink)]">{aadharNumber || "Not Provided"}</span>
              </div>

              {/* Existing Aadhaar photo (if any) */}
              {aadharImage && (
                <div className="space-y-1">
                  <p className="text-[9px] font-mono tracking-wider uppercase font-bold text-slate-400">Submitted Aadhar Photo</p>
                  <img
                    src={aadharImage}
                    alt="Submitted Aadhaar"
                    className="w-full max-h-36 object-cover rounded-xl border"
                    style={{ borderColor: "var(--color-rule)" }}
                  />
                </div>
              )}

              {/* Submission form — always shown for unverified, shown for resubmit when verified */}
              <div className="space-y-3">
                <p className="text-[9px] font-mono tracking-wider uppercase font-bold text-slate-400">
                  {profileVerified ? "Resubmit Aadhaar (if info changed)" : "Submit Aadhaar for Verification"}
                </p>

                {/* Aadhaar number field */}
                <div className="space-y-1">
                  <label className="text-[9px] font-mono tracking-wider uppercase font-bold text-slate-500">
                    Aadhaar Number
                  </label>
                  <input
                    type="text"
                    placeholder="12-digit Aadhaar number (e.g. 1234-5678-9012)"
                    value={aadharInput}
                    onChange={(e) => setAadharInput(e.target.value)}
                    className="w-full text-xs px-4 py-2.5 rounded-xl outline-none glass-input"
                  />
                </div>

                {/* Aadhaar photo upload */}
                <div className="space-y-2">
                  <label className="text-[9px] font-mono tracking-wider uppercase font-bold text-slate-500">
                    Upload Aadhaar Photo
                  </label>
                  <label
                    htmlFor="aadhar-img-upload"
                    className="flex flex-col items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed cursor-pointer transition-colors hover:border-orange-400/60 py-4"
                    style={{ borderColor: aadharImagePreview ? "rgba(34,197,94,0.4)" : "var(--color-rule)", backgroundColor: "rgba(255,255,255,0.02)" }}
                  >
                    {aadharImagePreview ? (
                      <img
                        src={aadharImagePreview}
                        alt="Aadhaar preview"
                        className="w-full max-h-36 object-cover rounded-lg"
                      />
                    ) : (
                      <>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-ghost)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21 15 16 10 5 21"/>
                        </svg>
                        <span className="text-[10px] font-mono text-slate-400">Click to upload Aadhaar photo</span>
                        <span className="text-[9px] text-slate-500">JPG, PNG, WEBP · max 5 MB</span>
                      </>
                    )}
                    <input
                      id="aadhar-img-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageFileChange}
                    />
                  </label>
                  {aadharImagePreview && (
                    <button
                      onClick={() => { setAadharImageFile(null); setAadharImagePreview(""); }}
                      className="text-[10px] font-mono text-rose-400 hover:text-rose-300 transition-colors"
                    >
                      ✕ Remove photo
                    </button>
                  )}
                </div>

                <button
                  onClick={handleUploadAadhar}
                  disabled={updatingAadhar || !aadharInput.trim()}
                  className="w-full h-10 text-xs font-bold text-white rounded-xl active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-route)" }}
                >
                  {updatingAadhar ? "Submitting…" : "Submit for Admin Approval"}
                </button>
              </div>
            </div>
          </div>
        )}


        {/* ── Stats row — only show for customers ── */}
        {user?.role !== "rider" && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Orders", value: "—", icon: <BiCycling className="text-xl mx-auto" /> },
              { label: "Saved", value: "—", icon: <BiHeart className="text-xl mx-auto" /> },
              { label: "Points", value: "0", icon: <BiStar className="text-xl mx-auto" /> },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-4 text-center glass-card card-lift"
              >
                <div className="text-xl mb-2" style={{ color: "var(--color-manifest)" }}>{stat.icon}</div>
                <p className="text-sm font-bold font-display" style={{ color: "var(--color-ink)" }}>{stat.value}</p>
                <p className="text-[10px] font-semibold mt-0.5" style={{ color: "var(--color-manifest)" }}>{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Past Deliveries (rider only) ── */}
        {user?.role === "rider" && (
          <div className="space-y-3">
            <h2 className="text-[9px] font-body font-bold uppercase tracking-wider px-1" style={{ color: "var(--color-ghost)" }}>
              Previous Deliveries
            </h2>
            {loadingDeliveries ? (
              <div className="glass-card p-5 flex items-center justify-center gap-2" style={{ color: "var(--color-manifest)" }}>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Loading deliveries...</span>
              </div>
            ) : pastDeliveries.length === 0 ? (
              <div className="glass-card p-6 text-center space-y-2">
                <BiPackage className="text-3xl mx-auto" style={{ color: "var(--color-ghost)" }} />
                <p className="text-xs font-semibold" style={{ color: "var(--color-manifest)" }}>No deliveries yet</p>
                <p className="text-[10px]" style={{ color: "var(--color-ghost)" }}>Completed deliveries will appear here</p>
              </div>
            ) : (
              <div className="overflow-hidden glass-card divide-y" style={{ borderColor: "var(--color-rule)" }}>
                {pastDeliveries.slice(0, 20).map((order: any) => (
                  <div key={order._id} className="px-4 py-3 flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
                      style={{ backgroundColor: "var(--color-route-light)", color: "var(--color-route)" }}
                    >
                      <BiCycling />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: "var(--color-ink)" }}>
                        {order.restaurantName || "Restaurant"}
                      </p>
                      <p className="text-[10px] font-mono" style={{ color: "var(--color-manifest)" }}>
                        {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold" style={{ color: "var(--color-signal)" }}>₹{order.riderAmount || 0}</p>
                      <p className="text-[10px] font-mono capitalize" style={{ color: "var(--color-ghost)" }}>{order.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}



        {/* ── Menu sections ── */}
        {MENU_SECTIONS.filter(s => s.items.length > 0).map((section) => (
          <div key={section.title} className="space-y-2">
            <h2
              className="text-[9px] font-body font-bold uppercase tracking-wider px-1"
              style={{ color: "var(--color-ghost)" }}
            >
              {section.title}
            </h2>
            <div className="overflow-hidden glass-card">
              {section.items.map((item, i) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full flex items-center gap-4 px-4 py-4 text-left transition-all duration-150 bg-transparent cursor-pointer active:scale-[0.99]"
                  style={{
                    borderBottom: i < section.items.length - 1 ? "1px solid var(--color-rule)" : "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = item.danger
                      ? "rgba(239,68,68,0.04)"
                      : "rgba(255,255,255,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: item.iconBg, color: item.iconColor }}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-semibold"
                      style={{ color: item.danger ? "var(--color-alert)" : "var(--color-ink)" }}
                    >
                      {item.label}
                    </p>
                    <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--color-manifest)" }}>
                      {item.description}
                    </p>
                  </div>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={item.danger ? "var(--color-alert)" : "var(--color-ghost)"}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-shrink-0"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* ── App version ── */}
        <p className="text-center text-[10px] font-body" style={{ color: "var(--color-ghost)" }}>
          Forkful v1.0 · Made with <BiHeart className="inline text-rose-500 mx-1 align-middle" />
        </p>
      </div>
    </main>
  );
};

export default Account;
