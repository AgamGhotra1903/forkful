import { useState } from "react";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import { BiCamera, BiLoader } from "react-icons/bi";

interface AddMenuItemProps {
  onItemAdded: () => void;
}

const AddMenuItem = ({ onItemAdded }: AddMenuItemProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name || !price) { toast.error("Name and price are required"); return; }
    if (!image) { toast.error("Please upload an item photo"); return; }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("price", price);
    if (image) formData.append("file", image);

    setSubmitting(true);
    try {
      await axios.post(`${restaurantService}/api/item/new`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      toast.success("Item added to menu!");
      setName(""); setDescription(""); setPrice(""); setImage(null);
      onItemAdded();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add item");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-4 glass-card">
      <h2 className="text-base font-bold font-display" style={{ color: "var(--color-ink)" }}>
        Add New Menu Item
      </h2>

      {[
        { label: "Item Name *", value: name, setter: setName, type: "text", placeholder: "e.g. Butter Chicken" },
        { label: "Description", value: description, setter: setDescription, type: "text", placeholder: "What's in it?" },
        { label: "Price (₹) *", value: price, setter: setPrice, type: "number", placeholder: "e.g. 299" },
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
          Item Photo
        </label>
        <label
          className="flex cursor-pointer items-center gap-3 rounded-xl p-4 transition-all border border-dashed"
          style={{ borderColor: "var(--color-route)", backgroundColor: "var(--color-route-light)" }}
        >
          <BiCamera className="text-xl" style={{ color: "var(--color-route)" }} />
          <span className="text-xs font-bold" style={{ color: "var(--color-route)" }}>
            {image ? image.name : "Upload item photo"}
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
        {submitting ? <BiLoader className="animate-spin mx-auto text-base" /> : "Add to Menu"}
      </button>
    </div>
  );
};

export default AddMenuItem;
