import { useState } from "react";
import { BiSearch, BiSolidBolt, BiBasket, BiPlus, BiMinus, BiChevronRight } from "react-icons/bi";
import toast from "react-hot-toast";

interface GroceryItem {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice: number;
  weight: string;
  image: string;
}

const GROCERY_ITEMS: GroceryItem[] = [
  { id: "g1", name: "Fresh Royal Gala Apples", category: "Fruits & Vegetables", price: 149, originalPrice: 199, weight: "4 pcs (approx. 500g)", image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=300&q=80" },
  { id: "g2", name: "Organic Cavendish Bananas", category: "Fruits & Vegetables", price: 49, originalPrice: 69, weight: "6 pcs", image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=300&q=80" },
  { id: "g3", name: "Hybrid Tomatoes", category: "Fruits & Vegetables", price: 35, originalPrice: 45, weight: "1 kg", image: "https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&w=300&q=80" },
  { id: "g4", name: "Red Onions", category: "Fruits & Vegetables", price: 40, originalPrice: 55, weight: "1 kg", image: "https://images.unsplash.com/photo-1618512496248-a07fe8376663?auto=format&fit=crop&w=300&q=80" },
  { id: "g5", name: "Amul Pasteurised Butter", category: "Dairy, Bread & Eggs", price: 56, originalPrice: 58, weight: "100 g", image: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=300&q=80" },
  { id: "g6", name: "Nandini Toned Fresh Milk", category: "Dairy, Bread & Eggs", price: 27, originalPrice: 27, weight: "500 ml", image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=300&q=80" },
  { id: "g7", name: "Fresh White Eggs", category: "Dairy, Bread & Eggs", price: 55, originalPrice: 70, weight: "6 pcs", image: "https://images.unsplash.com/photo-1516448424440-9dbca97779c1?auto=format&fit=crop&w=300&q=80" },
  { id: "g8", name: "Atta Whole Wheat Bread", category: "Dairy, Bread & Eggs", price: 45, originalPrice: 50, weight: "400 g", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&q=80" },
  { id: "g9", name: "Lays Classic Salted Chips", category: "Munchies & Chips", price: 20, originalPrice: 20, weight: "50 g", image: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=300&q=80" },
  { id: "g10", name: "Kurkure Masala Munch", category: "Munchies & Chips", price: 20, originalPrice: 20, weight: "90 g", image: "https://images.unsplash.com/photo-1600952841320-db92ec4047ca?auto=format&fit=crop&w=300&q=80" },
  { id: "g11", name: "Coca-Cola Zero Sugar", category: "Cold Drinks & Juices", price: 40, originalPrice: 40, weight: "300 ml", image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=300&q=80" },
  { id: "g12", name: "Raw Pressery Mango Juice", category: "Cold Drinks & Juices", price: 80, originalPrice: 100, weight: "250 ml", image: "https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=300&q=80" },
];

const CATEGORIES = ["All", "Fruits & Vegetables", "Dairy, Bread & Eggs", "Munchies & Chips", "Cold Drinks & Juices"];

const Instamart = () => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<{ [id: string]: number }>({});
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [deliveryMinutes, setDeliveryMinutes] = useState(10);

  const addToCart = (id: string) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    toast.success("Added to Instamart cart");
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const updated = { ...prev };
      if (updated[id] <= 1) {
        delete updated[id];
      } else {
        updated[id]--;
      }
      return updated;
    });
  };

  const getCartTotal = () => {
    return Object.entries(cart).reduce((total, [id, qty]) => {
      const item = GROCERY_ITEMS.find((item) => item.id === id);
      return total + (item ? item.price * qty : 0);
    }, 0);
  };

  const getCartCount = () => {
    return Object.values(cart).reduce((a, b) => a + b, 0);
  };

  const handleCheckout = () => {
    setOrderPlaced(true);
    setCart({});
    toast.success("Instamart order placed successfully!");
    
    // Simulate active countdown timer
    const interval = setInterval(() => {
      setDeliveryMinutes((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 12000); // changes every 12 seconds for demo speed
  };

  const filteredItems = GROCERY_ITEMS.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (orderPlaced) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center space-y-6">
        <div 
          className="inline-flex h-20 w-20 items-center justify-center rounded-full text-white text-4xl animate-pulse"
          style={{ backgroundColor: "var(--color-signal)", boxShadow: "0 0 20px rgba(34, 197, 94, 0.4)" }}
        >
          ✓
        </div>
        <h2 className="text-2xl font-black font-display text-slate-800 dark:text-slate-100">Instamart Order Placed!</h2>
        <div className="border p-6 space-y-4 glass-card" style={{ borderColor: "var(--color-rule)", borderRadius: "var(--radius-lg)" }}>
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--color-rule)" }}>
            <span className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--color-signal)" }}>
              <BiSolidBolt /> Superfast Delivery Mode
            </span>
            <span className="text-xs text-white px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: "var(--color-signal)" }}>
              Active
            </span>
          </div>
          <div className="space-y-1 text-center">
            <p className="text-xs" style={{ color: "var(--color-manifest)" }}>Estimated delivery time</p>
            <h3 className="text-4xl font-black" style={{ color: "var(--color-signal)" }}>
              {deliveryMinutes > 0 ? `${deliveryMinutes} mins` : "Arrived!"}
            </h3>
          </div>
          <p className="text-xs" style={{ color: "var(--color-manifest)" }}>
            {deliveryMinutes > 0
              ? "Your rider has picked up the groceries and is rushing to your address."
              : "Rider has arrived at your gate! Enjoy your fresh items."}
          </p>
        </div>
        <button
          onClick={() => setOrderPlaced(false)}
          className="w-full py-3.5 text-white font-bold text-sm transition-all duration-150 shadow-md hover:brightness-105 active:scale-[0.98] cursor-pointer glow-orange"
          style={{ backgroundColor: "var(--color-route)", borderRadius: "var(--radius-md)" }}
        >
          Shop More Groceries
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "var(--bg-base)" }}>
      {/* Hero Banner */}
      <div 
        className="relative text-white py-12 px-4 md:px-8 shadow-sm overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `linear-gradient(to right, rgba(6, 78, 59, 0.9), rgba(6, 78, 59, 0.45)), url('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80')` }}
      >
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 text-center md:text-left">
            <div 
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase text-white"
              style={{ backgroundColor: "var(--color-route)" }}
            >
              <BiSolidBolt /> Forkful Instamart
            </div>
            <h1 className="text-3xl md:text-4xl font-black font-display tracking-tight leading-tight text-white drop-shadow-md">
              Groceries & more <br />delivered in <span style={{ color: "var(--color-thermal)" }}>10 mins</span>
            </h1>
            <p className="text-sm text-gray-200 max-w-md font-medium drop-shadow">
              From fresh fruits and daily essentials to late-night munchies.
            </p>
          </div>
          <div className="w-full max-w-md">
            <div className="flex items-center w-full px-4 py-3 shadow-lg text-slate-800 glass-card input-focus-ring" style={{ borderRadius: "var(--radius-md)" }}>
              <BiSearch className="h-5 w-5 mr-3" style={{ color: "var(--color-ghost)" }} />
              <input
                type="text"
                placeholder="Search for milk, chips, veggies or bread..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm outline-none bg-transparent"
                style={{ color: "var(--color-ink)" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="mx-auto max-w-7xl px-4 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Categories */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-2">
          <h3 className="text-xs font-body tracking-wider uppercase font-semibold mb-3 px-3" style={{ color: "var(--color-ghost)" }}>
            Shop by Category
          </h3>
          <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-1.5 pb-2 md:pb-0 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="w-auto md:w-full text-left px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-[0.97] cursor-pointer"
                style={
                  selectedCategory === cat
                    ? { backgroundColor: "var(--color-route)", color: "white", borderRadius: "var(--radius-md)" }
                    : { backgroundColor: "var(--bg-surface)", color: "var(--color-manifest)", border: "1px solid var(--color-rule)", borderRadius: "var(--radius-md)" }
                }
                onMouseEnter={(e) => {
                  if (selectedCategory !== cat) {
                    e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.borderColor = "rgba(255,87,51,0.25)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCategory !== cat) {
                    e.currentTarget.style.backgroundColor = "var(--bg-surface)";
                    e.currentTarget.style.borderColor = "var(--color-rule)";
                  }
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grocery Items Grid */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--color-rule)" }}>
            <h2 className="text-lg font-black font-display" style={{ color: "var(--color-ink)" }}>
              {selectedCategory}
            </h2>
            <span className="text-xs font-medium" style={{ color: "var(--color-ghost)" }}>
              Showing {filteredItems.length} items
            </span>
          </div>

          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map((item) => {
                const qty = cart[item.id] || 0;
                return (
                  <div
                    key={item.id}
                    className="p-3 shadow-sm transition duration-250 flex flex-col justify-between glass-card card-lift"
                    style={{ borderRadius: "var(--radius-lg)" }}
                  >
                    <div>
                      {/* Product Visual Container */}
                      <div className="relative aspect-square overflow-hidden flex items-center justify-center mb-3 bg-slate-100 dark:bg-slate-800/40" style={{ borderRadius: "var(--radius-md)" }}>
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
                        <span 
                          className="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 text-white shadow-sm"
                          style={{ backgroundColor: "var(--color-route)" }}
                        >
                          <BiSolidBolt className="text-[10px]" /> 10 MINS
                        </span>
                      </div>

                      {/* Name & Weight */}
                      <h4 className="text-xs font-bold line-clamp-2 min-h-8" style={{ color: "var(--color-ink)" }}>
                        {item.name}
                      </h4>
                      <p className="text-[10px] font-semibold mt-0.5" style={{ color: "var(--color-ghost)" }}>
                        {item.weight}
                      </p>
                    </div>

                    {/* Price and Add Control */}
                    <div className="flex items-center justify-between mt-4">
                      <div>
                        <span className="text-sm font-black" style={{ color: "var(--color-ink)" }}>
                          ₹{item.price}
                        </span>
                        {item.originalPrice > item.price && (
                          <span className="text-[10px] line-through ml-1 font-semibold" style={{ color: "var(--color-ghost)" }}>
                            ₹{item.originalPrice}
                          </span>
                        )}
                      </div>

                      {qty > 0 ? (
                        <div 
                          className="flex items-center text-white px-2 py-1 space-x-2.5 text-xs font-bold shadow-sm"
                          style={{ backgroundColor: "var(--color-route)", borderRadius: "var(--radius-sm)" }}
                        >
                          <button onClick={() => removeFromCart(item.id)} className="hover:scale-110 cursor-pointer transition-transform active:scale-90">
                            <BiMinus />
                          </button>
                          <span className="font-mono">{qty}</span>
                          <button onClick={() => addToCart(item.id)} className="hover:scale-110 cursor-pointer transition-transform active:scale-90">
                            <BiPlus />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item.id)}
                          className="flex items-center gap-1 bg-white dark:bg-slate-900 border px-3 py-1.5 text-xs font-bold transition shadow-sm active:scale-[0.95] cursor-pointer hover:bg-orange-500/5"
                          style={{ borderColor: "var(--color-route)", color: "var(--color-route)", borderRadius: "var(--radius-sm)" }}
                        >
                          <BiPlus /> ADD
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 font-medium" style={{ color: "var(--color-ghost)" }}>
              No grocery items found matching search
            </div>
          )}
        </div>
      </div>

      {/* Floating Checkout Bar */}
      {getCartCount() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t shadow-2xl z-40 animate-slide-up glass-panel" style={{ borderColor: "var(--color-rule)" }}>
          <div className="mx-auto max-w-3xl flex items-center justify-between px-4 py-4 md:px-6">
            <div className="flex items-center space-x-3">
              <span className="p-2.5 rounded-xl" style={{ backgroundColor: "var(--color-route-light)", color: "var(--color-route)", borderRadius: "var(--radius-md)" }}>
                <BiBasket size={20} />
              </span>
              <div>
                <p className="text-[9px] font-body tracking-wider uppercase font-bold" style={{ color: "var(--color-ghost)" }}>
                  Instamart Cart
                </p>
                <h4 className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>
                  {getCartCount()} items • <span className="font-black" style={{ color: "var(--color-route)" }}>₹{getCartTotal()}</span>
                </h4>
              </div>
            </div>
            <button
              onClick={handleCheckout}
              className="flex items-center gap-1.5 text-white px-6 py-2.5 text-xs font-black transition shadow-md active:scale-[0.98] cursor-pointer hover:brightness-105 glow-orange"
              style={{ backgroundColor: "var(--color-route)", borderRadius: "var(--radius-md)" }}
            >
              Order Groceries <BiChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Instamart;
