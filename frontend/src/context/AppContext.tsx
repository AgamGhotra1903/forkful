import axios from "axios";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authService, restaurantService } from "../main";
import type { AppContextType, ICart, LocationData, User } from "../types";
import { Toaster } from "react-hot-toast";
import { LocationModal } from "../components/LocationModal";

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

// Robust reverse geocoder with Photon -> Nominatim fallback
async function reverseGeocodeCoords(
  lat: number,
  lon: number
): Promise<{ formattedAddress: string; city: string }> {
  // 1. Try photon.komoot.io (fast, full CORS, accurate)
  try {
    const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`);
    if (res.ok) {
      const data = await res.json();
      const feature = data.features?.[0];
      if (feature?.properties) {
        const p = feature.properties;
        const cityName =
          p.city || p.town || p.district || p.county || p.state || "Current City";
        const parts = [p.name, p.street, p.district, p.city, p.state, p.country].filter(Boolean);
        const formatted =
          parts.length > 0 ? parts.join(", ") : `${cityName}, India`;
        return { formattedAddress: formatted, city: cityName };
      }
    }
  } catch (e) {
    console.warn("Photon lookup failed:", e);
  }

  // 2. Try OpenStreetMap Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
    );
    if (res.ok) {
      const data = await res.json();
      const cityName =
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.suburb ||
        data.address?.state_district ||
        "Current City";
      return {
        formattedAddress: data.display_name || `${cityName}, India`,
        city: cityName,
      };
    }
  } catch (e) {
    console.warn("Nominatim lookup failed:", e);
  }

  return {
    formattedAddress: `Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
    city: "Your Location",
  };
}

// IP-based Geolocation fallback (works instantaneously via client IP without GPS prompts)
async function fetchIpLocation(): Promise<{
  latitude: number;
  longitude: number;
  formattedAddress: string;
  city: string;
} | null> {
  try {
    const res = await fetch("https://ipwho.is/");
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.latitude && data.longitude) {
        const cityName = data.city || data.region || "Current City";
        const parts = [data.city, data.region, data.country].filter(Boolean);
        return {
          latitude: data.latitude,
          longitude: data.longitude,
          formattedAddress: parts.join(", "),
          city: cityName,
        };
      }
    }
  } catch (e) {
    console.warn("ipwho.is lookup failed:", e);
  }
  return null;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  // Initialize location from localStorage if user previously selected or saved one
  const [location, setLocation] = useState<LocationData | null>(() => {
    try {
      const saved = localStorage.getItem("forkful_user_location");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to parse saved location", e);
    }
    return null;
  });

  const [city, setCity] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("forkful_user_city");
      if (saved) return saved;
    } catch (e) {}
    return "Detecting location…";
  });

  const [loadingLocation, setLoadingLocation] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  async function fetchUser() {
    try {
      const token = localStorage.getItem("token");

      const { data } = await axios.get(`${authService}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUser(data);
      setIsAuth(true);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  const [cart, setCart] = useState<ICart[]>([]);
  const [subTotal, setSubTotal] = useState(0);
  const [quantity, setQuantity] = useState(0);

  async function fetchCart() {
    if (!user || user.role !== "customer") return;
    try {
      const { data } = await axios.get(`${restaurantService}/api/cart/all`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setCart(data.cart || []);
      setSubTotal(data.subtotal || 0);
      setQuantity(data.cartLength);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user && user.role === "customer") {
      fetchCart();
    }
  }, [user]);

  // Robust location detector: GPS first, then automatic IP lookup, then graceful Mohali/Chandigarh default
  const detectLocation = async (forceGps = false) => {
    setLoadingLocation(true);

    const tryIpFallback = async () => {
      const ipLoc = await fetchIpLocation();
      if (ipLoc) {
        const locData: LocationData = {
          latitude: ipLoc.latitude,
          longitude: ipLoc.longitude,
          formattedAddress: ipLoc.formattedAddress,
        };
        setLocation(locData);
        setCity(ipLoc.city);
        localStorage.setItem("forkful_user_location", JSON.stringify(locData));
        localStorage.setItem("forkful_user_city", ipLoc.city);
        setLoadingLocation(false);
        return true;
      }
      return false;
    };

    if (!navigator.geolocation) {
      const ok = await tryIpFallback();
      if (!ok && !location) {
        const defaultLoc: LocationData = {
          latitude: 30.6799,
          longitude: 76.7221,
          formattedAddress: "Sector 80, Mohali, Punjab 145308, India",
        };
        setLocation(defaultLoc);
        setCity("Mohali");
        localStorage.setItem("forkful_user_location", JSON.stringify(defaultLoc));
        localStorage.setItem("forkful_user_city", "Mohali");
      }
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const geo = await reverseGeocodeCoords(latitude, longitude);
        const locData: LocationData = {
          latitude,
          longitude,
          formattedAddress: geo.formattedAddress,
        };
        setLocation(locData);
        setCity(geo.city);
        localStorage.setItem("forkful_user_location", JSON.stringify(locData));
        localStorage.setItem("forkful_user_city", geo.city);
        setLoadingLocation(false);
      },
      async (err) => {
        console.warn("GPS lookup denied or unavailable:", err.message);
        const ok = await tryIpFallback();
        if (!ok && !location) {
          const defaultLoc: LocationData = {
            latitude: 30.6799,
            longitude: 76.7221,
            formattedAddress: "Sector 80, Mohali, Punjab 145308, India",
          };
          setLocation(defaultLoc);
          setCity("Mohali");
          localStorage.setItem("forkful_user_location", JSON.stringify(defaultLoc));
          localStorage.setItem("forkful_user_city", "Mohali");
        }
        setLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 6000,
        maximumAge: forceGps ? 0 : 300000,
      }
    );
  };

  const selectLocation = (loc: LocationData, cityName: string) => {
    setLocation(loc);
    setCity(cityName);
    localStorage.setItem("forkful_user_location", JSON.stringify(loc));
    localStorage.setItem("forkful_user_city", cityName);
  };

  // Run initial detection only if not already saved in localStorage
  useEffect(() => {
    const saved = localStorage.getItem("forkful_user_location");
    if (!saved) {
      detectLocation(false);
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        isAuth,
        loading,
        setIsAuth,
        setLoading,
        setUser,
        user,
        location,
        loadingLocation,
        city,
        cart,
        fetchCart,
        quantity,
        subTotal,
        darkMode,
        toggleDarkMode,
        setLocation,
        setCity,
        detectLocation,
        selectLocation,
        isLocationModalOpen,
        setIsLocationModalOpen,
      }}
    >
      {children}

      <LocationModal />

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background: 'var(--bg-elevated, #1A1A1B)',
            color: 'var(--color-ink)',
            border: '1px solid var(--color-rule)',
            borderRadius: '14px',
            fontSize: '13px',
            fontWeight: 600,
            padding: '10px 16px',
          },
          success: { iconTheme: { primary: '#FF5733', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#DC2626', secondary: '#fff' } },
        }}
      />
    </AppContext.Provider>
  );
};

export const useAppData = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppData must be used within AppProvider");
  }
  return context;
};
