import { useState } from "react";
import { useAppData } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { authService } from "../main";
import ForkfulLogo from "../components/ForkfulLogo";

type Role = "customer" | "rider" | "seller" | null;
const SelectRole = () => {
  const [role, setRole] = useState<Role>(null);
  const { setUser, darkMode } = useAppData();
  const navigate = useNavigate();

  const roles: Role[] = ["customer", "rider", "seller"];

  const addRole = async () => {
    try {
      const { data } = await axios.put(
        `${authService}/api/auth/add/role`,
        { role },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      localStorage.setItem("token", data.token);
      setUser(data.user);

      navigate("/", { replace: true });
    } catch (error) {
      alert("Something went wrong");
      console.log(error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: "var(--bg-base)" }}>
      <div className="w-full max-w-sm space-y-6 p-8 glass-card" style={{ borderRadius: "var(--radius-lg)" }}>
        <div className="flex flex-col items-center justify-center gap-2 mb-2">
          <ForkfulLogo size={40} dark={darkMode} />
          <span style={{ fontFamily: "var(--font-display, system-ui)", fontWeight: 800, letterSpacing: "-0.04em", fontSize: "1.25rem", lineHeight: 1 }}>
            <span style={{ color: darkMode ? "#F0EEE9" : "#111111" }}>Fork</span>
            <span style={{
              color: darkMode ? "#FF6B45" : "#FF5733",
              textShadow: darkMode ? "0 0 20px rgba(255, 107, 69, 0.4)" : "none"
            }}>ful</span>
          </span>
        </div>

        <h1 className="text-center text-xl font-bold font-display" style={{ color: "var(--color-ink)" }}>
          Choose Your Role
        </h1>

        <div className="space-y-4">
          {roles.map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`w-full px-4 py-3 text-xs font-bold capitalize transition-all duration-200 active:scale-[0.98] cursor-pointer border hover:-translate-y-[1px]`}
              style={{
                backgroundColor: role === r ? "var(--color-route)" : "rgba(255,255,255,0.02)",
                borderColor: role === r ? "transparent" : "var(--color-rule)",
                color: role === r ? "white" : "var(--color-ink)",
                borderRadius: "var(--radius-md)",
                boxShadow: role === r ? "0 4px 12px rgba(255,87,51,0.25)" : "none"
              }}
            >
              Continue as {r}
            </button>
          ))}
        </div>
        <button
          disabled={!role}
          onClick={addRole}
          className={`w-full px-4 py-3.5 text-xs font-black transition-all duration-200 active:scale-[0.97] cursor-pointer hover:brightness-105 glow-orange ${
            role
              ? "text-white shadow-md"
              : "bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed"
          }`}
          style={{
            backgroundColor: role ? "var(--color-route)" : undefined,
            borderRadius: "var(--radius-md)"
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default SelectRole;
