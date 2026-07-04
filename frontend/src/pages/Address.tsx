import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { restaurantService } from "../main";
import L from "leaflet";
import { LuLocateFixed } from "react-icons/lu";
import { BiLoader, BiPlus, BiTrash, BiMapPin, BiPhone } from "react-icons/bi";

// Fix leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Address {
  _id: string;
  formattedAddress: string;
  mobile: number;
}

// Click-to-select location
const LocationPicker = ({
  setLocation,
}: {
  setLocation: (lat: number, lng: number) => void;
}) => {
  useMapEvents({
    click(e) {
      setLocation(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Locate me button
const LocateMeButton = ({
  onLocate,
}: {
  onLocate: (lat: number, lng: number) => void;
}) => {
  const map = useMap();
  const locateUser = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.flyTo([latitude, longitude], 16, { animate: true });
        onLocate(latitude, longitude);
      },
      () => toast.error("Location permission denied")
    );
  };
  return (
    <button
      onClick={locateUser}
      type="button"
      className="absolute right-3 top-3 z-[1000] flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-bold shadow-md hover:scale-[0.98] transition active:scale-[0.95]"
      style={{ border: "1px solid var(--color-rule)", color: "var(--color-ink)" }}
    >
      <LuLocateFixed size={14} style={{ color: "var(--color-route)" }} />
      Use Current Location
    </button>
  );
};

const AddAddressPage = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [mobile, setMobile] = useState("");
  const [formattedAddress, setFormattedAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Reverse geocoding
  const fetchFormattedAddress = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      setFormattedAddress(data.display_name || "");
    } catch {
      toast.error("Failed to fetch address details");
    }
  };

  const setLocation = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    fetchFormattedAddress(lat, lng);
  };

  // Fetch addresses
  const fetchAddresses = async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/address/all`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setAddresses(data || []);
    } catch {
      toast.error("Failed to load addresses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  // Add address
  const addAddress = async () => {
    if (
      !mobile ||
      !formattedAddress ||
      latitude === null ||
      longitude === null
    ) {
      toast.error("Please select a location on the map first");
      return;
    }
    try {
      setAdding(true);
      await axios.post(
        `${restaurantService}/api/address/new`,
        {
          formattedAddress,
          mobile,
          latitude,
          longitude,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      toast.success("Address saved successfully");
      setMobile("");
      setFormattedAddress("");
      setLatitude(null);
      setLongitude(null);
      fetchAddresses();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save address");
    } finally {
      setAdding(false);
    }
  };

  // Delete address
  const deleteAddress = async (id: string) => {
    try {
      setDeletingId(id);
      await axios.delete(`${restaurantService}/api/address/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      toast.success("Address deleted");
      fetchAddresses();
    } catch {
      toast.error("Failed to delete address");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: "var(--bg-base)" }}>
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <h1 className="text-2xl font-black font-display tracking-tight" style={{ color: "var(--color-ink)" }}>
          Delivery Addresses
        </h1>

        {/* Map Card */}
        <div
          className="relative h-96 w-full overflow-hidden rounded-2xl border shadow-sm"
          style={{ borderColor: "var(--color-rule)" }}
        >
          <MapContainer
            center={[latitude || 28.6139, longitude || 77.209]}
            zoom={13}
            className="h-full w-full"
            style={{ height: "100%", width: "100%", zIndex: 1 }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              subdomains="abcd"
              maxZoom={19}
            />
            <LocationPicker setLocation={setLocation} />
            <LocateMeButton onLocate={setLocation} />
            {latitude && longitude && <Marker position={[latitude, longitude]} />}
          </MapContainer>
        </div>

        {/* Selected address panel */}
        {formattedAddress && (
          <div 
            className="rounded-xl border p-4 text-xs font-semibold flex items-start gap-2 shadow-inner"
            style={{ backgroundColor: "var(--color-signal-light)", borderColor: "var(--color-signal)", color: "var(--color-signal)" }}
          >
            <BiMapPin className="text-base flex-shrink-0" />
            <div className="space-y-0.5">
              <span className="uppercase text-[9px] font-mono tracking-wider opacity-85 block">Selected Location</span>
              <p className="leading-relaxed">{formattedAddress}</p>
            </div>
          </div>
        )}

        {/* Form panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end glass-card p-5 rounded-2xl">
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-bold" style={{ color: "var(--color-manifest)" }}>MOBILE NUMBER</label>
            <input
              type="number"
              placeholder="Enter 10-digit mobile number..."
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full text-xs px-4 py-3 rounded-xl outline-none transition glass-input"
            />
          </div>
          <button
            disabled={adding}
            onClick={addAddress}
            className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: "var(--color-route)" }}
          >
            {adding ? <BiLoader className="animate-spin" /> : <BiPlus />}
            Save Address
          </button>
        </div>

        {/* Saved Addresses List */}
        <div className="space-y-3">
          <h2 className="text-base font-bold" style={{ color: "var(--color-ink)" }}>Saved Addresses</h2>
          {loading ? (
            <div className="py-8 text-center text-xs font-mono" style={{ color: "var(--color-ghost)" }}>
              Loading addresses...
            </div>
          ) : addresses.length === 0 ? (
            <div className="py-8 text-center text-xs" style={{ color: "var(--color-ghost)" }}>
              No addresses saved. Pin your location on the map above to add one.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {addresses.map((addr) => (
                <div
                  key={addr._id}
                  className="flex items-start justify-between rounded-xl p-4 glass-card relative group"
                >
                  <div className="space-y-1.5 min-w-0 pr-8">
                    <div className="flex items-start gap-1.5 text-xs font-semibold leading-relaxed" style={{ color: "var(--color-ink)" }}>
                      <BiMapPin className="mt-0.5 text-sm flex-shrink-0" style={{ color: "var(--color-route)" }} />
                      <p className="line-clamp-2">{addr.formattedAddress}</p>
                    </div>
                    <p className="text-[10px] font-mono flex items-center gap-1 ml-5" style={{ color: "var(--color-ghost)" }}>
                      <BiPhone /> {addr.mobile}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteAddress(addr._id)}
                    disabled={deletingId === addr._id}
                    className="absolute top-3 right-3 p-1.5 text-red-500 hover:bg-red-50/15 rounded-lg transition disabled:opacity-50"
                  >
                    {deletingId === addr._id ? (
                      <BiLoader size={14} className="animate-spin" />
                    ) : (
                      <BiTrash size={14} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddAddressPage;
