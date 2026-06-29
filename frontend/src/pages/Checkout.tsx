import { useEffect, useState } from "react";
import { useAppData } from "../context/AppContext";
import axios from "axios";
import { restaurantService, utilsService } from "../main";
import { useNavigate } from "react-router-dom";
import type { ICart, IMenuItem, IRestaurant } from "../types";
import toast from "react-hot-toast";
import { BiCreditCard, BiLoader, BiWallet, BiPhone } from "react-icons/bi";
import { loadStripe } from "@stripe/stripe-js";

interface Address {
  _id: string;
  formattedAddress: string;
  mobile: number;
}

const Checkout = () => {
  const { cart, subTotal, quantity, user } = useAppData();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setselectedAddressId] = useState<string | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [loadingRazorpay, setLoadingRazorpay] = useState(false);
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [loadingCOD, setLoadingCOD] = useState(false);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [surgeCharge, setSurgeCharge] = useState<{ surgeAmount: number; multiplier: number; reason: string } | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<"razorpay" | "stripe" | "cod">("razorpay");

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!cart || cart.length === 0) { setLoadingAddress(false); return; }
      try {
        const { data } = await axios.get(`${restaurantService}/api/address/all`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setAddresses(data || []);
      } catch (error) {
        console.log(error);
      } finally {
        setLoadingAddress(false);
      }
    };
    fetchAddresses();
  }, [cart]);

  useEffect(() => {
    const fetchSurge = async () => {
      if (!selectedAddressId || !cart || cart.length === 0) {
        setSurgeCharge(null);
        return;
      }
      const addressObj: any = addresses.find(a => a._id === selectedAddressId);
      if (!addressObj || !addressObj.location?.coordinates) return;

      const restaurant = cart[0].restaurantId as IRestaurant;
      try {
        const { data } = await axios.get(`${restaurantService}/api/order/surge-charge`, {
          params: {
            restaurantId: restaurant._id,
            latitude: addressObj.location.coordinates[1],
            longitude: addressObj.location.coordinates[0],
            weather: sessionStorage.getItem("weather_label") || "clear"
          },
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setSurgeCharge(data);
      } catch (err) {
        console.log("Error loading surge:", err);
        setSurgeCharge(null);
      }
    };
    fetchSurge();
  }, [selectedAddressId, addresses, cart]);

  const navigate = useNavigate();

  if (!cart || cart.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" style={{ backgroundColor: "var(--bg-base)" }}>
        <p style={{ color: "var(--color-manifest)" }}>Your cart is empty</p>
      </div>
    );
  }

  const restaurant = cart[0].restaurantId as IRestaurant;
  const deliveryFee = subTotal < 250 ? 49 : 0;
  const platformFee = 7;
  const pts = (user as any)?.rewardPoints || 0;
  const rewardDiscount = pts >= 500 ? 200 : (pts >= 200 ? 55 : 0);
  const rewardTierLabel = pts >= 500 ? "500 pts" : "200 pts";
  const surgeAmount = surgeCharge?.surgeAmount || 0;
  const grandTotal = Math.max(0, subTotal + deliveryFee + platformFee - rewardDiscount + tipAmount + surgeAmount);

  const createOrder = async (paymentMethod: "razorpay" | "stripe" | "cod") => {
    if (!selectedAddressId) return null;
    setCreatingOrder(true);
    try {
      const { data } = await axios.post(
        `${restaurantService}/api/order/new`,
        { paymentMethod, addressId: selectedAddressId, riderTip: tipAmount, surgeAmount },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      return data;
    } catch (error) {
      toast.error("Failed to create Order");
    } finally {
      setCreatingOrder(false);
    }
  };

  const payWithRazorpay = async () => {
    try {
      setLoadingRazorpay(true);
      const order = await createOrder("razorpay");
      if (!order) return;
      const { orderId, amount } = order;
      const { data } = await axios.post(`${utilsService}/api/payment/create`, { orderId });
      const { razorpayOrderId, key } = data;
      const options = {
        key, amount: amount * 100, currency: "INR",
        name: "Forkful", description: "Food Order Payment",
        order_id: razorpayOrderId,
        handler: async (response: any) => {
          try {
            await axios.post(`${utilsService}/api/payment/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId,
            });
            toast.success("Payment successful");
            navigate("/paymentsuccess/" + response.razorpay_payment_id);
          } catch { toast.error("Payment verification failed"); }
        },
        theme: { color: "#FF5733" },
      };
      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch { toast.error("Payment failed — please refresh page"); }
    finally { setLoadingRazorpay(false); }
  };

  const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

  const payWithStripe = async () => {
    try {
      setLoadingStripe(true);
      const order = await createOrder("stripe");
      if (!order) return;
      const { orderId } = order;
      try {
        await stripePromise;
        const { data } = await axios.post(`${utilsService}/api/payment/stripe/create`, { orderId });
        if (data.url) window.location.href = data.url;
        else toast.error("Failed to create payment session");
      } catch { toast.error("Payment Failed"); }
    } catch { toast.error("Payment failed"); }
    finally { setLoadingStripe(false); }
  };

  const payWithCOD = async () => {
    try {
      setLoadingCOD(true);
      const order = await createOrder("cod");
      if (!order) return;
      toast.success("Order placed successfully (Cash on Delivery)");
      setTimeout(() => navigate("/orders"), 1000);
    } catch { toast.error("Failed to place Cash on Delivery order"); }
    finally { setLoadingCOD(false); }
  };

  return (
    <main className="min-h-screen pb-16" style={{ backgroundColor: "var(--bg-base)" }}>
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-5">

        <h1 className="text-2xl font-black font-display tracking-tight" style={{ color: "var(--color-ink)" }}>
          Checkout
        </h1>

        {/* ── Restaurant info ── */}
        <div className="rounded-2xl p-5 glass-card">
          <p className="text-[10px] font-body tracking-wider uppercase mb-1" style={{ color: "var(--color-ghost)" }}>
            Ordering from
          </p>
          <h2 className="text-base font-bold font-display" style={{ color: "var(--color-ink)" }}>{restaurant.name}</h2>
          <p className="text-xs mt-1" style={{ color: "var(--color-manifest)" }}>
            {restaurant.autoLocation?.formattedAddress}
          </p>
        </div>

        {/* ── Delivery Address ── */}
        <div className="rounded-2xl p-5 space-y-4 glass-card">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>Delivery Address</h3>
            <button
              onClick={() => navigate("/address")}
              className="flex items-center gap-1 text-xs font-bold transition-colors"
              style={{ color: "var(--color-route)" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add New
            </button>
          </div>

          {loadingAddress ? (
            <div className="space-y-2">
              <div className="h-12 rounded-xl animate-pulse" style={{ backgroundColor: "var(--color-rule)" }} />
              <div className="h-12 rounded-xl animate-pulse" style={{ backgroundColor: "var(--color-rule)" }} />
            </div>
          ) : addresses.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: "var(--color-ghost)" }}>
              No saved addresses. Please add one to deliver order.
            </p>
          ) : (
            <div className="space-y-2">
              {addresses.map((add) => (
                <label
                  key={add._id}
                  className={`flex gap-3 p-3.5 cursor-pointer transition-all border`}
                  style={
                    selectedAddressId === add._id
                      ? { boxShadow: "0 0 0 2px rgba(255,87,51,0.3)", borderColor: "transparent", borderRadius: "var(--radius-md)" }
                      : { border: "1px solid var(--color-rule)", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-md)" }
                  }
                >
                  <input
                    type="radio"
                    name="delivery-address"
                    checked={selectedAddressId === add._id}
                    onChange={() => setselectedAddressId(add._id)}
                    style={{ accentColor: "var(--color-route)" }}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "var(--color-ink)" }}>{add.formattedAddress}</p>
                    <p className="text-[10px] mt-1 font-body flex items-center gap-1" style={{ color: "var(--color-ghost)" }}><BiPhone className="text-xs" /> {add.mobile}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* ── Rider Tip ── */}
        <div className="p-5 space-y-4 glass-card" style={{ borderRadius: "var(--radius-lg)" }}>
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>Tip Your Rider</h3>
            <p className="text-[10px]" style={{ color: "var(--color-manifest)" }}>All of this goes to the rider only. Thank them for their service!</p>
          </div>
          <div className="flex gap-2">
            {[0, 10, 20, 30].map((amount) => (
              <button
                key={amount}
                onClick={() => setTipAmount(amount)}
                className="flex-1 py-2 text-xs font-bold transition-all border cursor-pointer hover:brightness-105"
                style={
                  tipAmount === amount
                    ? { background: "rgba(255,87,51,0.12)", borderColor: "rgba(255,87,51,0.5)", color: "var(--color-route)", fontWeight: 700, borderRadius: "var(--radius-md)" }
                    : { borderColor: "var(--color-rule)", backgroundColor: "rgba(255,255,255,0.02)", color: "var(--color-ink)", borderRadius: "var(--radius-md)" }
                }
              >
                {amount === 0 ? "No Tip" : `₹${amount}`}
              </button>
            ))}
          </div>
        </div>

        {/* ── Surge Charge Badge ── */}
        {surgeAmount > 0 && (
          <div
            className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400"
            style={{
              border: "1px solid rgba(245,158,11,0.3)",
              background: "rgba(245,158,11,0.08)",
              borderRadius: "var(--radius-md)",
              padding: "10px 14px",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>Surge pricing active ({surgeCharge?.reason}): +₹{surgeAmount} added to delivery fee.</span>
          </div>
        )}

        {/* ── Order Summary ── */}
        <div className="rounded-2xl p-5 space-y-4 glass-card">
          <h3 className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>Order Summary</h3>

          <div className="space-y-2 border-b pb-3" style={{ borderColor: "var(--color-rule)" }}>
            {cart.map((cartItem: ICart) => {
              const item = cartItem.itemId as IMenuItem;
              return (
                <div className="flex justify-between text-xs" key={cartItem._id}>
                  <span style={{ color: "var(--color-manifest)" }}>{item.name} × {cartItem.quantity}</span>
                  <span className="font-mono font-bold" style={{ color: "var(--color-ink)" }}>₹{item.price * cartItem.quantity}</span>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span style={{ color: "var(--color-manifest)" }}>Items ({quantity})</span>
              <span className="font-mono" style={{ color: "var(--color-ink)" }}>₹{subTotal}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: "var(--color-manifest)" }}>Delivery fee</span>
              <span className="font-mono" style={{ color: deliveryFee === 0 ? "var(--color-signal)" : "var(--color-ink)", fontWeight: deliveryFee === 0 ? 700 : 400 }}>
                {deliveryFee === 0 ? "Free" : `₹${deliveryFee}`}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: "var(--color-manifest)" }}>Platform fee</span>
              <span className="font-mono" style={{ color: "var(--color-ink)" }}>₹{platformFee}</span>
            </div>
            {rewardDiscount > 0 && (
              <div className="flex justify-between text-xs font-bold">
                <span style={{ color: "var(--color-signal)" }}>Loyalty Reward ({rewardTierLabel})</span>
                <span className="font-mono" style={{ color: "var(--color-signal)" }}>-₹{rewardDiscount}</span>
              </div>
            )}
            {tipAmount > 0 && (
              <div className="flex justify-between text-xs">
                <span style={{ color: "var(--color-manifest)" }}>Rider Tip</span>
                <span className="font-mono" style={{ color: "var(--color-ink)" }}>₹{tipAmount}</span>
              </div>
            )}
            {surgeAmount > 0 && (
              <div className="flex justify-between text-xs font-semibold" style={{ color: "var(--color-urgency)" }}>
                <span>Surge Pricing ({surgeCharge?.reason})</span>
                <span className="font-mono">₹{surgeAmount}</span>
              </div>
            )}

            {subTotal < 250 && (
              <p className="text-[10px] px-3 py-2 rounded-xl text-center font-semibold" style={{ color: "var(--color-urgency)", backgroundColor: "var(--color-urgency-light)" }}>
                Add ₹{250 - subTotal} more for free delivery
              </p>
            )}

            <div className="flex justify-between text-sm font-bold pt-2 border-t" style={{ borderColor: "var(--color-rule)" }}>
              <span style={{ color: "var(--color-ink)" }}>Total Amount</span>
              <span className="font-mono" style={{ color: "var(--color-ink)" }}>₹{grandTotal}</span>
            </div>
          </div>
        </div>

        {/* ── Payment Methods ── */}
        <div className="p-5 space-y-4 glass-card" style={{ borderRadius: "var(--radius-lg)" }}>
          <h3 className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>Select Payment Method</h3>

          {!selectedAddressId && (
            <p className="text-[10px] py-2 px-3 rounded-lg text-center font-semibold" style={{ backgroundColor: "var(--color-alert-light)", color: "var(--color-alert)" }}>
              Please select a delivery address to enable payment options
            </p>
          )}

          <div className="space-y-2 pt-1">
            {/* Razorpay */}
            <button
              disabled={!selectedAddressId || loadingRazorpay || creatingOrder}
              onClick={() => { setSelectedMethod("razorpay"); payWithRazorpay(); }}
              className="flex w-full items-center justify-center gap-2 py-3.5 text-xs font-bold text-white transition-all active:scale-[0.98] hover:brightness-105 shadow-md disabled:opacity-40 cursor-pointer"
              style={{
                backgroundColor: "var(--color-route)",
                borderRadius: "var(--radius-md)",
                boxShadow: selectedMethod === "razorpay" ? "0 0 0 2px rgba(255,87,51,0.3)" : "none",
                borderColor: selectedMethod === "razorpay" ? "transparent" : "var(--color-rule)",
                borderWidth: "1px"
              }}
            >
              {loadingRazorpay ? <BiLoader size={16} className="animate-spin" /> : <BiCreditCard size={16} style={{ color: selectedMethod === "razorpay" ? "var(--color-route)" : "inherit" }} />}
              Pay with Razorpay
            </button>

            {/* Stripe */}
            <button
              disabled={!selectedAddressId || loadingStripe || creatingOrder}
              onClick={() => { setSelectedMethod("stripe"); payWithStripe(); }}
              className="flex w-full items-center justify-center gap-2 py-3.5 text-xs font-bold text-white transition-all active:scale-[0.98] hover:brightness-105 shadow-md disabled:opacity-40 cursor-pointer"
              style={{
                backgroundColor: "rgba(15,23,42,0.9)",
                borderRadius: "var(--radius-md)",
                boxShadow: selectedMethod === "stripe" ? "0 0 0 2px rgba(255,87,51,0.3)" : "none",
                borderColor: selectedMethod === "stripe" ? "transparent" : "var(--color-rule)",
                borderWidth: "1px"
              }}
            >
              {loadingStripe ? <BiLoader size={16} className="animate-spin" /> : <BiCreditCard size={16} style={{ color: selectedMethod === "stripe" ? "var(--color-route)" : "inherit" }} />}
              Pay with Stripe
            </button>

            {/* COD */}
            <button
              disabled={!selectedAddressId || loadingCOD || creatingOrder}
              onClick={() => { setSelectedMethod("cod"); payWithCOD(); }}
              className="flex w-full items-center justify-center gap-2 py-3.5 text-xs font-bold text-white transition-all active:scale-[0.98] hover:brightness-105 shadow-md disabled:opacity-40 cursor-pointer"
              style={{
                backgroundColor: "var(--color-signal)",
                borderRadius: "var(--radius-md)",
                boxShadow: selectedMethod === "cod" ? "0 0 0 2px rgba(255,87,51,0.3)" : "none",
                borderColor: selectedMethod === "cod" ? "transparent" : "var(--color-rule)",
                borderWidth: "1px"
              }}
            >
              {loadingCOD ? <BiLoader size={16} className="animate-spin" /> : <BiWallet size={16} style={{ color: selectedMethod === "cod" ? "var(--color-route)" : "inherit" }} />}
              Cash on Delivery
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Checkout;
