import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { IMenuItem, IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import MenuItems from "../components/MenuItems";
import { Skeleton } from "../components/ui";
import { BiBookOpen, BiImage, BiStar, BiChevronRight, BiLike, BiSolidBolt, BiLoader } from "react-icons/bi";
import { useAppData } from "../context/AppContext";
import toast from "react-hot-toast";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { getDeliveryEstimate, getFallbackEstimate } from "../utils/deliveryEstimate";

const getRealRating = (res: IRestaurant) => {
  if (res.ratingCount && res.ratingCount > 0) {
    return ((res.overallRating ?? 0) / res.ratingCount).toFixed(1);
  }
  const id = res._id;
  const n = id.charCodeAt(id.length - 1) + id.charCodeAt(id.length - 2);
  return ((n % 10) / 10 + 4.0).toFixed(1);
};

const getMockCost = (id: string) => {
  const n = id.charCodeAt(id.length - 2) ?? 6;
  return (Math.floor(n / 3) + 2) * 100;
};
const getRealReviewsCount = (res: IRestaurant) => {
  if (res.ratingCount && res.ratingCount > 0) {
    return res.ratingCount.toLocaleString();
  }
  const id = res._id;
  const n = id.charCodeAt(id.length - 3) ?? 5;
  return (n * 37 + 200).toLocaleString();
};

const MOCK_FOOD_IMAGES = [
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1484723091739-30a097e8f929?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=400&auto=format&fit=crop"
];

const getFoodImage = (id: string) => {
  const idx = id.charCodeAt(id.length - 1) % MOCK_FOOD_IMAGES.length;
  return MOCK_FOOD_IMAGES[idx];
};

const isVegItem = (name: string) => {
  const lower = name.toLowerCase();
  return !(lower.includes("chicken") || lower.includes("mutton") || lower.includes("egg") || lower.includes("fish") || lower.includes("beef") || lower.includes("non-veg") || lower.includes("pork") || lower.includes("kebab") || lower.includes("meat") || lower.includes("tandoori"));
};

const RestaurantPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { subTotal, quantity, fetchCart, location } = useAppData();
  const shouldReduceMotion = useReducedMotion();
  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [menuItems, setMenuItems] = useState<IMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  const [profileTab, setProfileTab] = useState<"menu" | "gallery" | "reviews">("menu");
  const [dietFilter, setDietFilter] = useState<"all" | "veg" | "non-veg" | "jain">("all");
  const [customizingItem, setCustomizingItem] = useState<IMenuItem | null>(null);
  const [selectedSize, setSelectedSize] = useState<"regular" | "large">("regular");
  const [selectedSpice, setSelectedSpice] = useState<"mild" | "medium" | "hot">("medium");
  const [extraCheese, setExtraCheese] = useState(false);

  // Reviews Tab state
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Q&A / Ask AI state
  const [askQuery, setAskQuery] = useState("");
  const [askLoading, setAskLoading] = useState(false);
  const [askResult, setAskResult] = useState<{ summary: string; basedOnReviewCount: number; reviews: any[] } | null>(null);
  const [showAskSources, setShowAskSources] = useState(false);

  // Review Form state
  const [newRating, setNewRating] = useState(5);
  const [newReviewText, setNewReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Semantic Menu Search state
  const [menuSearchQuery, setMenuSearchQuery] = useState("");
  const [menuSearchLoading, setMenuSearchLoading] = useState(false);
  const [aiSearchResults, setAiSearchResults] = useState<IMenuItem[] | null>(null);

  const fetchReviews = async () => {
    setReviewsLoading(true);
    try {
      const res = await axios.get(`${restaurantService}/api/reviews/restaurant/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setReviewsList(res.data || []);
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewText.trim()) return;
    setSubmittingReview(true);
    try {
      await axios.post(
        `${restaurantService}/api/reviews`,
        {
          restaurantId: id,
          rating: newRating,
          text: newReviewText,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success("Review submitted! Processing embeddings in background...");
      setNewReviewText("");
      setNewRating(5);
      // Re-fetch immediately to update both the reviews list and the restaurant header stats (rating, count)
      fetchReviews();
      fetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit review. Make sure you have a delivered order from this place.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleAskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askQuery.trim()) return;
    setAskLoading(true);
    try {
      const res = await axios.post(
        `${restaurantService}/api/reviews/ask`,
        {
          restaurantId: id,
          question: askQuery,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setAskResult(res.data);
      setShowAskSources(false); // Reset collapse
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to get review summary");
    } finally {
      setAskLoading(false);
    }
  };

  const handleMenuSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuSearchQuery.trim()) return;
    setMenuSearchLoading(true);
    try {
      const res = await axios.post(`${restaurantService}/api/ai/suggest`, {
        query: menuSearchQuery,
        restaurantId: id
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      const matches = res.data?.matches || [];
      const itemsWithReason = matches.map((m: any) => ({
        ...m.item,
        reason: m.reason
      }));
      setAiSearchResults(itemsWithReason);
    } catch (err) {
      console.error(err);
      toast.error("Semantic menu search failed");
    } finally {
      setMenuSearchLoading(false);
    }
  };

  const clearMenuSearch = () => {
    setMenuSearchQuery("");
    setAiSearchResults(null);
  };

  const fetch = async () => {
    try {
      const [restData, itemData] = await Promise.all([
        axios.get(`${restaurantService}/api/restaurant/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        axios.get(`${restaurantService}/api/item/all/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
      ]);
      setRestaurant(restData.data || null);
      setMenuItems(itemData.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (id) {
      fetch();
      fetchReviews();
    } 
  }, [id]);

  const handleAddClick = (item: IMenuItem) => {
    setCustomizingItem(item);
    setSelectedSize("regular");
    setSelectedSpice("medium");
    setExtraCheese(false);
  };

  const handleConfirmCustomization = async () => {
    if (!customizingItem) return;
    try {
      await axios.post(
        `${restaurantService}/api/cart/add`,
        { restaurantId: id, itemId: customizingItem._id },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success(`${customizingItem.name} customized & added to cart!`);
      await fetchCart();
      setCustomizingItem(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add to cart");
    }
  };

  const categories = ["All", ...Array.from(new Set(menuItems.map((i) => i.category).filter(Boolean) as string[]))];
  const filtered = activeCategory === "All" ? menuItems : menuItems.filter((i) => i.category === activeCategory);

  const filteredByDiet = filtered.filter(item => {
    if (dietFilter === "all") return true;
    const isVeg = isVegItem(item.name);
    if (dietFilter === "veg") return isVeg;
    if (dietFilter === "non-veg") return !isVeg;
    if (dietFilter === "jain") return isVeg && !item.name.toLowerCase().includes("onion") && !item.name.toLowerCase().includes("garlic") && !item.name.toLowerCase().includes("potato");
    return true;
  });

  const bestsellers = menuItems.slice(0, 3);

  const rating = restaurant ? getRealRating(restaurant) : "4.0";
  const restaurantCoords = restaurant?.autoLocation?.coordinates
    ? { latitude: restaurant.autoLocation.coordinates[1], longitude: restaurant.autoLocation.coordinates[0] }
    : null;
  const deliveryTime = (restaurantCoords && location)
    ? getDeliveryEstimate(restaurantCoords, location)
    : restaurant ? getFallbackEstimate(restaurant._id) : "30–45 min";
  const cost = restaurant ? getMockCost(restaurant._id) : 200;
  const reviews = restaurant ? getRealReviewsCount(restaurant) : 0;

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="min-h-screen"
          style={{ backgroundColor: "var(--bg-base)" }}
        >
          <Skeleton className="w-full h-64" style={{ borderRadius: 0 }} />
          <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
            <div className="flex gap-3 mt-4">
              {[1,2,3].map(n => <Skeleton key={n} className="h-16 w-28 rounded-xl" />)}
            </div>
            <div className="mt-8 space-y-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex justify-between gap-6 py-6" style={{ borderBottom: "1px solid var(--color-rule)" }}>
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="w-28 h-28 flex-shrink-0" style={{ borderRadius: 12 }} />
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      ) : !restaurant ? (
        <motion.div
          key="not-found"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="flex h-[60vh] items-center justify-center"
        >
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: "var(--color-muted)" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-route)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <p className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>Restaurant not found</p>
            <p className="text-xs" style={{ color: "var(--color-manifest)" }}>This restaurant may have moved or closed.</p>
            <button onClick={() => navigate("/")} className="mt-2 px-5 h-10 rounded-xl text-sm font-semibold" style={{ backgroundColor: "var(--color-route)", color: "white" }}>
              Back to home
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="min-h-screen"
          style={{ backgroundColor: "var(--bg-base)" }}
        >

      {/* ── Hero ── */}
      <div className="relative w-full overflow-hidden" style={{ height: "280px" }}>
        <img
          src={restaurant.image || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1400&auto=format&fit=crop"}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to top, rgba(11,15,25,0.95) 0%, rgba(11,15,25,0.4) 50%, transparent 100%)",
          }}
        />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>

        {/* Restaurant name overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1 flex items-center gap-2" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
            <span>{restaurant.name}</span>
            {restaurant.isVerified && (
              <span
                title="Aadhaar Verified Restaurant"
                style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: "50%", background: "#1d9bf0", boxShadow: "0 0 0 2.5px rgba(255,255,255,0.75)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-label="Verified">
                  <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            )}
          </h1>
          <p className="text-white/80 text-sm">
            {restaurant.description || "Multi-cuisine · Fresh & fast"}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 -mt-10 relative z-20">
        <div
          className="glass-card rounded-2xl p-5 shadow-lg"
          style={{}}
        >
          {/* Stats row */}
          <div className="flex items-stretch gap-4 mb-4">
            {/* Rating */}
            <div className="flex-1 text-center py-3 rounded-xl" style={{ backgroundColor: "var(--color-signal-light)" }}>
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <span className="text-lg font-bold" style={{ color: "var(--color-signal)" }}>{rating}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--color-signal)" aria-hidden="true">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <p className="text-[10px] font-mono" style={{ color: "var(--color-signal)" }}>{reviews} ratings</p>
            </div>

            {/* Delivery time */}
            <div className="flex-1 text-center py-3 rounded-xl" style={{ backgroundColor: "var(--color-muted)" }}>
              <p className="text-lg font-bold mb-0.5" style={{ color: "var(--color-route)" }}>{deliveryTime}</p>
              <p className="text-[10px] font-mono" style={{ color: "var(--color-route)" }}>est. delivery</p>
            </div>

            {/* Cost */}
            <div className="flex-1 text-center py-3 rounded-xl" style={{ backgroundColor: "rgba(0,0,0,0.03)" }}>
              <p className="text-lg font-bold mb-0.5" style={{ color: "var(--color-ink)" }}>₹{cost}</p>
              <p className="text-[10px] font-mono" style={{ color: "var(--color-manifest)" }}>for two</p>
            </div>
          </div>

          {/* Status + cuisine */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                style={
                  restaurant.isOpen
                    ? { backgroundColor: "var(--color-signal-light)", color: "var(--color-signal)" }
                    : { backgroundColor: "var(--color-rule)", color: "var(--color-manifest)" }
                }
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${restaurant.isOpen ? "animate-pulse" : ""}`}
                  style={{ backgroundColor: restaurant.isOpen ? "var(--color-signal)" : "var(--color-manifest)" }}
                />
                {restaurant.isOpen ? "Open now" : "Currently closed"}
              </span>
            </div>

            {/* Offer chip */}
            {restaurant.isOpen && (
              <div
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ backgroundColor: "var(--color-route)", color: "white" }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                ₹100 OFF on ₹299+
              </div>
            )}
          </div>

          {/* Dual Tabs Selector */}
          <div className="pill-tabs mt-4 relative overflow-visible">
            {[
              { key: "menu", label: "Menu", icon: <BiBookOpen className="text-sm" /> },
              { key: "gallery", label: "Gallery", icon: <BiImage className="text-sm" /> },
              { key: "reviews", label: "Reviews", icon: <BiStar className="text-sm" /> }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setProfileTab(tab.key as any)}
                className="pill-tab relative z-10"
                style={{
                  color: profileTab === tab.key ? "var(--color-ink)" : "var(--color-manifest)",
                  background: "transparent",
                  border: "none",
                  boxShadow: "none"
                }}
              >
                <span className="flex items-center justify-center gap-1.5 z-20">
                  {tab.icon}
                  {tab.label}
                </span>
                {profileTab === tab.key && (
                  <motion.div
                    layoutId="pill-indicator"
                    className="absolute inset-0 -z-10"
                    style={{
                      backgroundColor: "var(--bg-surface)",
                      borderRadius: "var(--radius-pill)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.06) inset"
                    }}
                    transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Contents ── */}
      {profileTab === "menu" && (
        <>
          {/* Sticky category filter */}
          {categories.length > 1 && (
            <div
              className="sticky top-14 z-30 mt-4 glass-panel"
              style={{ borderBottom: "1px solid var(--color-rule)", borderTop: "1px solid var(--color-rule)" }}
            >
              <div
                className="mx-auto max-w-3xl px-4 flex gap-0 overflow-x-auto no-scrollbar"
                role="tablist"
                aria-label="Menu categories"
              >
                {categories.map((cat) => (
                  <button
                    key={cat}
                    role="tab"
                    aria-selected={activeCategory === cat}
                    onClick={() => setActiveCategory(cat)}
                    className="flex-shrink-0 px-5 py-3 text-sm font-semibold transition-colors relative"
                    style={{ color: activeCategory === cat ? "var(--color-route)" : "var(--color-manifest)" }}
                  >
                    {cat}
                    {activeCategory === cat && (
                      <div
                        className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-t"
                        style={{ backgroundColor: "var(--color-route)" }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sticky diet filters */}
          <div className="flex flex-col gap-2 py-2 border-b" style={{ backgroundColor: "var(--bg-base)", borderColor: "var(--color-rule)" }}>
            {/* Semantic Menu Search */}
            <div className="mx-auto max-w-3xl w-full px-4 mb-1">
              <form onSubmit={handleMenuSearchSubmit} className="relative flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Describe what you want to eat... (e.g. 'spicy chicken under 300' or 'something sweet')"
                  value={menuSearchQuery}
                  onChange={(e) => setMenuSearchQuery(e.target.value)}
                  className="w-full h-9 px-4 pr-16 text-xs outline-none transition glass-input input-focus-ring"
                  style={{ borderColor: "var(--color-rule)", borderRadius: "var(--radius-md)" }}
                />
                {menuSearchQuery && (
                  <button
                    type="button"
                    onClick={clearMenuSearch}
                    className="absolute right-20 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-2 cursor-pointer transition-colors"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="submit"
                  disabled={menuSearchLoading}
                  className="w-16 h-9 text-xs font-bold text-white transition-all duration-150 active:scale-95 flex items-center justify-center cursor-pointer shadow-md hover:brightness-105 glow-orange"
                  style={{ backgroundColor: "var(--color-route)", borderRadius: "var(--radius-md)" }}
                >
                  {menuSearchLoading ? <BiLoader className="animate-spin" /> : "Search"}
                </button>
              </form>
            </div>

            {/* Diet filters row */}
            <div className="mx-auto max-w-3xl w-full flex gap-2 px-4 overflow-x-auto no-scrollbar">
              {[
                { key: "all", label: "All Items", icon: null },
                { key: "veg", label: "Veg Only", icon: <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1 flex-shrink-0" /> },
                { key: "non-veg", label: "Non-Veg", icon: <span className="w-2 h-2 rounded-full bg-rose-500 mr-1 flex-shrink-0" /> },
                { key: "jain", label: "Jain Friendly", icon: <span className="w-2 h-2 rounded-full bg-amber-500 mr-1 flex-shrink-0" /> }
              ].map(filter => (
                <button
                  key={filter.key}
                  onClick={() => {
                    setDietFilter(filter.key as any);
                    if (aiSearchResults) clearMenuSearch();
                  }}
                  className="px-3 py-1.5 rounded-full text-[11px] font-bold border transition duration-150 active:scale-95 cursor-pointer flex-shrink-0 flex items-center"
                  style={
                    dietFilter === filter.key && aiSearchResults === null
                      ? {
                          boxShadow: "0 0 0 2px rgba(255,87,51,0.4)",
                          background: "rgba(255,87,51,0.12)",
                          borderColor: "rgba(255,87,51,0.5)",
                          color: "var(--color-route)"
                        }
                      : {
                          border: "1px solid var(--color-rule)",
                          backgroundColor: "transparent",
                          color: "var(--color-manifest)"
                        }
                  }
                >
                  {filter.icon}
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Menu & Pinned Bestsellers */}
          <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
            {/* Pinned Bestsellers */}
            {activeCategory === "All" && dietFilter === "all" && aiSearchResults === null && bestsellers.length > 0 && (
              <div className="p-5 rounded-3xl border bg-orange-500/5" style={{ borderColor: "rgba(255, 87, 51, 0.15)" }}>
                <h3 className="text-xs font-body tracking-wider uppercase font-bold text-orange-600 dark:text-orange-400 mb-3 flex items-center gap-1"><BiSolidBolt className="text-sm" /> Pinned Bestsellers</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {bestsellers.map(item => (
                    <div key={item._id} className="p-3 rounded-2xl glass-card border flex flex-col justify-between" style={{ borderColor: "var(--color-rule)" }}>
                      <div className="relative aspect-[16/10] rounded-xl overflow-hidden mb-2">
                        <img src={item.image || getFoodImage(item._id)} alt={item.name} className="w-full h-full object-cover" />
                        <span className="absolute top-2 left-2 bg-orange-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow">
                          #1 BESTSELLER
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold font-display truncate text-slate-800 dark:text-slate-200">{item.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-mono font-bold">₹{item.price}</p>
                      </div>
                      <button
                        onClick={() => handleAddClick(item)}
                        className="mt-2.5 w-full h-7 rounded-lg text-[10px] font-bold text-white transition active:scale-95 cursor-pointer"
                        style={{ backgroundColor: "var(--color-route)" }}
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main Menu Cards Container */}
            <div className="glass-card rounded-2xl overflow-hidden px-6 pb-6">
              {aiSearchResults !== null ? (
                aiSearchResults.length > 0 ? (
                  <MenuItems isSeller={false} items={aiSearchResults} onItemDeleted={fetch} onAddClick={handleAddClick} />
                ) : (
                  <div className="py-16 text-center">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No dishes match your craving</p>
                    <p className="text-xs text-slate-500 mt-1">Try describing what you're craving differently!</p>
                  </div>
                )
              ) : filteredByDiet.length > 0 ? (
                <MenuItems isSeller={false} items={filteredByDiet} onItemDeleted={fetch} onAddClick={handleAddClick} />
              ) : (
                <div className="py-16 text-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: "var(--color-route-light)" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-route)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                  </div>
                  <p className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>No items match your filters</p>
                  <p className="text-xs mt-1" style={{ color: "var(--color-manifest)" }}>Try relaxing your dietary filters above.</p>
                </div>
              )}
            </div>

            {/* Smart Cross-Selling Recommendations */}
            {menuItems.length > 3 && (
              <div className="mt-8 pt-6 border-t" style={{ borderColor: "var(--color-rule)" }}>
                <h3 className="text-xs font-body tracking-wider uppercase font-bold text-slate-400 mb-3">Customers Also Ordered</h3>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
                  {menuItems.slice(3, 7).map(item => (
                    <div
                      key={item._id}
                      className="flex-shrink-0 w-52 p-3 rounded-2xl border glass-card flex items-center gap-3 transition hover:translate-y-[-2px]"
                      style={{ borderColor: "var(--color-rule)" }}
                    >
                      <img src={item.image || getFoodImage(item._id)} alt={item.name} className="w-10 h-10 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold font-display truncate text-slate-800 dark:text-slate-200">{item.name}</h4>
                        <p className="text-[10px] font-mono font-bold text-orange-500">₹{item.price}</p>
                      </div>
                      <button
                        onClick={() => handleAddClick(item)}
                        className="px-2.5 py-1 bg-orange-500/10 text-orange-500 rounded-lg text-[10px] font-bold active:scale-95 transition cursor-pointer"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {profileTab === "gallery" && (
        <div className="mx-auto max-w-3xl px-4 py-8">
          <h3 className="text-xs font-body tracking-wider uppercase font-bold text-slate-400 mb-4">Kitchen & Presentation Gallery</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=400&q=80",
              "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=400&q=80",
              "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=400&q=80",
              "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80",
              "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80",
              "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=400&q=80"
            ].map((imgUrl, i) => (
              <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-black/10 shadow-sm">
                <img src={imgUrl} alt="Kitchen prep" className="w-full h-full object-cover hover:scale-105 transition duration-300" />
              </div>
            ))}
          </div>
        </div>
      )}

      {profileTab === "reviews" && (
        <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
          {/* Ask AI Summarizer Box */}
          <div className="p-5 border space-y-4 shadow-sm glass-card" style={{ borderColor: "var(--color-rule)", borderRadius: "var(--radius-lg)" }}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-orange-500">Reviews Assistant</span>
              <span className="bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[8px] font-mono font-bold px-2 py-0.5 rounded-full border border-orange-500/20">AI Grounded</span>
            </div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Ask about this place</h4>
            <form onSubmit={handleAskSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. 'How is the packaging?' or 'Are portions big?'"
                value={askQuery}
                onChange={(e) => setAskQuery(e.target.value)}
                maxLength={200}
                className="flex-1 h-9 px-3 text-xs outline-none transition glass-input input-focus-ring"
                style={{ borderColor: "var(--color-rule)", borderRadius: "var(--radius-md)" }}
              />
              <button
                type="submit"
                disabled={askLoading}
                className="px-4 h-9 text-xs font-bold text-white transition-all duration-150 active:scale-95 flex items-center justify-center cursor-pointer shadow-md hover:brightness-105 glow-orange"
                style={{ backgroundColor: "var(--color-route)", borderRadius: "var(--radius-md)" }}
              >
                {askLoading ? "Analyzing..." : "Ask"}
              </button>
            </form>

            {askResult && (
              <div className="mt-4 p-4 bg-orange-500/5 border border-orange-500/10 space-y-3 animate-fade-in" style={{ borderRadius: "var(--radius-md)" }}>
                <div className="flex justify-between items-start">
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {askResult.summary}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 text-[10px] text-slate-400 font-mono">
                  <span>Based on {askResult.basedOnReviewCount} matching reviews</span>
                  {askResult.basedOnReviewCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAskSources(!showAskSources)}
                      className="text-orange-500 font-bold hover:underline cursor-pointer"
                    >
                      {showAskSources ? "Hide Sources" : "View Sources"}
                    </button>
                  )}
                </div>

                {showAskSources && askResult.reviews && askResult.reviews.length > 0 && (
                  <div className="mt-2 space-y-2 border-t pt-2 max-h-40 overflow-y-auto no-scrollbar" style={{ borderColor: "var(--color-rule)" }}>
                    {askResult.reviews.map((srcReview: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 space-y-1">
                        <div className="flex justify-between items-center text-[9px] text-slate-400">
                          <span>Review #{idx + 1}</span>
                          <span className="text-amber-500 font-bold">★ {srcReview.rating}</span>
                        </div>
                        <p className="text-[11px] leading-snug text-slate-600 dark:text-slate-400">
                          {srcReview.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Write a Review Submission Form */}
          <div className="p-5 border space-y-4 shadow-sm glass-card" style={{ borderColor: "var(--color-rule)", borderRadius: "var(--radius-lg)" }}>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Write a Review</h4>
            <form onSubmit={handleReviewSubmit} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-400 uppercase">Rating:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((stars) => (
                    <button
                      key={stars}
                      type="button"
                      onClick={() => setNewRating(stars)}
                      className="text-lg focus:outline-none transition-all duration-150 hover:scale-110 active:scale-90 cursor-pointer"
                    >
                      <BiStar className={stars <= newRating ? "text-amber-500 fill-amber-500 text-sm" : "text-slate-300 dark:text-slate-700 text-sm"} />
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                placeholder="Share your dining experience... Note: only reviews from delivered orders are verified."
                value={newReviewText}
                onChange={(e) => setNewReviewText(e.target.value)}
                maxLength={1000}
                rows={3}
                required
                className="w-full p-3 text-xs outline-none transition resize-none glass-input input-focus-ring"
                style={{ borderColor: "var(--color-rule)", borderRadius: "var(--radius-md)" }}
              />
              <button
                type="submit"
                disabled={submittingReview}
                className="w-full h-10 text-xs font-bold text-white transition-all duration-150 active:scale-[0.98] cursor-pointer shadow-md hover:brightness-105 glow-orange"
                style={{ backgroundColor: "var(--color-route)", borderRadius: "var(--radius-md)" }}
              >
                {submittingReview ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          </div>

          {/* Social Reviews List Header */}
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-body tracking-wider uppercase font-bold text-slate-400">Social Reviews</h3>
            <span className="text-xs font-bold text-orange-500">Filter: Most Helpful</span>
          </div>

          {/* Reviews List */}
          <div className="space-y-4">
            {reviewsLoading ? (
              <p className="text-xs text-slate-400 font-mono text-center py-4">Loading reviews...</p>
            ) : reviewsList.length > 0 ? (
              reviewsList.map((review) => (
                <div key={review._id} className="p-5 rounded-2xl glass-card border space-y-2.5 animate-fade-in" style={{ borderColor: "var(--color-rule)" }}>
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {review.userId?.name || "Verified Customer"}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(review.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-amber-500 flex gap-0.5">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <BiStar key={i} className="fill-amber-500 text-sm" />
                      ))}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{review.text}</p>
                  <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: "var(--color-rule)" }}>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      Verified Purchase
                    </span>
                    <button
                      onClick={() => toast.success("Marked review as helpful")}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <span className="flex items-center gap-1"><BiLike className="text-xs" /> Helpful (0)</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 border border-dashed rounded-2xl" style={{ borderColor: "var(--color-rule)" }}>
                <p className="text-xs text-slate-400 font-mono">No customer reviews yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Expandable Detail Sheet / Customization Modal ── */}
      <AnimatePresence>
        {customizingItem && (
          <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden">
            {/* Dimmer Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              transition={{ duration: 0.2 }}
              onClick={() => setCustomizingItem(null)}
              className="absolute inset-0 bg-black/60 cursor-pointer"
            />

            {/* Modal card itself */}
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={shouldReduceMotion ? { duration: 0.1 } : { type: "spring", stiffness: 300, damping: 28, delay: 0.05 }}
              className="relative w-full max-w-lg rounded-t-[32px] p-6 glass-panel border-t shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto z-10 glass-card"
              style={{
                borderColor: "rgba(255,255,255,0.15)",
                borderTopWidth: "1px",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)"
              }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-orange-500">Configure Item</span>
                  <h3 className="text-lg font-black font-display mt-1 text-slate-800 dark:text-slate-100">{customizingItem.name}</h3>
                  <p className="text-xs text-slate-500">{customizingItem.description}</p>
                </div>
                <button
                  onClick={() => setCustomizingItem(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 active:scale-90 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <hr style={{ borderColor: "var(--color-rule)" }} />

              {/* Customization Options */}
              <div className="space-y-5">
                {/* Option 1: Portion Size */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">Portion Size</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: "regular", label: "Regular Size", desc: "Standard portion" },
                      { key: "large", label: "Large Size (+₹60)", desc: "Perfect for sharing" }
                    ].map(size => (
                      <button
                        key={size.key}
                        onClick={() => setSelectedSize(size.key as any)}
                        className={`p-3 rounded-2xl border text-left transition active:scale-[0.98] cursor-pointer ${selectedSize === size.key ? "border-orange-500 bg-orange-500/5 text-orange-600 dark:text-orange-400" : "border-slate-200 dark:border-slate-800"}`}
                      >
                        <p className="text-xs font-bold">{size.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{size.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Option 2: Spice Level */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">Spice Level</h4>
                  <div className="flex gap-2">
                    {[
                      { key: "mild", label: "Mild 🌶️" },
                      { key: "medium", label: "Medium 🌶️🌶️" },
                      { key: "hot", label: "Hot 🌶️🌶️🌶️" }
                    ].map(spice => (
                      <button
                        key={spice.key}
                        onClick={() => setSelectedSpice(spice.key as any)}
                        className={`flex-1 py-2.5 rounded-xl border text-center text-xs font-bold transition active:scale-95 cursor-pointer ${selectedSpice === spice.key ? "border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400" : "border-slate-200 dark:border-slate-800 text-slate-500"}`}
                      >
                        {spice.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Option 3: Add-ons */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">Add-ons</h4>
                  <button
                    onClick={() => setExtraCheese(!extraCheese)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition active:scale-[0.98] cursor-pointer ${extraCheese ? "border-orange-500 bg-orange-500/5 text-orange-600 dark:text-orange-400" : "border-slate-200 dark:border-slate-800"}`}
                  >
                    <div>
                      <p className="text-xs font-bold">Extra Cream / Cheese</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Rich and extra creamy style</p>
                    </div>
                    <span>+₹45</span>
                  </button>
                </div>
              </div>

              {/* Confirm CTA */}
              <button
                onClick={handleConfirmCustomization}
                className="w-full h-12 text-sm font-bold text-white rounded-2xl transition active:scale-[0.98] cursor-pointer shadow-md hover:brightness-105"
                style={{ backgroundColor: "var(--color-route)" }}
              >
                Add to Basket (₹{customizingItem.price + (selectedSize === "large" ? 60 : 0) + (extraCheese ? 45 : 0)})
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Sticky Floating Cart Bar ── */}
      {quantity > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-4 right-4 z-40 max-w-md mx-auto animate-slide-up">
          <div
            className="p-4 rounded-2xl shadow-xl flex items-center justify-between text-white border"
            style={{
              background: "linear-gradient(135deg, var(--color-route) 0%, var(--color-thermal) 100%)",
              backdropFilter: "blur(20px) saturate(180%)",
              borderTop: "1px solid var(--color-rule)",
              borderColor: "rgba(255, 255, 255, 0.2)"
            }}
          >
            <div>
              <p className="text-[10px] font-body tracking-wider uppercase font-bold text-white/80">{quantity} {quantity === 1 ? "Item" : "Items"} Added</p>
              <p className="text-sm font-bold font-body">₹{subTotal} total amount</p>
            </div>
            <button
              onClick={() => navigate("/cart")}
              className="px-4 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition shadow-md"
            >
              View Cart <BiChevronRight className="text-sm font-bold" />
            </button>
          </div>
        </div>
      )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RestaurantPage;
