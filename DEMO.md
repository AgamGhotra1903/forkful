# Forkful — End-to-End Demo Walkthrough

> A full food delivery platform with real-time order tracking, tri-party chat,
> AI search, live maps, and admin controls.

---

## 🚀 Quick Start

```bash
# From the project root, start all services
bash start-all.sh

# OR start individually
cd services/auth      && npm run dev &
cd services/restaurant && npm run dev &
cd services/rider     && npm run dev &
cd services/realtime  && npm run dev &
cd services/utils     && npm run dev &
cd services/admin     && npm run dev &
cd frontend           && npm run dev
```

Frontend runs on **http://localhost:5173**

---

## 📦 One-time Data Seed

> Run this once. It is fully idempotent — safe to run multiple times.

```bash
cd services/restaurant
npx tsx src/seeds/testData.ts
```

**What it seeds:**
| Record | Email | Role |
|--------|-------|------|
| Forkful Admin | admin@forkful.dev | admin |
| Spice Garden (seller) | spicegarden@forkful.dev | seller |
| Pizza Square (seller) | pizzasquare@forkful.dev | seller |
| Arjun Singh (rider) | arjun.rider@forkful.dev | rider |
| Rahul Verma (rider) | rahul.rider@forkful.dev | rider |

---

## 🎭 Demo Scenario: Full Order Lifecycle

### Step 1 — Customer Places an Order
1. Open **http://localhost:5173** and sign in via Google
2. Allow location access when prompted
3. Browse to **Spice Garden** or **Pizza Square**
4. Add items to cart → go to **Cart**
5. Apply promo code `NEW50` for 50% off
6. Proceed to **Checkout** → add a delivery address → place order (COD)
7. You'll see the **Order Tracking** page with the 7-step status stepper

### Step 2 — Restaurant Accepts Order
1. Open a new incognito window and sign in as `spicegarden@forkful.dev`
2. You should be routed to the **Restaurant Dashboard**
3. In the **Orders** tab, click **Accept** → **Start Preparing** → **Mark Ready**
4. Each click emits a Socket.io event that updates the customer's tracking page in real-time

### Step 3 — Rider Assignment & Delivery
1. Open another incognito window and sign in as `arjun.rider@forkful.dev`
2. In the **Rider Dashboard**, toggle **Online**
3. When an order is assigned, you'll see it appear in the incoming orders feed
4. Accept the order → update status through: Picked Up → Delivered

### Step 4 — Live Chat
- On the **Order Tracking** page, tap the orange 💬 **Chat FAB** button
- All three parties (customer, restaurant, rider) can message each other in real-time
- Messages are color-coded by role and routed through Socket.io rooms

### Step 5 — Admin Announcement
1. Sign in as `admin@forkful.dev`
2. In the Admin panel, use the Messaging tab to send a broadcast
3. The purple announcement banner will appear on **all connected clients**

---

## 🔌 Key API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/restaurant/ai-search` | Claude-powered restaurant search with fuzzy fallback |
| `GET` | `/api/v1/restaurant/nearby-discovery` | OSM Overpass API venue discovery |
| `POST` | `/api/v1/internal/broadcast` | Admin system-wide Socket.io broadcast |
| `POST` | `/api/v1/internal/emit` | Targeted room Socket.io emit |
| `POST` | `/api/v1/order/cancel/:orderId` | Cancel a placed order |

---

## 🔑 Environment Keys Required

| Key | Service | Purpose |
|-----|---------|---------|
| `ANTHROPIC_API_KEY` | restaurant | Claude AI search (falls back to fuzzy without it) |
| `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` | utils | Payment processing |
| `STRIPE_SECRET_KEY` | utils | Stripe payments |
| `CLOUDINARY_*` | utils | Image uploads |
| `JWT_SEC` | auth, all | JWT signing |
| `INTERNAL_SERVICE_KEY` | realtime | Service-to-service auth |

---

## 🏗️ Architecture Overview

```
Customer Browser ←──────────────────────────┐
Restaurant Dashboard ←──── Socket.io ────── Realtime Service
Rider Dashboard ←──────────────────────────┘
                                │
                    ┌─────────────────────┐
                    │   REST Services     │
                    ├─────────────────────┤
                    │ auth     :3001      │
                    │ restaurant :3002    │
                    │ rider    :3003      │
                    │ realtime :3004      │
                    │ utils    :3005      │
                    │ admin    :3006      │
                    └─────────────────────┘
                                │
                          MongoDB + RabbitMQ
```

---

## ✅ Feature Checklist

- [x] **Tri-party real-time chat** — customer, restaurant, rider per order
- [x] **Order status stepper** — 7-step visual timeline with pulsing active state
- [x] **AI smart search** — Claude API with fuzzy fallback
- [x] **OSM nearby discovery** — Overpass API venue cards
- [x] **Live order map** — animated rider location tracking
- [x] **Admin broadcasts** — purple announcement banners system-wide
- [x] **Idempotent data seed** — full sandbox with restaurants, riders, admin
- [x] **Typo fix sweep** — `quauntity`, `isAvailble`, `fromattedAddress`, `platfromFee` all corrected
- [x] **Promo code engine** — NEW50, FREEDEL, NIGHT30
- [x] **Dark/light mode** — persistent via localStorage
