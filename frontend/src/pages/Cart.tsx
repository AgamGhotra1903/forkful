import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useState, useEffect } from "react";
import type { ICart, IMenuItem, IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import { BiInfoCircle, BiCheckCircle, BiGift, BiTime, BiChevronRight } from "react-icons/bi";

const PAIRING_RULES: Record<string, string[]> = {
  "butter chicken": ["naan", "lassi", "rice", "roti"],
  "paneer": ["naan", "roti", "lassi", "pulao"],
  "chicken": ["naan", "roti", "rice", "lassi", "coke"],
  "dal": ["naan", "roti", "rice", "lassi"],
  "tikka": ["naan", "roti", "lassi", "coke"],
  "curry": ["naan", "roti", "rice", "lassi"],
  "pizza": ["garlic bread", "coke", "fries", "pepsi"],
  "burger": ["fries", "coke", "shake"],
  "noodles": ["spring roll", "manchurian", "coke"],
  "biryani": ["raita", "coke", "lassi", "salan"],
};

const Cart = () => {
  const { cart, subTotal, quantity, fetchCart, user } = useAppData();
  const navigate = useNavigate();
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [clearingCart, setClearingCart] = useState(false);

  // Coupon Engine States
  const [couponCode, setCouponCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Recommendations & Pairings state
  const [pairings, setPairings] = useState<IMenuItem[]>([]);

  useEffect(() => {
    const fetchMenuAndPairings = async () => {
      if (!cart || cart.length === 0) return;
      const firstItem = cart[0];
      const rest = firstItem.restaurantId as IRestaurant;
      const resId = typeof rest === "object" && rest !== null ? rest._id : rest;
      if (!resId) return;

      try {
        const { data } = await axios.get(`${restaurantService}/api/item/all/${resId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const items: IMenuItem[] = data || [];

        // Derive pairings
        const cartItemNames = cart.map(ci => (ci.itemId as IMenuItem).name.toLowerCase());
        const cartItemIds = cart.map(ci => (ci.itemId as IMenuItem)._id);
        const recommended: IMenuItem[] = [];

        for (const cartItem of cart) {
          const nameLower = (cartItem.itemId as IMenuItem).name.toLowerCase();
          
          for (const [key, targets] of Object.entries(PAIRING_RULES)) {
            if (nameLower.includes(key)) {
              for (const target of targets) {
                const match = items.find((mi: IMenuItem) => 
                  mi.name.toLowerCase().includes(target) &&
                  !cartItemIds.includes(mi._id) &&
                  !cartItemNames.includes(mi.name.toLowerCase()) &&
                  !recommended.some(r => r._id === mi._id)
                );
                if (match) recommended.push(match);
              }
            }
          }
        }

        // Fallback: if no contextual pairings found, suggest general items not in cart
        if (recommended.length === 0) {
          const general = items.filter((mi: IMenuItem) => !cartItemIds.includes(mi._id));
          setPairings(general.slice(0, 3));
        } else {
          setPairings(recommended.slice(0, 3));
        }
      } catch (err) {
        console.error("Failed to load restaurant menu for pairings:", err);
      }
    };

    fetchMenuAndPairings();
  }, [cart]);

  if (!cart || cart.length === 0) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: "var(--bg-base)" }}
      >
        <div className="text-center space-y-4 max-w-xs">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "var(--color-route-light)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-route)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
            </svg>
          </div>
          <div>
            <p className="text-xl font-bold" style={{ color: "var(--color-ink)" }}>Your cart is empty</p>
            <p className="text-sm mt-1.5" style={{ color: "var(--color-manifest)" }}>
              Add items from a restaurant to get started.
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="btn-primary mt-4 px-8 h-12 rounded-2xl text-sm font-bold transition-all active:scale-[0.97] inline-flex items-center justify-center"
          >
            Browse restaurants
          </button>
        </div>
      </div>
    );
  }

  const restaurant = cart[0].restaurantId as IRestaurant;
  const deliveryFee = subTotal < 250 ? 49 : 0;
  const platformFee = 7;

  // Promo and discounts calculation
  let discount = 0;
  if (appliedPromo === "NEW50") {
    discount = Math.min(Math.round(subTotal * 0.5), 100);
  } else if (appliedPromo === "NIGHT30") {
    discount = Math.round(subTotal * 0.3);
  }
  const computedDeliveryFee = (appliedPromo === "FREEDEL") ? 0 : deliveryFee;
  const pts = (user as any)?.rewardPoints || 0;
  const rewardDiscount = pts >= 500 ? 200 : (pts >= 200 ? 55 : 0);
  const rewardTierLabel = pts >= 500 ? "500 pts" : "200 pts";
  const grandTotal = Math.max(0, subTotal + computedDeliveryFee + platformFee - discount - rewardDiscount);

  const handleApplyPromo = () => {
    const code = couponCode.trim().toUpperCase();
    if (code === "NEW50") {
      setAppliedPromo("NEW50");
      setPromoError(null);
      toast.success("Promo applied! Saved ₹100");
    } else if (code === "FREEDEL") {
      setAppliedPromo("FREEDEL");
      setPromoError(null);
      toast.success("Promo applied! Free Delivery unlocked");
    } else if (code === "NIGHT30") {
      setAppliedPromo("NIGHT30");
      setPromoError(null);
      const savings = Math.round(subTotal * 0.3);
      toast.success(`Promo applied! Saved ₹${savings}`);
    } else if (!code) {
      setAppliedPromo(null);
      setPromoError(null);
    } else {
      setPromoError("Invalid coupon code. Try 'NEW50', 'FREEDEL', or 'NIGHT30'");
      setAppliedPromo(null);
    }
  };

  const updateQty = async (itemId: string, direction: "inc" | "dec") => {
    try {
      setLoadingItemId(itemId);
      await axios.put(
        `${restaurantService}/api/cart/${direction}`,
        { itemId },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      await fetchCart();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoadingItemId(null);
    }
  };

  const clearCart = async () => {
    try {
      setClearingCart(true);
      await axios.delete(`${restaurantService}/api/cart/clear`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      await fetchCart();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setClearingCart(false);
    }
  };

  return (
    <main className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-base)" }}>
      <div className="mx-auto max-w-xl px-4 py-6 space-y-4">

        {/* Page Title */}
        <div className="mb-2">
          <p className="section-eyebrow mb-1">Your Basket</p>
          <h2 className="text-h2 font-bold font-display" style={{ color: "var(--color-ink)" }}>Cart Checkout</h2>
        </div>

        {/* ── Restaurant header ── */}
        <div
          className="glass-card rounded-2xl p-4 flex items-center gap-3"
          style={{}}
        >
          <div
            className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0"
            style={{ backgroundColor: "var(--color-rule)" }}
          >
            <img
              src={restaurant.image || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=200&auto=format&fit=crop"}
              alt={restaurant.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider mb-0.5" style={{ color: "var(--color-ghost)" }}>
              Ordering from
            </p>
            <h1 className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>
              {restaurant.name}
            </h1>
            {!restaurant.isOpen && (
              <p className="text-xs mt-0.5 font-medium" style={{ color: "var(--color-alert)" }}>
                Restaurant is currently closed
              </p>
            )}
          </div>
          <button
            onClick={() => navigate(`/restaurant/${restaurant._id}`)}
            className="ml-auto text-xs font-semibold px-3 h-8 rounded-xl"
            style={{ backgroundColor: "var(--color-muted)", color: "var(--color-route)" }}
          >
            Add more
          </button>
        </div>

        {/* ── Items list ── */}
        <div
          className="glass-card rounded-2xl overflow-hidden"
          style={{}}
        >
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--color-rule)" }}>
            <p className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--color-ghost)" }}>
              {quantity} {quantity === 1 ? "item" : "items"} in cart
            </p>
          </div>

          {cart.map((cartItem: ICart, i: number) => {
            const item = cartItem.itemId as IMenuItem;
            const isLoading = loadingItemId === item._id;

            return (
              <div
                key={item._id}
                className="flex items-center gap-4 px-4 py-4"
                style={{
                  borderBottom: i < cart.length - 1 ? "1px solid var(--color-rule)" : "none",
                  borderLeft: "3px solid transparent",
                  transition: "border-left 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderLeft = "3px solid rgba(255,87,51,0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderLeft = "3px solid transparent";
                }}
              >
                {/* Image */}
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ backgroundColor: "var(--color-rule)" }}>
                  <img
                    src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=200&auto=format&fit=crop"}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                {/* Name + price */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: "var(--color-ink)" }}>
                    {item.name}
                  </p>
                  <p className="text-xs font-mono mt-0.5" style={{ color: "var(--color-manifest)" }}>
                    ₹{item.price} each
                  </p>
                  {i === 0 && (
                    <div className="mt-2 px-2.5 py-1 rounded-lg text-[9px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center gap-1.5 max-w-max">
                      <BiInfoCircle className="text-xs flex-shrink-0" />
                      <span>Bypassed Customize: Spice Level defaulted to Medium.</span>
                    </div>
                  )}
                </div>

                {/* Qty control */}
                <div className="flex items-center gap-1 flex-shrink-0" role="group" aria-label={`Quantity for ${item.name}`}>
                  <button
                    disabled={isLoading}
                    onClick={() => updateQty(item._id, "dec")}
                    className="flex items-center justify-center text-base font-bold transition-all disabled:opacity-40 cursor-pointer"
                    style={{
                      border: "1px solid var(--color-rule)",
                      borderRadius: "var(--radius-pill)",
                      width: "36px",
                      height: "36px",
                      minWidth: "36px",
                      color: "var(--color-route)",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,87,51,0.4)";
                      e.currentTarget.style.backgroundColor = "rgba(255,87,51,0.06)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-rule)";
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                    aria-label="Decrease quantity"
                  >
                    {isLoading ? (
                      <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                    ) : "−"}
                  </button>
                  <span className="w-8 text-center text-sm font-mono font-bold" style={{ color: "var(--color-ink)" }}>
                    {cartItem.quantity}
                  </span>
                  <button
                    disabled={isLoading}
                    onClick={() => updateQty(item._id, "inc")}
                    className="flex items-center justify-center text-base font-bold transition-all disabled:opacity-40 cursor-pointer"
                    style={{
                      border: "1px solid var(--color-rule)",
                      borderRadius: "var(--radius-pill)",
                      width: "36px",
                      height: "36px",
                      minWidth: "36px",
                      color: "var(--color-route)",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,87,51,0.4)";
                      e.currentTarget.style.backgroundColor = "rgba(255,87,51,0.06)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-rule)";
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                {/* Line total */}
                <p
                  className="w-14 text-right text-sm font-mono font-bold flex-shrink-0"
                  style={{ color: "var(--color-ink)" }}
                >
                  ₹{item.price * cartItem.quantity}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── Coupon Engine Validation ── */}
        <div className="p-5 rounded-3xl glass-card border space-y-4" style={{ borderColor: "var(--color-rule)" }}>
          <label htmlFor="coupon-input" className="text-[10px] font-body tracking-wider uppercase font-bold text-slate-400 block">
            Apply Coupon Code
          </label>
          <div className="flex gap-2.5">
            <div className="relative flex-1 input-focus-ring rounded-xl">
              <input
                id="coupon-input"
                type="text"
                placeholder="Enter coupon (e.g. NEW50, FREEDEL)"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value);
                  setPromoError(null);
                }}
                className="w-full h-11 px-4 rounded-xl text-xs outline-none transition duration-150 glass-input border"
                style={{ color: "var(--color-ink)", borderColor: "var(--color-rule)" }}
              />
              {appliedPromo && (
                <span className="absolute right-3 top-3 text-emerald-500 font-bold text-xs flex items-center gap-1" aria-label="coupon valid">
                  <BiCheckCircle className="text-sm" /> Valid
                </span>
              )}
            </div>
            <button
              onClick={handleApplyPromo}
              className="px-5 h-11 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
              style={{
                backgroundColor: "var(--color-route)",
                color: "white",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = ""; }}
            >
              Apply
            </button>
          </div>
          {promoError && (
            <p className="text-[10px] text-rose-500 font-bold flex items-center gap-1" role="alert">
              <BiInfoCircle className="text-xs" /> {promoError}
            </p>
          )}
          {appliedPromo && (
            <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
              <BiCheckCircle className="text-xs" /> Code <b>{appliedPromo}</b> applied successfully!
            </p>
          )}
        </div>

        {/* ── Gamified Savings Summary ── */}
        {discount > 0 && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
            style={{ borderColor: "var(--color-signal)", backgroundColor: "rgba(255, 87, 51, 0.05)" }}
          >
            <span className="text-sm flex items-center"><BiGift className="text-orange-500 text-base" /></span>
            <p className="text-xs font-semibold" style={{ color: "var(--color-signal)" }}>
              Forkful Savings: You saved ₹{discount} on this order!
            </p>
          </div>
        )}

        {/* ── Savings banner ── */}
        {subTotal >= 250 && !appliedPromo && (
          <div
            className="glass-card flex items-center gap-3 px-4 py-3 rounded-2xl border"
            style={{ borderColor: "var(--color-signal)" }}
          >
            <span className="text-sm flex items-center"><BiCheckCircle className="text-emerald-500 text-base" /></span>
            <p className="text-xs font-semibold" style={{ color: "var(--color-signal)" }}>
              You've unlocked free delivery on this order!
            </p>
          </div>
        )}

        {/* ── Impulse-Buy Recommendation Strip ── */}
        {pairings.length > 0 && (
          <div className="p-5 rounded-3xl glass-card border space-y-3" style={{ borderColor: "var(--color-rule)" }}>
            <p className="text-[10px] font-body tracking-wider uppercase font-bold text-slate-400">Complete Your Meal / Pairings</p>
            <div className="flex gap-4 overflow-x-auto no-scrollbar py-1">
              {pairings.map((upsell) => (
                <div key={upsell._id} className="flex-shrink-0 w-48 p-2.5 rounded-2xl border flex items-center gap-3" style={{ borderColor: "var(--color-rule)", backgroundColor: "rgba(255,255,255,0.01)" }}>
                  <img
                    src={upsell.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=120&auto=format&fit=crop"}
                    alt={upsell.name}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[11px] font-bold font-display truncate text-slate-800 dark:text-slate-200">{upsell.name}</h4>
                    <p className="text-[10px] font-body font-bold text-orange-500">₹{upsell.price}</p>
                  </div>
                  <button
                    onClick={async () => {
                      const firstItem = cart[0];
                      const rest = firstItem.restaurantId as IRestaurant;
                      const resId = typeof rest === "object" && rest !== null ? rest._id : rest;
                      if (!resId) return;

                      const loadToast = toast.loading(`Adding ${upsell.name} to cart...`);
                      try {
                        await axios.post(
                          `${restaurantService}/api/cart/add`,
                          { restaurantId: resId, itemId: upsell._id },
                          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
                        );
                        await fetchCart();
                        toast.success(`${upsell.name} added to cart!`, { id: loadToast });
                      } catch (err: any) {
                        toast.error(err.response?.data?.message || "Failed to add item to cart", { id: loadToast });
                      }
                    }}
                    className="px-2.5 py-1 bg-orange-500/10 text-orange-500 rounded-lg text-[9px] font-bold active:scale-95 transition cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Kitchen Communications ── */}
        <div className="p-5 rounded-3xl glass-card border space-y-3" style={{ borderColor: "var(--color-rule)" }}>
          <label htmlFor="kitchen-notes" className="text-[10px] font-body tracking-wider uppercase font-bold text-slate-400 block">
            Kitchen instructions / Allergy notes
          </label>
          <textarea
            id="kitchen-notes"
            placeholder="e.g., Make it extra spicy, avoid onions, no cutlery needed..."
            className="w-full h-16 p-3 rounded-2xl text-xs outline-none transition duration-150 glass-input border resize-none"
            style={{ color: "var(--color-ink)", borderColor: "var(--color-rule)" }}
          />
        </div>

        {/* ── Price breakdown ── */}
        <div
          className="glass-card rounded-2xl px-5 py-5 space-y-3 gradient-border"
          style={{}}
          aria-label="Order summary"
        >
          <p className="text-[10px] font-body tracking-wider uppercase font-bold" style={{ color: "var(--color-ghost)" }}>
            Bill Details
          </p>

          {[
            { label: "Item total", value: `₹${subTotal}`, highlight: false },
            {
              label: computedDeliveryFee === 0 ? "Delivery charge" : "Delivery charge",
              value: computedDeliveryFee === 0 ? "FREE" : `₹${computedDeliveryFee}`,
              highlight: computedDeliveryFee === 0,
            },
            { label: "Platform fee", value: `₹${platformFee}`, highlight: false },
            ...(discount > 0 ? [{ label: `Coupon Savings (${appliedPromo})`, value: `-₹${discount}`, highlight: true }] : []),
            ...(rewardDiscount > 0 ? [{ label: `Loyalty Reward (${rewardTierLabel})`, value: `-₹${rewardDiscount}`, highlight: true }] : [])
          ].map(({ label, value, highlight }, idx, arr) => (
            <div key={label}>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: "var(--color-manifest)" }}>{label}</span>
                <span
                  className="text-sm font-mono font-semibold"
                  style={{ color: highlight ? "var(--color-signal)" : "var(--color-ink)" }}
                >
                  {value}
                </span>
              </div>
              {idx < arr.length - 1 && <hr className="glow-divider my-2.5" />}
            </div>
          ))}

          {subTotal < 250 && computedDeliveryFee > 0 && (
            <div
              className="flex items-center gap-2 text-xs py-2.5 px-3 rounded-xl"
              style={{ color: "var(--color-urgency)", backgroundColor: "var(--color-urgency-light)" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
              Add ₹{250 - subTotal} more to get free delivery
            </div>
          )}

          <div
            className="flex items-center justify-between pt-3.5 mt-1"
            style={{ borderTop: "1.5px solid var(--color-rule)" }}
          >
            <div>
              <span className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>To pay</span>
              <p className="text-[10px] font-body mt-0.5" style={{ color: "var(--color-manifest)" }}>incl. taxes & charges</p>
            </div>
            <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--color-ink)", fontFamily: "var(--font-mono)" }}>
              ₹{grandTotal}
            </span>
          </div>
        </div>

        {/* Spacer for fixed CTA */}
        <div className="h-6" />
      </div>

      {/* ── Fixed bottom CTA ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 glass-panel animate-slide-up"
        style={{ borderTop: "1px solid var(--color-rule)" }}
      >
        {/* Logistics Prominence Timer */}
        <div className="text-center py-2 bg-slate-900 dark:bg-black text-white text-[9px] font-body font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 border-b" style={{ borderColor: "var(--color-rule)" }}>
          <span className="animate-pulse flex items-center gap-1"><BiTime className="text-xs" /> Checkout Session expires in: 14:32m</span>
        </div>

        <div className="mx-auto max-w-xl p-4 space-y-2">
          <button
            onClick={() => navigate("/checkout")}
            disabled={!restaurant.isOpen}
            className="w-full h-13 py-3.5 rounded-2xl text-sm font-bold transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between px-5 cursor-pointer shadow-md hover:brightness-105 glow-orange noise-overlay"
            style={{ backgroundColor: "var(--color-route)", color: "white" }}
          >
            <span>{restaurant.isOpen ? "Proceed to checkout" : "Restaurant is closed"}</span>
            {restaurant.isOpen && (
              <span className="font-body font-bold flex items-center gap-1">₹{grandTotal} <BiChevronRight className="text-base" /></span>
            )}
          </button>
          <button
            onClick={clearCart}
            disabled={clearingCart}
            className="w-full h-9 rounded-xl text-xs font-semibold transition-colors duration-150 disabled:opacity-40 cursor-pointer"
            style={{ color: "var(--color-manifest)" }}
          >
            {clearingCart ? "Clearing…" : "Clear cart"}
          </button>
        </div>
      </div>
    </main>
  );
};

export default Cart;
