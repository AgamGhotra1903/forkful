/**
 * Forkful Idempotent Seed Script
 * ─────────────────────────────
 * Run: npx ts-node --esm services/restaurant/src/seeds/testData.ts
 *
 * Seeds (all operations are upsert-safe / idempotent):
 *  1. Auth DB: seller users for Spice Garden and Pizza Square
 *  2. Auth DB: rider users Arjun Singh and Rahul Verma
 *  3. Auth DB: default admin account
 *  4. Restaurant DB: Spice Garden + menu items
 *  5. Restaurant DB: Pizza Square + menu items
 *  6. Rider DB: rider profiles for the two riders
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";

// ── Models ────────────────────────────────────────────────────────────────────

// Shared auth user schema (auth service DB)
const userSchema = new mongoose.Schema({
  name:  { type: String, required: true },
  email: { type: String, required: true, unique: true },
  image: { type: String, required: true },
  role:  { type: String, default: null },
}, { timestamps: true });

// Restaurant schema
const restaurantSchema = new mongoose.Schema({
  name: String,
  description: String,
  image: String,
  ownerId: String,
  phone: Number,
  isVerified: Boolean,
  autoLocation: {
    type:        { type: String, enum: ["Point"], required: true },
    coordinates: { type: [Number], required: true },
    formattedAddress: String,
  },
  isOpen: { type: Boolean, default: true },
}, { timestamps: true });
restaurantSchema.index({ autoLocation: "2dsphere" });

// MenuItem schema
const menuItemSchema = new mongoose.Schema({
  restaurantId: mongoose.Types.ObjectId,
  name:        String,
  description: String,
  image:       String,
  price:       Number,
  isAvailable: { type: Boolean, default: true },
  category:    String,
}, { timestamps: true });

// Rider schema (mirrors rider service)
const riderSchema = new mongoose.Schema({
  userId:               String,
  name:                 String,
  phoneNumber:          String,
  aadharNumber:         String,
  drivingLicenseNumber: String,
  picture:              String,
  isVerified:           { type: Boolean, default: true },
  isAvailable:          { type: Boolean, default: true },
  location: {
    type:        { type: String, enum: ["Point"], required: false },
    coordinates: { type: [Number], required: false },
  },
}, { timestamps: true });
riderSchema.index({ location: "2dsphere" });

// ── Seed Data ─────────────────────────────────────────────────────────────────

const RESTAURANT_SEED = [
  {
    user: {
      name:  "Spice Garden",
      email: "spicegarden@forkful.dev",
      image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=300&q=80",
      role:  "seller",
    },
    restaurant: {
      name:        "Spice Garden",
      description: "Authentic North Indian cuisine — rich curries, tandoori classics, and fresh breads",
      image:       "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80",
      phone:       9876543210,
      isVerified:  true,
      autoLocation: {
        type:        "Point",
        coordinates: [77.2090, 28.6139], // New Delhi coords
        formattedAddress: "Connaught Place, New Delhi, 110001",
      },
      isOpen: true,
    },
    menu: [
      { name: "Butter Chicken", description: "Creamy tomato-based chicken curry", price: 280, category: "Mains", image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=300&q=80" },
      { name: "Paneer Tikka Masala", description: "Chargrilled cottage cheese in spiced gravy", price: 240, category: "Mains", image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=300&q=80" },
      { name: "Dal Makhani", description: "Slow-cooked black lentils with cream and butter", price: 180, category: "Mains", image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=300&q=80" },
      { name: "Garlic Naan", description: "Soft leavened bread with garlic and butter", price: 60, category: "Breads", image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=300&q=80" },
      { name: "Jeera Rice", description: "Fragrant cumin-flavored basmati rice", price: 120, category: "Rice", image: "https://images.unsplash.com/photo-1596560548464-f010549b84d7?auto=format&fit=crop&w=300&q=80" },
      { name: "Mango Lassi", description: "Thick chilled yoghurt drink with alphonso mango", price: 90, category: "Drinks", image: "https://images.unsplash.com/photo-1587467512961-120760940315?auto=format&fit=crop&w=300&q=80" },
    ],
  },
  {
    user: {
      name:  "Pizza Square",
      email: "pizzasquare@forkful.dev",
      image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80",
      role:  "seller",
    },
    restaurant: {
      name:        "Pizza Square",
      description: "Premium handcrafted pizzas with Italian-imported mozzarella and fresh toppings",
      image:       "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
      phone:       9812345678,
      isVerified:  true,
      autoLocation: {
        type:        "Point",
        coordinates: [77.2167, 28.6368], // North Delhi
        formattedAddress: "Karol Bagh, New Delhi, 110005",
      },
      isOpen: true,
    },
    menu: [
      { name: "Margherita Pizza", description: "Classic tomato base, fresh mozzarella, basil", price: 299, category: "Pizzas", image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=300&q=80" },
      { name: "BBQ Chicken Pizza", description: "Grilled chicken, BBQ sauce, onions, bell peppers", price: 349, category: "Pizzas", image: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=300&q=80" },
      { name: "Veggie Supreme", description: "All garden-fresh vegetables on a herb-tomato base", price: 279, category: "Pizzas", image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=300&q=80" },
      { name: "Garlic Bread with Cheese", description: "Crispy baguette with herb butter and mozzarella", price: 149, category: "Sides", image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=300&q=80" },
      { name: "Pasta Arrabiata", description: "Penne in spicy tomato sauce with fresh basil", price: 229, category: "Pasta", image: "https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=300&q=80" },
      { name: "Lemonade Fizz", description: "Chilled sparkling lemonade with fresh mint", price: 89, category: "Drinks", image: "https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=300&q=80" },
    ],
  },
];

const RIDER_SEED = [
  {
    user: {
      name:  "Arjun Singh",
      email: "arjun.rider@forkful.dev",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
      role:  "rider",
    },
    profile: {
      name:                 "Arjun Singh",
      phoneNumber:          "9876501234",
      aadharNumber:         "1234-5678-9012",
      drivingLicenseNumber: "DL-0123456789",
      picture:              "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
      isVerified:           true,
      isAvailable:          true,
      location:             { type: "Point", coordinates: [77.2090, 28.6139] },
    },
  },
  {
    user: {
      name:  "Rahul Verma",
      email: "rahul.rider@forkful.dev",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
      role:  "rider",
    },
    profile: {
      name:                 "Rahul Verma",
      phoneNumber:          "9812309876",
      aadharNumber:         "9876-5432-1098",
      drivingLicenseNumber: "DL-9876543210",
      picture:              "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
      isVerified:           true,
      isAvailable:          true,
      location:             { type: "Point", coordinates: [77.2167, 28.6368] },
    },
  },
];

const ADMIN_SEED = {
  name:  "Forkful Admin",
  email: "admin@forkful.dev",
  image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80",
  role:  "admin",
};

// ── Runner ────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Forkful Seed Script starting...\n");

  // Connect to the database
  const authConn = await mongoose.createConnection(MONGO_URI, { dbName: "Zomato_Clone" }).asPromise();
  const restConn = await mongoose.createConnection(MONGO_URI, { dbName: "Zomato_Clone" }).asPromise();
  const riderConn = await mongoose.createConnection(MONGO_URI, { dbName: "Zomato_Clone" }).asPromise();

  console.log("✅ Connected to MongoDB\n");

  const AuthUser   = authConn.model("User", userSchema);
  const Restaurant = restConn.model("Restaurant", restaurantSchema);
  const MenuItem   = restConn.model("MenuItem", menuItemSchema);
  const RiderUser  = authConn.model("User_rider", userSchema, "users");  // same collection
  const RiderProf  = riderConn.model("Rider", riderSchema);

  // ── Admin ──
  const admin = await AuthUser.findOneAndUpdate(
    { email: ADMIN_SEED.email },
    { $setOnInsert: ADMIN_SEED },
    { upsert: true, new: true }
  );
  console.log(`👑 Admin: ${admin.name} (${admin._id})`);

  // ── Restaurants ──
  for (const seed of RESTAURANT_SEED) {
    // Upsert seller user
    const sellerUser = await AuthUser.findOneAndUpdate(
      { email: seed.user.email },
      { $setOnInsert: seed.user },
      { upsert: true, new: true }
    );
    console.log(`👨‍🍳 Seller user: ${sellerUser.name} (${sellerUser._id})`);

    // Upsert restaurant (by name + ownerId)
    const rest = await Restaurant.findOneAndUpdate(
      { name: seed.restaurant.name },
      { $setOnInsert: { ...seed.restaurant, ownerId: String(sellerUser._id) } },
      { upsert: true, new: true }
    );
    console.log(`🍽️  Restaurant: ${rest.name} (${rest._id})`);

    // Upsert menu items (by restaurantId + name)
    for (const item of seed.menu) {
      await MenuItem.findOneAndUpdate(
        { restaurantId: rest._id, name: item.name },
        { $setOnInsert: { ...item, restaurantId: rest._id, isAvailable: true } },
        { upsert: true, new: true }
      );
    }
    console.log(`   ↳ ${seed.menu.length} menu items seeded`);
  }

  // ── Riders ──
  for (const seed of RIDER_SEED) {
    const riderUser = await AuthUser.findOneAndUpdate(
      { email: seed.user.email },
      { $setOnInsert: seed.user },
      { upsert: true, new: true }
    );
    console.log(`🏍️  Rider user: ${riderUser.name} (${riderUser._id})`);

    await RiderProf.findOneAndUpdate(
      { userId: String(riderUser._id) },
      { $setOnInsert: { ...seed.profile, userId: String(riderUser._id) } },
      { upsert: true, new: true }
    );
    console.log(`   ↳ Rider profile seeded`);
  }

  await authConn.close();
  await restConn.close();
  await riderConn.close();

  console.log("\n✅ Seed completed successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
