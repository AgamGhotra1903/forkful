import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AppProvider } from "./context/AppContext.tsx";
import "leaflet/dist/leaflet.css";
import { SocketProvider } from "./context/SocketContext.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";

export const authService = import.meta.env.VITE_AUTH_SERVICE_URL || "http://localhost:5001";
export const restaurantService = import.meta.env.VITE_RESTAURANT_SERVICE_URL || "http://localhost:5002";
export const riderService = import.meta.env.VITE_RIDER_SERVICE_URL || "http://localhost:5003";
export const adminService = import.meta.env.VITE_ADMIN_SERVICE_URL || "http://localhost:5004";
export const utilsService = import.meta.env.VITE_UTILS_SERVICE_URL || "http://localhost:5005";
export const realtimeService = import.meta.env.VITE_REALTIME_SERVICE_URL || "http://localhost:5006";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || "709759106219-sb2qbf2ufh8pe0d02bkl06cs6of1c2rc.apps.googleusercontent.com"}>
      <AppProvider>
        <ThemeProvider>
          <SocketProvider>
            <App />
          </SocketProvider>
        </ThemeProvider>
      </AppProvider>
    </GoogleOAuthProvider>
  </StrictMode>
);
