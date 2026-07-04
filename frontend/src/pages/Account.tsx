import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import toast from "react-hot-toast";
import { BiCycling, BiHeart, BiStar } from "react-icons/bi";

const Account = () => {
  const { user, setUser, setIsAuth } = useAppData();
  const navigate = useNavigate();



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
      title: "Your activity",
      items: [
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

        {/* ── Stats row ── */}
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



        {/* ── Menu sections ── */}
        {MENU_SECTIONS.map((section) => (
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
