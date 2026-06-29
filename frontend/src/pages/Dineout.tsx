import { useState, useEffect } from "react";
import { useAppData } from "../context/AppContext";
import { useSocket } from "../context/SocketContext";
import { BiSpa, BiMapPin, BiTime, BiCalendar, BiUser, BiPurchaseTag } from "react-icons/bi";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";

interface DineoutDeal {
  id: string;
  name: string;
  cuisine: string;
  deal: string;
  address: string;
  image: string;
}

const MOCK_DEALS: DineoutDeal[] = [
  { id: "d1", name: "The Punjabi Dhaba", cuisine: "North Indian, Tandoori", deal: "FLAT 25% OFF on total bill", address: "Koramangala 5th Block, Bangalore", image: "https://images.unsplash.com/photo-1585934580916-37b01884860a?auto=format&fit=crop&w=300&q=80" },
  { id: "d2", name: "Toscano Italian Bistro", cuisine: "Italian, Continental, Pizzas", deal: "FLAT 15% OFF on food bill", address: "Indiranagar, Bangalore", image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80" },
  { id: "d3", name: "Chinatown Express", cuisine: "Chinese, Seafood, Noodles", deal: "1+1 on beverages & drinks", address: "HSR Layout, Bangalore", image: "https://images.unsplash.com/photo-1526318896980-cf78c088247c?auto=format&fit=crop&w=300&q=80" },
];

const Dineout = () => {
  const { location } = useAppData();
  const { socket } = useSocket();
  const [deals, setDeals] = useState<DineoutDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState<DineoutDeal | null>(null);

  // Reservation details
  const [date, setDate] = useState("");
  const [time, setTime] = useState("19:00");
  const [guests, setGuests] = useState("2");
  const [name, setName] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const lat = location?.latitude || 12.9716;
      const lng = location?.longitude || 77.5946;
      const { data } = await axios.get(
        `${restaurantService}/api/restaurant/all`,
        {
          params: { latitude: lat, longitude: lng },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (data?.restaurants && data.restaurants.length > 0) {
        const fetchedDeals = data.restaurants.map((res: any, idx: number) => {
          const discountDeals = [
            "FLAT 25% OFF on total bill",
            "FLAT 15% OFF on food bill",
            "1+1 on beverages & drinks",
            "FLAT 30% OFF on pre-booking"
          ];
          const images = [
            "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=300&q=80",
            "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=300&q=80",
            "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=300&q=80",
            "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=300&q=80"
          ];
          return {
            id: res._id,
            name: res.name,
            cuisine: res.description || "Multi-cuisine, Fast Food",
            deal: discountDeals[idx % discountDeals.length],
            address: res.autoLocation?.formattedAddress || "Near you",
            image: images[idx % images.length]
          };
        });
        setDeals(fetchedDeals);
      } else {
        setDeals(MOCK_DEALS);
      }
    } catch (err) {
      console.log("Failed to load dineout restaurants:", err);
      setDeals(MOCK_DEALS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [location]);

  const handleBookTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !name.trim()) {
      toast.error("Please enter booking date and name");
      return;
    }
    if (socket && selectedDeal) {
      socket.emit("table:book", {
        restaurantId: selectedDeal.id,
        booking: {
          name: name.trim(),
          date,
          time,
          guests,
          deal: selectedDeal.deal,
        },
      });
    }
    setConfirmed(true);
    toast.success("Table reserved successfully!");
  };

  if (confirmed && selectedDeal) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center space-y-6">
        <div 
          className="inline-flex h-20 w-20 items-center justify-center rounded-full text-white text-4xl animate-pulse shadow-lg"
          style={{ backgroundColor: "var(--color-signal)", boxShadow: "0 0 20px rgba(34, 197, 94, 0.4)" }}
        >
          ✓
        </div>
        <h2 className="text-2xl font-black font-display" style={{ color: "var(--color-ink)" }}>Booking Confirmed!</h2>
        
        <div className="border p-6 text-left space-y-4 glass-card" style={{ borderColor: "var(--color-rule)", borderRadius: "var(--radius-lg)" }}>
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--color-rule)" }}>
            <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: "var(--color-signal)" }}>
              <BiSpa /> Dineout Table Reservation
            </span>
            <span className="text-[10px] text-white px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: "var(--color-signal)" }}>
              Confirmed
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-black font-display" style={{ color: "var(--color-ink)" }}>{selectedDeal.name}</h3>
            <p className="text-xs flex items-center gap-1" style={{ color: "var(--color-manifest)" }}>
              <BiMapPin /> {selectedDeal.address}
            </p>
            <div className="grid grid-cols-3 gap-2 pt-2 text-xs font-bold" style={{ color: "var(--color-ink)" }}>
              <div className="p-2.5 flex flex-col items-center glass-card" style={{ borderRadius: "var(--radius-md)" }}>
                <BiCalendar className="mb-0.5 text-base" style={{ color: "var(--color-route)" }} />
                <span>{date}</span>
              </div>
              <div className="p-2.5 flex flex-col items-center glass-card" style={{ borderRadius: "var(--radius-md)" }}>
                <BiTime className="mb-0.5 text-base" style={{ color: "var(--color-route)" }} />
                <span>{time}</span>
              </div>
              <div className="p-2.5 flex flex-col items-center glass-card" style={{ borderRadius: "var(--radius-md)" }}>
                <BiUser className="mb-0.5 text-base" style={{ color: "var(--color-route)" }} />
                <span>{guests} Guests</span>
              </div>
            </div>
            <div className="mt-4 p-3 text-white text-center text-xs font-bold shadow-sm noise-overlay" style={{ backgroundColor: "var(--color-route)", borderRadius: "var(--radius-md)" }}>
              Show at Host desk: {selectedDeal.deal}
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setConfirmed(false);
            setSelectedDeal(null);
          }}
          className="w-full py-3.5 text-white font-bold text-sm transition-all duration-150 shadow-md hover:brightness-105 active:scale-[0.98] cursor-pointer glow-orange"
          style={{ backgroundColor: "var(--color-route)", borderRadius: "var(--radius-md)" }}
        >
          Book Another Restaurant
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: "var(--bg-base)" }}>
      {/* Hero Banner */}
      <div 
        className="relative text-white py-16 px-4 md:px-8 shadow-sm overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.45)), url('https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80')` }}
      >
        <div className="mx-auto max-w-3xl text-center space-y-3 relative z-10">
          <div 
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase text-white"
            style={{ backgroundColor: "var(--color-route)" }}
          >
            <BiSpa /> Forkful Dineout
          </div>
          <h1 className="text-3xl md:text-5xl font-black font-display tracking-tight leading-tight text-white drop-shadow-md">
            Book Table & Get Up To <span style={{ color: "var(--color-thermal)" }}>50% Discount</span>
          </h1>
          <p className="text-sm text-gray-200 max-w-md mx-auto font-medium drop-shadow">
            Pre-book tables at top restaurants and get flat discounts on food and drinks.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {selectedDeal ? (
          /* booking Form */
          <form onSubmit={handleBookTable} className="p-6 md:p-8 shadow-lg space-y-6 max-w-xl mx-auto glass-card" style={{ borderRadius: "var(--radius-lg)" }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--color-rule)" }}>
              <h2 className="text-lg font-black font-display" style={{ color: "var(--color-ink)" }}>
                Book table at {selectedDeal.name}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedDeal(null)}
                className="text-xs font-bold hover:text-orange-500 transition-colors cursor-pointer"
                style={{ color: "var(--color-ghost)" }}
              >
                Cancel
              </button>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold" style={{ color: "var(--color-manifest)" }}>BOOKING DATE</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs px-4 py-3 outline-none transition glass-input input-focus-ring"
                  style={{ borderRadius: "var(--radius-md)" }}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold" style={{ color: "var(--color-manifest)" }}>TIME SLOT</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full text-xs px-4 py-3 outline-none transition glass-input input-focus-ring"
                  style={{ borderRadius: "var(--radius-md)" }}
                  required
                />
              </div>
            </div>

            {/* Guests & Contact Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold" style={{ color: "var(--color-manifest)" }}>NUMBER OF GUESTS</label>
                <select
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  className="w-full text-xs px-4 py-3 outline-none transition glass-input"
                  style={{ borderRadius: "var(--radius-md)" }}
                >
                  <option value="1">1 Guest</option>
                  <option value="2">2 Guests</option>
                  <option value="4">4 Guests</option>
                  <option value="6">6 Guests</option>
                  <option value="8">8+ Guests</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold" style={{ color: "var(--color-manifest)" }}>CONTACT NAME</label>
                <input
                  type="text"
                  placeholder="Your Name..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs px-4 py-3 outline-none transition glass-input input-focus-ring"
                  style={{ borderRadius: "var(--radius-md)" }}
                  required
                />
              </div>
            </div>

            <div 
              className="p-3 border text-xs font-bold flex items-center gap-1.5"
              style={{ backgroundColor: "var(--color-route-light)", borderColor: "var(--color-route)", color: "var(--color-route)", borderRadius: "var(--radius-md)" }}
            >
              <BiPurchaseTag className="text-sm flex-shrink-0" />
              <span>Pre-booked Deal: {selectedDeal.deal}</span>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 text-white font-bold text-sm transition-all duration-150 shadow-md hover:brightness-105 active:scale-[0.98] cursor-pointer glow-orange"
              style={{ backgroundColor: "var(--color-route)", borderRadius: "var(--radius-md)" }}
            >
              Confirm Reservation
            </button>
          </form>
        ) : (
          /* deals List */
          <div className="space-y-6">
            <h3 className="text-xs font-body tracking-wider uppercase font-semibold text-slate-500" style={{ color: "var(--color-ghost)" }}>
              Select a Dining Deal Near You
            </h3>

            {loading ? (
              <div className="text-center py-12 font-medium" style={{ color: "var(--color-ghost)" }}>
                Loading Dineout Deals...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="p-4 flex space-x-4 glass-card card-lift cursor-pointer"
                    style={{ borderRadius: "var(--radius-lg)" }}
                    onClick={() => setSelectedDeal(deal)}
                  >
                    <div className="h-20 w-20 overflow-hidden flex-shrink-0" style={{ borderRadius: "var(--radius-md)" }}>
                      <img src={deal.image} alt={deal.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <h4 className="text-sm font-bold truncate" style={{ color: "var(--color-ink)" }}>{deal.name}</h4>
                      <p className="text-[9px] font-body tracking-wide uppercase truncate" style={{ color: "var(--color-manifest)" }}>{deal.cuisine}</p>
                      <p className="text-xs truncate" style={{ color: "var(--color-ghost)" }}>{deal.address}</p>
                      <div className="flex items-center justify-between pt-2">
                        <span 
                          className="text-[10px] font-black px-2 py-0.5 rounded border"
                          style={{ backgroundColor: "var(--color-signal-light)", borderColor: "var(--color-signal)", color: "var(--color-signal)" }}
                        >
                          {deal.deal}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedDeal(deal); }}
                          className="text-white px-4 py-1.5 text-xs font-bold transition-all duration-150 shadow-sm active:scale-[0.96] hover:brightness-105 cursor-pointer"
                          style={{ backgroundColor: "var(--color-route)", borderRadius: "var(--radius-sm)" }}
                        >
                          Book Table
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dineout;
