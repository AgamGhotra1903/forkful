import { useState, useEffect } from "react";
import { BiGift, BiMapPin, BiTime, BiPackage, BiBadgeCheck } from "react-icons/bi";
import toast from "react-hot-toast";

const Genie = () => {
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [category, setCategory] = useState("Documents");
  const [details, setDetails] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [bookingStep, setBookingStep] = useState(0);

  const steps = [
    { label: "Finding nearest Forkful Courier...", icon: <BiPackage className="text-xl" /> },
    { label: "Courier assigned & heading to pickup address...", icon: <BiMapPin className="text-xl" /> },
    { label: "Courier reached pickup, checking package items...", icon: <BiPackage className="text-xl" /> },
    { label: "In-transit towards your drop address...", icon: <BiTime className="text-xl" /> },
    { label: "Task completed! Package delivered successfully.", icon: <BiBadgeCheck className="text-xl" /> }
  ];

  const handleBookTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup.trim() || !drop.trim()) {
      toast.error("Please enter both pickup and drop-off addresses");
      return;
    }
    setIsBooking(true);
    setBookingStep(0);
    toast.success("Forkful Genie task created successfully!");
  };

  useEffect(() => {
    if (!isBooking) return;
    if (bookingStep >= steps.length - 1) return;

    const timer = setTimeout(() => {
      setBookingStep((prev) => prev + 1);
    }, 4000); // Transitions stage every 4 seconds

    return () => clearTimeout(timer);
  }, [isBooking, bookingStep]);

  if (isBooking) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center space-y-6">
        <div 
          className="inline-flex h-20 w-20 items-center justify-center rounded-full text-white text-4xl animate-bounce shadow-md"
          style={{ backgroundColor: "var(--color-route)" }}
        >
          {steps[bookingStep].icon}
        </div>
        <h2 className="text-2xl font-black font-display text-slate-800 dark:text-slate-100">Genie Live Tracker</h2>
        
        <div className="border p-6 text-left space-y-6 glass-card" style={{ borderColor: "var(--color-rule)", borderRadius: "var(--radius-lg)" }}>
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--color-rule)" }}>
            <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: "var(--color-route)" }}>
              <BiGift /> Task: {category}
            </span>
            <span className="text-[10px] text-white px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: "var(--color-route)" }}>
              ID: FL-{Math.floor(1000 + Math.random() * 9000)}
            </span>
          </div>

          {/* Timeline steps */}
          <div className="status-track space-y-4">
            {steps.map((step, idx) => {
              const isCompleted = idx < bookingStep;
              const isActive = idx === bookingStep;
              return (
                <div key={idx} className={`status-node flex items-center space-x-3 ${isCompleted ? "done" : isActive ? "active" : ""}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold z-10 ${
                    isCompleted
                      ? "text-white"
                      : isActive
                        ? "text-white animate-pulse"
                        : "text-slate-400"
                  }`}
                  style={{
                    backgroundColor: isCompleted
                      ? "var(--color-signal)"
                      : isActive
                        ? "var(--color-route)"
                        : "var(--color-muted)"
                  }}
                  >
                    {isCompleted ? "✓" : idx + 1}
                  </div>
                  <span className={`text-xs ${
                    isActive ? "font-bold text-slate-900 dark:text-slate-100" : isCompleted ? "font-medium text-slate-700 dark:text-slate-300" : "text-slate-400"
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {bookingStep === steps.length - 1 && (
          <button
            onClick={() => setIsBooking(false)}
            className="w-full py-3.5 text-white font-bold text-sm transition-all duration-150 shadow-md hover:brightness-105 active:scale-[0.98] cursor-pointer glow-orange"
            style={{ backgroundColor: "var(--color-route)", borderRadius: "var(--radius-md)" }}
          >
            Create Another Task
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: "var(--bg-base)" }}>
      {/* Hero Banner */}
      <div 
        className="relative text-white py-16 px-4 md:px-8 shadow-sm overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.45)), url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80')` }}
      >
        <div className="mx-auto max-w-3xl text-center space-y-3 relative z-10">
          <div 
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase text-white"
            style={{ backgroundColor: "var(--color-route)" }}
          >
            <BiGift /> Forkful Genie
          </div>
          <h1 className="text-3xl md:text-5xl font-black font-display tracking-tight leading-tight text-white drop-shadow-md">
            Pickup or Drop <span style={{ color: "var(--color-thermal)" }}>Anything</span> Instantly
          </h1>
          <p className="text-sm text-gray-200 max-w-md mx-auto font-medium drop-shadow">
            We will pick up keys, documents, lunch boxes, medicines, or gifts and deliver them in no time.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8">
        <form onSubmit={handleBookTask} className="p-6 md:p-8 shadow-lg space-y-6 glass-card" style={{ borderRadius: "var(--radius-lg)" }}>
          <h2 className="text-lg font-black font-display border-b pb-3" style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}>
            Book a Genie Task
          </h2>

          {/* Pickup Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold flex items-center gap-1" style={{ color: "var(--color-manifest)" }}>
              <BiMapPin style={{ color: "var(--color-route)" }} /> PICKUP ADDRESS
            </label>
            <input
              type="text"
              placeholder="Apartment/Flat, Block, Street Name..."
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              className="w-full text-xs px-4 py-3 outline-none transition glass-input input-focus-ring"
              style={{ borderRadius: "var(--radius-md)" }}
              required
            />
          </div>

          {/* Drop Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold flex items-center gap-1" style={{ color: "var(--color-manifest)" }}>
              <BiMapPin style={{ color: "var(--color-thermal)" }} /> DROP-OFF ADDRESS
            </label>
            <input
              type="text"
              placeholder="Recipient Address, Floor, Landmark..."
              value={drop}
              onChange={(e) => setDrop(e.target.value)}
              className="w-full text-xs px-4 py-3 outline-none transition glass-input input-focus-ring"
              style={{ borderRadius: "var(--radius-md)" }}
              required
            />
          </div>

          {/* Package Category */}
          <div className="space-y-2">
            <label className="text-xs font-bold" style={{ color: "var(--color-manifest)" }}>WHAT WE ARE CARRYING</label>
            <div className="grid grid-cols-3 gap-2">
              {["Documents", "Food/Lunchbox", "Keys", "Medicines", "Clothes", "Others"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className="py-2.5 text-xs font-bold border transition duration-150 active:scale-[0.97] cursor-pointer"
                  style={
                    category === cat
                      ? { backgroundColor: "var(--color-route)", color: "white", borderColor: "var(--color-route)", borderRadius: "var(--radius-md)" }
                      : { backgroundColor: "var(--bg-surface)", color: "var(--color-manifest)", borderColor: "var(--color-rule)", borderRadius: "var(--radius-md)" }
                  }
                  onMouseEnter={(e) => {
                    if (category !== cat) {
                      e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)";
                      e.currentTarget.style.borderColor = "rgba(255,87,51,0.25)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (category !== cat) {
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

          {/* Item details */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold" style={{ color: "var(--color-manifest)" }}>TASK INSTRUCTIONS / DESCRIPTION (OPTIONAL)</label>
            <textarea
              placeholder="Provide courier details or delivery instructions..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full text-xs px-4 py-3 outline-none transition h-20 glass-input input-focus-ring"
              style={{ borderRadius: "var(--radius-md)" }}
            />
          </div>

          {/* Pricing Info */}
          <div 
            className="border p-4 flex items-center justify-between shadow-inner"
            style={{ backgroundColor: "var(--color-route-light)", borderColor: "var(--color-route)", color: "var(--color-route)", borderRadius: "var(--radius-md)" }}
          >
            <div>
              <p className="text-[10px] font-body tracking-wider uppercase font-bold flex items-center gap-1">
                <BiTime /> Estimated Duration
              </p>
              <h4 className="text-lg font-black">25 - 35 mins</h4>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-body tracking-wider uppercase font-bold">Genie Fee</p>
              <h4 className="text-xl font-black">₹79</h4>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 text-white font-bold text-sm transition-all duration-150 shadow-md hover:brightness-105 active:scale-[0.98] cursor-pointer glow-orange"
            style={{ backgroundColor: "var(--color-route)", borderRadius: "var(--radius-md)" }}
          >
            Create Task & Summon Genie
          </button>
        </form>
      </div>
    </div>
  );
};

export default Genie;
