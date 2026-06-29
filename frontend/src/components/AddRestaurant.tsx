import { useState } from "react";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import { BiCamera, BiLoader } from "react-icons/bi";

interface AddRestaurantProps {
  fetchMyRestaurant: () => void;
}

const AddRestaurant = ({ fetchMyRestaurant }: AddRestaurantProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name || !phone) { toast.error("Name and phone are required"); return; }
    if (!navigator.geolocation) { toast.error("Location access required"); return; }

    setSubmitting(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      formData.append("phone", phone);
      formData.append("latitude", pos.coords.latitude.toString());
      formData.append("longitude", pos.coords.longitude.toString());
      if (image) formData.append("file", image);

      try {
        const { data } = await axios.post(`${restaurantService}/api/restaurant/new`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        toast.success(data.message || "Restaurant submitted for review!");
        fetchMyRestaurant();
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to register");
      } finally {
        setSubmitting(false);
      }
    }, (error) => {
      console.warn("Location detection failed for new restaurant:", error);
      toast.error("Could not obtain location. Please grant permission and try again.");
      setSubmitting(false);
    });
  };

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "var(--bg-base)" }}>
      <div className="mx-auto max-w-md space-y-5">
        <div>
          <h1 className="text-2xl font-black font-display tracking-tight" style={{ color: "var(--color-ink)" }}>
            Register Restaurant
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--color-manifest)" }}>
            Join Forkful and start receiving orders. Your listing will be reviewed within 24 hours.
          </p>
        </div>

        <div className="p-6 space-y-4 glass-card">
          {[
            { label: "Restaurant Name *", value: name, setter: setName, type: "text", placeholder: "e.g. Spice Garden" },
            { label: "Description", value: description, setter: setDescription, type: "text", placeholder: "What do you serve?" },
            { label: "Phone Number *", value: phone, setter: setPhone, type: "number", placeholder: "10-digit mobile number" },
          ].map(({ label, value, setter, type, placeholder }) => (
            <div key={label} className="space-y-1">
              <label className="text-xs font-semibold block animate-pulse" style={{ color: "var(--color-manifest)" }}>
                {label}
              </label>
              <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={(e) => setter(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-xs outline-none transition-all glass-input"
              />
            </div>
          ))}

          {/* Image upload */}
          <div className="space-y-1">
            <label className="text-xs font-semibold block animate-pulse" style={{ color: "var(--color-manifest)" }}>
              Cover Image
            </label>
            <label
              className="flex cursor-pointer items-center gap-3 rounded-xl p-4 transition-all border border-dashed"
              style={{ borderColor: "var(--color-route)", backgroundColor: "var(--color-route-light)" }}
            >
              <BiCamera className="text-xl" style={{ color: "var(--color-route)" }} />
              <span className="text-xs font-bold" style={{ color: "var(--color-route)" }}>
                {image ? image.name : "Upload restaurant photo"}
              </span>
              <input type="file" accept="image/*" hidden onChange={(e) => setImage(e.target.files?.[0] || null)} />
            </label>
          </div>

          <button
            className="w-full rounded-xl py-3.5 text-xs font-bold text-white transition-all active:scale-[0.97] disabled:opacity-50"
            disabled={submitting}
            onClick={handleSubmit}
            style={{ backgroundColor: "var(--color-route)" }}
          >
            {submitting ? <BiLoader className="animate-spin mx-auto text-base" /> : "Submit for Review"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddRestaurant;
