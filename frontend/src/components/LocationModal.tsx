import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BiSearch, BiX, BiCurrentLocation, BiMapPin, BiNavigation, BiCheck, BiLoaderAlt } from "react-icons/bi";
import { useAppData } from "../context/AppContext";
import type { LocationData } from "../types";
import toast from "react-hot-toast";

interface PresetCity {
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

const PRESET_CITIES: PresetCity[] = [
  {
    name: "Mohali / Chandigarh",
    state: "Punjab / Tricity",
    latitude: 30.6799,
    longitude: 76.7221,
    formattedAddress: "Sector 80, Mohali, Punjab 145308, India",
  },
  {
    name: "New Delhi",
    state: "Delhi NCR",
    latitude: 28.6139,
    longitude: 77.2090,
    formattedAddress: "Connaught Place, New Delhi, 110001, India",
  },
  {
    name: "Prayagraj",
    state: "Uttar Pradesh",
    latitude: 25.4358,
    longitude: 81.8463,
    formattedAddress: "Civil Lines, Prayagraj, Uttar Pradesh 211001, India",
  },
  {
    name: "Bengaluru",
    state: "Karnataka",
    latitude: 12.9352,
    longitude: 77.6245,
    formattedAddress: "Koramangala, Bengaluru, Karnataka 560034, India",
  },
  {
    name: "Mumbai",
    state: "Maharashtra",
    latitude: 19.0596,
    longitude: 72.8295,
    formattedAddress: "Bandra West, Mumbai, Maharashtra 400050, India",
  },
];

export const LocationModal: React.FC = () => {
  const {
    location,
    city,
    isLocationModalOpen,
    setIsLocationModalOpen,
    detectLocation,
    selectLocation,
    loadingLocation,
  } = useAppData();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationData[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`
        );
        if (res.ok) {
          const data = await res.json();
          const items: LocationData[] = (data.features || []).map((f: any) => {
            const p = f.properties || {};
            const [lng, lat] = f.geometry.coordinates;
            const parts = [p.name, p.street, p.district, p.city, p.state, p.country].filter(Boolean);
            const address = parts.length > 0 ? parts.join(", ") : p.name || query;
            return {
              latitude: lat,
              longitude: lng,
              formattedAddress: address,
            };
          });
          setResults(items);
        }
      } catch (err) {
        console.warn("Photon search error:", err);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query]);

  if (!isLocationModalOpen) return null;

  const handleSelect = (loc: LocationData, cityName?: string) => {
    const derivedCity =
      cityName ||
      loc.formattedAddress.split(",")[0] ||
      "Selected Location";
    selectLocation(loc, derivedCity);
    toast.success(`Location set to ${derivedCity}!`);
    setIsLocationModalOpen(false);
  };

  const handleGpsDetect = async () => {
    await detectLocation(true);
    toast.success("Location updated via GPS!");
    setIsLocationModalOpen(false);
  };

  const handleIpDetect = async () => {
    await detectLocation(false);
    toast.success("Location updated via Network!");
    setIsLocationModalOpen(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsLocationModalOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border shadow-2xl z-10"
          style={{
            backgroundColor: "var(--bg-elevated, #18181B)",
            borderColor: "var(--color-rule, rgba(255,255,255,0.1))",
            color: "var(--color-ink, #ffffff)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--color-rule, rgba(255,255,255,0.08))" }}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BiMapPin size={18} className="text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">Select Delivery Location</h3>
                <p className="text-xs text-muted-foreground opacity-75">
                  Discover local restaurants & real-time delivery estimates
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsLocationModalOpen(false)}
              className="rounded-lg p-1.5 opacity-60 hover:opacity-100 hover:bg-white/5 transition"
              aria-label="Close"
            >
              <BiX size={20} />
            </button>
          </div>

          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Search Input */}
            <div className="relative">
              <BiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 text-base" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search area, landmark or street…"
                autoFocus
                className="w-full rounded-xl pl-10 pr-10 py-2.5 text-xs font-medium border bg-white/[0.03] focus:bg-white/[0.06] focus:outline-none transition"
                style={{
                  borderColor: "var(--color-rule, rgba(255,255,255,0.15))",
                }}
              />
              {searching ? (
                <BiLoaderAlt className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-primary text-base" />
              ) : query ? (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100"
                >
                  <BiX size={16} />
                </button>
              ) : null}
            </div>

            {/* Live Search Results */}
            {results.length > 0 && (
              <div className="space-y-1.5 rounded-xl border p-2 bg-white/[0.02]" style={{ borderColor: "var(--color-rule, rgba(255,255,255,0.08))" }}>
                <span className="px-2 text-[10px] uppercase font-bold tracking-wider opacity-50">
                  Search Results
                </span>
                {results.map((res, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect(res)}
                    className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition hover:bg-white/5"
                  >
                    <BiMapPin className="mt-0.5 shrink-0 text-primary" size={14} />
                    <span className="line-clamp-2 leading-relaxed opacity-90">{res.formattedAddress}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Quick Auto-Detect Buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={handleGpsDetect}
                disabled={loadingLocation}
                className="flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98] disabled:opacity-50"
                style={{ borderColor: "var(--color-rule, rgba(255,255,255,0.12))" }}
              >
                {loadingLocation ? (
                  <BiLoaderAlt className="animate-spin text-primary" size={15} />
                ) : (
                  <BiCurrentLocation className="text-primary" size={15} />
                )}
                <span>Exact GPS</span>
              </button>

              <button
                onClick={handleIpDetect}
                disabled={loadingLocation}
                className="flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98] disabled:opacity-50"
                style={{ borderColor: "var(--color-rule, rgba(255,255,255,0.12))" }}
              >
                <BiNavigation className="text-emerald-400" size={15} />
                <span>Auto-Detect (IP)</span>
              </button>
            </div>

            {/* Preset Major Cities */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">
                  Popular Hubs & Cities
                </span>
                <span className="text-[10px] text-primary font-medium">Instant Switch</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {PRESET_CITIES.map((c) => {
                  const isCurrent = city?.toLowerCase().includes(c.name.split("/")[0].trim().toLowerCase());
                  return (
                    <button
                      key={c.name}
                      onClick={() =>
                        handleSelect(
                          {
                            latitude: c.latitude,
                            longitude: c.longitude,
                            formattedAddress: c.formattedAddress,
                          },
                          c.name
                        )
                      }
                      className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs transition active:scale-[0.99] ${
                        isCurrent
                          ? "border-primary/50 bg-primary/10 font-bold"
                          : "hover:bg-white/5 border-transparent bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold ${
                            isCurrent ? "bg-primary text-white" : "bg-white/5 opacity-70"
                          }`}
                        >
                          🏙️
                        </div>
                        <div>
                          <div className="font-semibold">{c.name}</div>
                          <div className="text-[10px] opacity-60">{c.state}</div>
                        </div>
                      </div>
                      {isCurrent && (
                        <div className="flex items-center gap-1 text-[11px] text-primary">
                          <BiCheck size={16} />
                          <span>Active</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current Selected Footer */}
            {location && (
              <div
                className="rounded-xl border p-3 text-[11px] flex items-start gap-2 bg-white/[0.01]"
                style={{ borderColor: "var(--color-rule, rgba(255,255,255,0.06))" }}
              >
                <BiMapPin className="text-primary mt-0.5 shrink-0" size={14} />
                <div className="flex-1 truncate">
                  <div className="font-semibold text-muted-foreground opacity-60">Currently Selected:</div>
                  <div className="font-mono truncate opacity-90">{location.formattedAddress}</div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
