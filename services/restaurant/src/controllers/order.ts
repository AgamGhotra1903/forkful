import axios from "axios";
import mongoose from "mongoose";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Address from "../models/Address.js";
import Cart from "../models/Cart.js";
import { IMenuItem } from "../models/MenuItems.js";
import Order from "../models/Order.js";
import Restaurant, { IRestaurant } from "../models/Restaurant.js";
import { publishEvent } from "../config/order.publisher.js";

const getDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return +(R * c).toFixed(2);
};

export const createOrder = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const { paymentMethod, addressId, riderTip = 0, surgeAmount = 0 } = req.body;

  if (!addressId) {
    return res.status(400).json({
      message: "Address is required",
    });
  }

  const address = await Address.findOne({
    _id: addressId,
    userId: user._id,
  });

  if (!address) {
    return res.status(404).json({
      message: "Address Not found",
    });
  }

  const cartItems = await Cart.find({ userId: user._id })
    .populate<{ itemId: IMenuItem }>("itemId")
    .populate<{ restaurantId: IRestaurant }>("restaurantId");

  if (cartItems.length === 0) {
    return res.status(400).json({ message: "Cart is empty" });
  }

  const firstCartItem = cartItems[0];

  if (!firstCartItem || !firstCartItem.restaurantId) {
    return res.status(400).json({
      message: "Invailid Cart Data",
    });
  }

  const restaurantId = firstCartItem.restaurantId._id;

  const restaurant = await Restaurant.findById(restaurantId);

  if (!restaurant) {
    return res.status(404).json({
      message: "No restaurant with this id",
    });
  }

  if (!restaurant.isVerified && !restaurant.isOpen) {
    return res.status(400).json({
      message: "This restaurant is not verified yet",
    });
  }

  if (!restaurant.isOpen) {
    return res.status(400).json({
      message: "Sorry this restaurant is closed for now",
    });
  }

  const distance = getDistanceKm(
    address.location.coordinates[1],
    address.location.coordinates[0],
    restaurant.autoLocation.coordinates[1],
    restaurant.autoLocation.coordinates[0]
  );

  let subtotal = 0;

  const orderItems = cartItems.map((cart) => {
    const item = cart.itemId;

    if (!item) {
      throw new Error("Invalid cart item");
    }

    const itemTotal = item.price * cart.quantity;

    subtotal += itemTotal;

    return {
      itemId: item._id.toString(),
      name: item.name,
      price: item.price,
      quantity: cart.quantity,
    };
  });

  const deliveryFee = subtotal < 250 ? 49 : 0;
  const platformFee = 7;
  const tipAmount = Math.max(0, Math.min(30, Number(riderTip) || 0));
  const parsedSurge = Math.max(0, Number(surgeAmount) || 0);
  let totalAmount = subtotal + deliveryFee + platformFee + tipAmount + parsedSurge;

  let usedRewardDiscountTier = 0;
  let currentRewardPoints = 0;
  
  const userDoc = await mongoose.connection.db?.collection("users").findOne({ _id: new mongoose.Types.ObjectId(user._id) });
  if (userDoc) {
    currentRewardPoints = userDoc.rewardPoints || 0;
  }

  if (currentRewardPoints >= 500) {
    totalAmount = Math.max(0, totalAmount - 200);
    usedRewardDiscountTier = 500;
  } else if (currentRewardPoints >= 200) {
    totalAmount = Math.max(0, totalAmount - 55);
    usedRewardDiscountTier = 200;
  }

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  const [longitude, latitude] = address.location.coordinates;

  const riderAmount = Math.ceil(distance) * 17;

  const order = await Order.create({
    userId: user._id.toString(),
    restaurantId: restaurantId.toString(),
    restaurantName: restaurant.name,
    riderId: null,
    distance,
    riderAmount,
    items: orderItems,
    subtotal,
    deliveryFee,
    platformFee,
    riderTip: tipAmount,
    surgeAmount: parsedSurge,
    totalAmount,
    restaurantPhone: restaurant.phone,
    restaurantLocation: {
      latitude: restaurant.autoLocation?.coordinates?.[1],
      longitude: restaurant.autoLocation?.coordinates?.[0],
      formattedAddress: restaurant.autoLocation?.formattedAddress || "",
    },
    addressId: address._id.toString(),
    deliveryAddress: {
      formattedAddress: address.formattedAddress,
      mobile: address.mobile,
      latitude,
      longitude,
    },

    paymentMethod,
    paymentStatus: "pending",
    status: "placed",
    statusHistory: [{ status: "placed", timestamp: new Date() }],
    ...(paymentMethod !== "cod" ? { expiresAt } : {}),
  });

  const pointsDelta = 50 - usedRewardDiscountTier;
  await mongoose.connection.db?.collection("users").updateOne(
    { _id: new mongoose.Types.ObjectId(user._id) },
    { $inc: { rewardPoints: pointsDelta } }
  );

  await Cart.deleteMany({ userId: user._id });

  if (paymentMethod === "cod") {
    try {
      await axios.post(
        `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
        {
          event: "order:new",
          room: `restaurant:${order.restaurantId}`,
          payload: {
            orderId: order._id.toString(),
          },
        },
        {
          headers: {
            "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
          },
        }
      );
    } catch (err: any) {
      console.error("Failed to emit order:new for COD:", err.message);
    }
  }

  res.json({
    message: "Order created successfully",
    orderId: order._id.toString(),
    amount: totalAmount,
  });
});

export const fetchOrderForPayment = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      message: "Order not found",
    });
  }

  if (order.paymentStatus !== "pending") {
    return res.status(400).json({
      message: "Order already paid",
    });
  }

  res.json({
    orderId: order._id,
    amount: order.totalAmount,
    currency: "INR",
    paymentSessionId: order.paymentSessionId,
    paymentSessionUrl: order.paymentSessionUrl,
  });
});

export const fetchOrderInternal = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      message: "Order not found",
    });
  }

  res.json(order);
});

export const fetchRestaurantOrders = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    const { restaurantId } = req.params;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!restaurantId) {
      return res.status(400).json({
        message: "Restaurant id is required",
      });
    }

    const limit = req.query.limit ? Number(req.query.limit) : 0;

    const orders = await Order.find({
      restaurantId,
      $or: [
        { paymentStatus: "paid" },
        { paymentMethod: "cod" }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.json({
      success: true,
      count: orders.length,
      orders,
    });
  }
);

// Restaurant-controlled statuses only. "rider_assigned" is intentionally
// excluded: a rider can only ever be assigned via assignRiderToOrder
// (automatic matching) or manualAssignRider (restaurant fallback), both of
// which write riderId atomically. This endpoint must never be able to set
// rider_assigned itself, or it can silently steal an order out of the
// unclaimed pool before any real rider sees it.
const RESTAURANT_ALLOWED_STATUSES = [
  "accepted",
  "preparing",
  "ready_for_rider",
  "cancelled",
] as const;

// Explicit transition table: from -> set of statuses it may legally move to.
// Anything not listed here is rejected, regardless of who calls the API.
const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  placed: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready_for_rider", "cancelled"],
  ready_for_rider: ["rider_assigned", "cancelled"],
  rider_assigned: ["picked_up", "cancelled"],
  picked_up: ["delivered"],
  delivered: [],
  cancelled: [],
};

export const updateOrderStatus = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    const { orderId } = req.params;
    const { status } = req.body;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!RESTAURANT_ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status",
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (order.paymentStatus !== "paid" && order.paymentMethod !== "cod") {
      return res.status(404).json({
        message: "Order not completed",
      });
    }

    const restaurant = await Restaurant.findById(order.restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant not found",
      });
    }

    if (restaurant.ownerId !== user._id.toString()) {
      return res.status(401).json({
        message: "You are not allowed to update this order",
      });
    }

    const legalNextStatuses = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
    if (!legalNextStatuses.includes(status)) {
      return res.status(400).json({
        message: `Cannot move order from '${order.status}' to '${status}'`,
      });
    }

    order.status = status;
    order.statusHistory.push({ status, timestamp: new Date() });

    if (status === "ready_for_rider") {
      order.readyForRiderAt = new Date();
    }

    if (status === "delivered" && order.paymentMethod === "cod") {
      order.paymentStatus = "paid";
    }

    await order.save();

    await axios.post(
      `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
      {
        event: "order:update",
        room: `user:${order.userId}`,
        payload: {
          orderId: order._id,
          status: order.status,
        },
      },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
      }
    );

    await axios.post(
      `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
      {
        event: "order:update",
        room: `user:${order._id}`,
        payload: {
          orderId: order._id,
          status: order.status,
        },
      },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
      }
    ).catch((err: any) => console.error("Realtime order room emit failed:", err.message));

    // now assign riders
    if (status === "ready_for_rider") {
      console.log(
        "Publishing Order ready for rider event for order",
        order._id
      );

      await publishEvent("ORDER_READY_FOR_RIDER", {
        orderId: order._id.toString(),
        restaurantId: restaurant._id.toString(),
        location: restaurant.autoLocation,
      });

      console.log("Event Published successfully");
    }

    res.json({
      message: "order status updated successfully",
      order,
    });
  }
);

export const getMyOrders = TryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const orders = await Order.find({
    userId: req.user._id.toString(),
    $or: [
      { paymentStatus: "paid" },
      { paymentMethod: "cod" }
    ]
  }).sort({ createdAt: -1 });

  res.json({ orders });
});

export const fetchSingleOrder = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (order.userId !== req.user._id.toString()) {
      return res.status(401).json({
        message: "You are not allowed to view this order",
      });
    }

    res.json(order);
  }
);

// Shared core used by both the automatic matching path (assignRiderToOrder)
// and the restaurant manual-override path (manualAssignRider). Single
// atomic findOneAndUpdate — no separate read-then-write — so two requests
// racing for the same order can never both "win".
const claimOrderForRider = async (
  orderId: string,
  riderId: string,
  riderName: string,
  riderPhone: number | string
) => {
  const orderUpdated = await Order.findOneAndUpdate(
    { _id: orderId, riderId: null, status: "ready_for_rider" },
    {
      riderId,
      riderName,
      riderPhone,
      status: "rider_assigned",
      $push: {
        statusHistory: { status: "rider_assigned", timestamp: new Date() },
      },
    },
    { new: true }
  );

  if (!orderUpdated) return null;

  const emit = (room: string) =>
    axios
      .post(
        `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
        { event: "order:rider_assigned", room, payload: orderUpdated },
        { headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY } }
      )
      .catch((err: any) =>
        console.error(`Realtime emit to ${room} failed:`, err.message)
      );

  await Promise.all([
    emit(`user:${orderUpdated.userId}`),
    emit(`user:${orderUpdated._id}`),
    emit(`restaurant:${orderUpdated.restaurantId}`),
  ]);

  return orderUpdated;
};

const checkRiderBatchEligibility = async (
  riderId: string,
  targetOrderId: string
): Promise<{ eligible: boolean; message?: string }> => {
  const targetOrder = await Order.findById(targetOrderId);
  if (!targetOrder) {
    return { eligible: false, message: "Order not found" };
  }

  const activeOrders = await Order.find({
    riderId,
    status: { $nin: ["delivered", "cancelled"] },
  });

  if (activeOrders.length === 0) {
    return { eligible: true };
  }

  if (activeOrders.length >= 2) {
    return {
      eligible: false,
      message: "Rider already has the maximum of 2 active batched orders",
    };
  }

  const existingOrder = activeOrders[0]!;

  // Batching checks: must be same restaurant and close dropoffs (< 3km)
  if (existingOrder.restaurantId.toString() !== targetOrder.restaurantId.toString()) {
    return {
      eligible: false,
      message: "Rider already has an active order from a different restaurant",
    };
  }

  const lat1 = existingOrder.deliveryAddress.latitude;
  const lon1 = existingOrder.deliveryAddress.longitude;
  const lat2 = targetOrder.deliveryAddress.latitude;
  const lon2 = targetOrder.deliveryAddress.longitude;

  const distance = getDistanceKm(lat1, lon1, lat2, lon2);
  if (distance > 3.0) {
    return {
      eligible: false,
      message: `Dropoff coordinates are too far apart (${distance.toFixed(1)} km). Max batch distance is 3 km.`,
    };
  }

  return { eligible: true };
};

export const assignRiderToOrder = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const { orderId, riderId, riderName, riderPhone } = req.body;

  // Check batch eligibility
  const batchCheck = await checkRiderBatchEligibility(riderId, orderId);
  if (!batchCheck.eligible) {
    return res.status(400).json({
      message: batchCheck.message || "Rider not eligible for batching",
    });
  }

  const orderUpdated = await claimOrderForRider(
    orderId,
    riderId,
    riderName,
    riderPhone
  );

  if (!orderUpdated) {
    return res.status(400).json({
      success: false,
      message: "Order already taken or no longer awaiting a rider",
    });
  }

  res.json({
    message: "Rider Assigned Successfully",
    success: true,
    order: orderUpdated,
  });
});

// ── Restaurant manual-assignment fallback ──────────────────────────────────
// Used only when automatic matching has exhausted its search radii
// (order:no_riders) and the restaurant wants to hand the order to a specific
// rider directly. The rider must be real, verified, and currently available
// — re-checked server-side against the rider service, never trusted from
// the request body alone.
export const getNearbyRidersForOrder = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { orderId } = req.params;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const restaurant = await Restaurant.findById(order.restaurantId);

    if (!restaurant || restaurant.ownerId !== user._id.toString()) {
      return res.status(403).json({
        message: "You are not allowed to view riders for this order",
      });
    }

    if (order.status !== "ready_for_rider") {
      return res.status(400).json({
        message: "Order is not awaiting a rider",
      });
    }

    try {
      const { data } = await axios.get(
        `${process.env.RIDER_SERVICE}/api/rider/internal/nearby`,
        {
          params: {
            latitude: restaurant.autoLocation?.coordinates?.[1],
            longitude: restaurant.autoLocation?.coordinates?.[0],
          },
          headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY },
        }
      );

      res.json({ riders: data.riders ?? [] });
    } catch (error: any) {
      res.status(502).json({
        message:
          error.response?.data?.message || "Failed to fetch nearby riders",
      });
    }
  }
);

export const manualAssignRider = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { orderId, riderId } = req.body;

    if (!orderId || !riderId) {
      return res.status(400).json({
        message: "orderId and riderId are required",
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const restaurant = await Restaurant.findById(order.restaurantId);

    if (!restaurant || restaurant.ownerId !== user._id.toString()) {
      return res.status(403).json({
        message: "You are not allowed to assign a rider to this order",
      });
    }

    if (order.status !== "ready_for_rider") {
      return res.status(400).json({
        message: "Order is not awaiting a rider",
      });
    }

    // Re-validate the chosen rider is real and currently available —
    // never trust riderId from the request body alone.
    let rider: { _id: string; name: string; phoneNumber: number } | null = null;
    try {
      const { data } = await axios.get(
        `${process.env.RIDER_SERVICE}/api/rider/internal/${riderId}`,
        { headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY } }
      );
      rider = data?.rider ?? null;
    } catch (error: any) {
      return res.status(502).json({
        message:
          error.response?.data?.message || "Failed to verify rider",
      });
    }

    if (!rider) {
      return res.status(400).json({
        message: "Selected rider is not available anymore",
      });
    }

    // Defense in depth: even though /internal/:riderId already filters to
    // isAvailable, double-check no other order already has this rider
    // actively assigned, in case that flag is ever out of sync.
    const riderBusy = await Order.findOne({
      riderId: rider._id,
      status: { $nin: ["delivered", "cancelled"] },
    });

    if (riderBusy) {
      return res.status(400).json({
        message: "Selected rider already has an active order",
      });
    }

    const orderUpdated = await claimOrderForRider(
      orderId,
      rider._id,
      rider.name,
      rider.phoneNumber
    );

    if (!orderUpdated) {
      return res.status(400).json({
        success: false,
        message: "Order already taken or no longer awaiting a rider",
      });
    }

    // Tell the rider service this rider is now busy, mirroring what
    // acceptOrder does for the self-service path.
    axios
      .post(
        `${process.env.RIDER_SERVICE}/api/rider/internal/${rider._id}/mark-busy`,
        {},
        { headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY } }
      )
      .catch((err: any) =>
        console.error("Failed to mark rider busy after manual assign:", err.message)
      );

    res.json({
      message: "Rider assigned successfully",
      success: true,
      order: orderUpdated,
    });
  }
);


export const getCurrentOrderForRider = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const { riderId } = req.query;

  if (typeof riderId !== "string") {
    return res.status(400).json({
      message: "Rider id is required and must be a string",
    });
  }

  const orders = await Order.find({
    riderId,
    status: { $nin: ["delivered", "cancelled"] },
  }).populate("restaurantId");

  if (orders.length === 0) {
    return res.status(404).json({
      message: "Order not found",
    });
  }

  res.json(orders);
});

export const checkRiderBatchEligibilityHTTP = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const { riderId, orderId } = req.query;

  if (typeof riderId !== "string" || typeof orderId !== "string") {
    return res.status(400).json({
      message: "Rider ID and Order ID are required",
    });
  }

  const check = await checkRiderBatchEligibility(riderId, orderId);
  res.json(check);
});

export const getSurgeCharge = TryCatch(async (req, res) => {
  const { restaurantId, latitude, longitude, weather } = req.query;

  if (typeof restaurantId !== "string" || !latitude || !longitude) {
    return res.status(400).json({ message: "restaurantId, latitude, and longitude are required" });
  }

  const latNum = Number(latitude);
  const lonNum = Number(longitude);

  let multiplier = 1.0;
  let reason = "Normal demand";

  try {
    // 1. Fetch active order demand for this restaurant
    const activeOrdersCount = await Order.countDocuments({
      restaurantId,
      status: { $in: ["preparing", "ready_for_rider"] }
    });

    // 2. Fetch nearby available riders count from Rider service
    const riderServiceUrl = process.env.RIDER_SERVICE || "http://localhost:5003";
    const { data } = await axios.get(
      `${riderServiceUrl}/api/rider/internal/nearby?latitude=${latNum}&longitude=${lonNum}`,
      {
        headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY }
      }
    );

    const availableRidersCount = data.riders?.length || 0;

    // 3. Compute supply/demand surge
    if (availableRidersCount === 0) {
      multiplier += 0.4;
      reason = "Few available riders in your area";
    } else if (activeOrdersCount > availableRidersCount * 1.5) {
      multiplier += 0.3;
      reason = "High demand of orders near restaurant";
    }

    // 4. Compute weather surge
    if (weather) {
      const weatherLower = String(weather).toLowerCase();
      if (weatherLower.includes("rain") || weatherLower.includes("drizzle")) {
        multiplier += 0.4;
        reason = "Rainy weather conditions";
      } else if (weatherLower.includes("snow") || weatherLower.includes("hail")) {
        multiplier += 0.5;
        reason = "Severe snow conditions";
      }
    }
  } catch (error: any) {
    console.error("[Surge] Error computing surge:", error.message);
  }

  // Cap multiplier at 2.5 max
  if (multiplier > 2.5) multiplier = 2.5;

  const baseSurgeFee = 35; // base surge fee markup component
  const surgeAmount = Math.round((multiplier - 1.0) * baseSurgeFee);

  res.json({
    success: true,
    multiplier: +multiplier.toFixed(2),
    surgeAmount,
    reason: multiplier > 1.0 ? reason : "Standard rate"
  });
});

// How long a broadcast order offer stays valid once ready_for_rider is set.
// Kept in one place since both the listing endpoint and the accept check
// need to agree on the same window.
export const RIDER_ACCEPT_WINDOW_MS = 30000; // 30 seconds

// Durable source of truth for "orders a rider can currently accept" —
// independent of whether any push notification ever reached them. A rider
// who comes online after an order went ready, or who missed a socket
// event, still sees it here. Sockets are only used to nudge an immediate
// re-fetch; this endpoint is what actually decides what's offerable.
export const getAvailableOrdersForRider = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const latitude = Number(req.query.latitude);
  const longitude = Number(req.query.longitude);

  const cutoff = new Date(Date.now() - RIDER_ACCEPT_WINDOW_MS);

  const filter: Record<string, any> = {
    status: "ready_for_rider",
    riderId: null,
    readyForRiderAt: { $gte: cutoff },
  };

  // Fetch a generous candidate pool before distance-filtering/sorting —
  // the 30s time window already keeps this small in practice, but we
  // don't want a hard limit here to silently exclude a closer order in
  // favor of a farther-but-older one before distance is even considered.
  const orders = await Order.find(filter)
    .sort({ readyForRiderAt: 1 })
    .limit(100)
    .lean();

  // Reasonable upper bound for "things a rider could plausibly be sent to
  // deliver" — generous enough to match the automatic matcher's widened
  // search, but bounded so a rider doesn't see orders from across the
  // city. If coordinates are missing (older clients, geolocation denied),
  // fall back to time-filtered only and skip distance filtering.
  const MAX_LISTING_RADIUS_METERS = 15000;
  const hasCoords = !Number.isNaN(latitude) && !Number.isNaN(longitude);

  const withDistance = orders
    .map((o) => {
      let distanceMeters: number | null = null;
      const lng = o.restaurantLocation?.longitude;
      const lat = o.restaurantLocation?.latitude;
      if (hasCoords && typeof lat === "number" && typeof lng === "number") {
        distanceMeters = haversineMeters(latitude, longitude, lat, lng);
      }
      return {
        orderId: o._id,
        restaurantId: o.restaurantId,
        restaurantName: o.restaurantName,
        restaurantLocation: o.restaurantLocation,
        totalAmount: o.totalAmount,
        riderAmount: o.riderAmount,
        readyForRiderAt: o.readyForRiderAt,
        expiresAt: o.readyForRiderAt
          ? new Date(new Date(o.readyForRiderAt).getTime() + RIDER_ACCEPT_WINDOW_MS)
          : null,
        distanceMeters,
      };
    })
    .filter((o) => {
      // Only actually exclude by distance when we both have the rider's
      // coordinates AND know the restaurant's coordinates. Orders missing
      // restaurant coordinates still show (time-filtered only) rather than
      // silently disappearing from the list due to incomplete data.
      if (!hasCoords || o.distanceMeters === null) return true;
      return o.distanceMeters <= MAX_LISTING_RADIUS_METERS;
    })
    .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))
    .slice(0, 20);

  res.json({ orders: withDistance });
});

// Simple haversine distance in meters between two lat/lng points.
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Shared broadcast used by both transitions below — three rooms, same
// payload shape, just a different (correct) event name per transition.
const broadcastOrderEvent = async (event: string, order: any) => {
  const emit = (room: string) =>
    axios
      .post(
        `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
        { event, room, payload: order },
        { headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY } }
      )
      .catch((err: any) =>
        console.error(`Realtime emit (${event}) to ${room} failed:`, err.message)
      );

  await Promise.all([
    emit(`restaurant:${order.restaurantId}`),
    emit(`user:${order.userId}`),
    emit(`user:${order._id}`),
  ]);
};

export const updateOrderStatusRider = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const { orderId, riderId } = req.body;

  if (!orderId || !riderId) {
    return res.status(400).json({
      message: "orderId and riderId are required",
    });
  }

  const order = await Order.findById(orderId);

  if (!order) {
    return res.status(404).json({
      message: "Order not found",
    });
  }

  // A rider may only ever advance the order they are actually assigned to.
  if (!order.riderId || order.riderId.toString() !== riderId.toString()) {
    return res.status(403).json({
      message: "You are not assigned to this order",
    });
  }

  if (order.status === "rider_assigned") {
    order.status = "picked_up";
    order.statusHistory.push({ status: "picked_up", timestamp: new Date() });
    await order.save();
    await broadcastOrderEvent("order:picked_up", order);

    return res.json({
      message: "Order updated Successfully",
      status: order.status,
      order,
    });
  }

  if (order.status === "picked_up") {
    order.status = "delivered";
    order.statusHistory.push({ status: "delivered", timestamp: new Date() });

    if (order.paymentMethod === "cod") {
      order.paymentStatus = "paid";
    }

    await order.save();
    await broadcastOrderEvent("order:delivered", order);

    // FIXED BUG 4: Increment earnings for both restaurant and rider on delivery
    try {
      // Increment restaurant earnings (revenue minus rider amount and rider tip)
      const restaurantEarnings = (order.totalAmount || 0) - (order.riderAmount || 0) - (order.riderTip || 0);
      await Restaurant.findByIdAndUpdate(
        order.restaurantId,
        { $inc: { totalEarnings: restaurantEarnings } }
      );
      console.log(`✅ Restaurant ${order.restaurantId} earnings +₹${restaurantEarnings}`);
    } catch (err: any) {
      console.error("Failed to update restaurant earnings:", err.message);
    }

    // Rider earnings are updated via the rider service (see rider controller)
    // We emit an event so the rider service can increment its own earnings
    try {
      await axios.post(
        `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
        {
          event: "order:earnings_update",
          room: `user:${order.riderId}`,
          payload: {
            orderId: order._id,
            riderAmount: (order.riderAmount || 0) + (order.riderTip || 0),
          },
        },
        { headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY } }
      );
    } catch (err: any) {
      console.error("Failed to emit earnings update:", err.message);
    }

    return res.json({
      message: "Order updated Successfully",
      status: order.status,
      order,
    });
  }

  return res.status(400).json({
    message: `Cannot advance order from its current status: '${order.status}'`,
  });
});

export const updatePaymentSession = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const { id } = req.params;
  const { paymentSessionId, paymentSessionUrl } = req.body;

  const order = await Order.findByIdAndUpdate(
    id,
    { paymentSessionId, paymentSessionUrl },
    { new: true }
  );

  if (!order) {
    return res.status(404).json({
      message: "Order not found",
    });
  }

  res.json({
    message: "Payment session updated successfully",
    success: true,
  });
});

export const cancelOrder = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const { orderId } = req.params;
  const order = await Order.findById(orderId);

  if (!order) {
    return res.status(404).json({
      message: "Order not found",
    });
  }

  if (order.userId !== user._id.toString()) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  if (order.status !== "placed") {
    return res.status(400).json({
      message: "Only recently placed orders can be cancelled",
    });
  }

  if (order.paymentStatus === "paid") {
    try {
      await axios.post(
        `${process.env.UTILS_SERVICE}/api/payment/refund`,
        {
          orderId: order._id.toString(),
          transactionId: order.transactionId,
          amount: order.totalAmount,
          paymentMethod: order.paymentMethod,
        },
        {
          headers: {
            "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
          },
        }
      );
    } catch (refundError: any) {
      console.error("Refund failed:", refundError?.response?.data || refundError.message);
      return res.status(500).json({
        message: "Failed to process refund. Order was not cancelled.",
      });
    }
  }

  order.status = "cancelled";
  order.statusHistory.push({ status: "cancelled", timestamp: new Date() });
  await order.save();

  await axios.post(
    `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
    {
      event: "order:update",
      room: `user:${order.userId}`,
      payload: {
        orderId: order._id,
        status: order.status,
      },
    },
    {
      headers: {
        "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
      },
    }
  ).catch((err: any) => console.error("Realtime emit failed:", err.message));

  await axios.post(
    `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
    {
      event: "order:update",
      room: `user:${order._id}`,
      payload: {
        orderId: order._id,
        status: order.status,
      },
    },
    {
      headers: {
        "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
      },
    }
  ).catch((err: any) => console.error("Realtime order room emit failed:", err.message));

  await axios.post(
    `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
    {
      event: "order:update",
      room: `restaurant:${order.restaurantId}`,
      payload: {
        orderId: order._id,
        status: order.status,
      },
    },
    {
      headers: {
        "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
      },
    }
  ).catch((err: any) => console.error("Realtime emit failed:", err.message));

  res.json({
    message: "Order cancelled and refunded successfully",
    success: true,
    order,
  });
});

export const fetchRestaurantAnalytics = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const { restaurantId } = req.params;
  const restaurant = await Restaurant.findById(restaurantId);

  if (!restaurant) {
    return res.status(404).json({
      message: "Restaurant not found",
    });
  }

  if (restaurant.ownerId !== user._id.toString()) {
    return res.status(403).json({
      message: "You are not allowed to view analytics for this restaurant",
    });
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // FIXED BUG: Order.restaurantId is stored as an ObjectId, but req.params
  // gives us a plain string. Model.find() casts query values against the
  // schema automatically, but Model.aggregate() does NOT — so $match-ing a
  // raw string against an ObjectId field silently matched zero documents.
  // Every $match below must compare against a real ObjectId instance.
  const restaurantObjectId = new mongoose.Types.ObjectId(String(restaurantId));

  // FIXED ANALYTICS: include COD delivered orders which may not have paymentStatus "paid"
  // until delivery, but represent real revenue
  const paidOrDeliveredCod = {
    $or: [
      { paymentStatus: "paid" },
      { paymentMethod: "cod", status: "delivered" },
    ],
  };

  const dailyStats = await Order.aggregate([
    {
      $match: {
        restaurantId: restaurantObjectId,
        ...paidOrDeliveredCod,
        status: { $ne: "cancelled" },
        createdAt: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        totalSales: { $sum: "$totalAmount" },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const topItems = await Order.aggregate([
    {
      $match: {
        restaurantId: restaurantObjectId,
        ...paidOrDeliveredCod,
        status: { $ne: "cancelled" },
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.itemId",
        name: { $first: "$items.name" },
        quantity: { $sum: "$items.quantity" },
        revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
      },
    },
    { $sort: { quantity: -1 } },
    { $limit: 5 },
  ]);

  const overallStats = await Order.aggregate([
    {
      $match: {
        restaurantId: restaurantObjectId,
        ...paidOrDeliveredCod,
        status: { $ne: "cancelled" },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalAmount" },
        totalOrders: { $sum: 1 },
      },
    },
  ]);

  const totalRevenue = overallStats[0]?.totalRevenue || 0;
  const totalOrders = overallStats[0]?.totalOrders || 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  res.json({
    kpis: {
      totalRevenue,
      totalOrders,
      avgOrderValue,
    },
    dailyStats,
    topItems,
  });
});

export const startOrderExpiryJob = () => {
  setInterval(async () => {
    try {
      const now = new Date();
      const expiredOrders = await Order.find({
        expiresAt: { $lt: now },
        status: { $ne: "cancelled" },
        paymentStatus: "pending",
        paymentMethod: { $ne: "cod" }
      });

      for (const order of expiredOrders) {
        order.status = "cancelled";
        order.paymentStatus = "failed";
        order.statusHistory.push({ status: "cancelled", timestamp: new Date() });
        order.expiresAt = undefined as any;
        await order.save();

        console.log(`[Expiry Job] Cancelled expired unpaid order: ${order._id}`);

        try {
          await axios.post(
            `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
            {
              event: "order:update",
              room: `user:${order.userId}`,
              payload: {
                orderId: order._id,
                status: order.status,
              },
            },
            {
              headers: {
                "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
              },
            }
          );
        } catch (emitErr: any) {
          console.error(`[Expiry Job] Failed to emit realtime update for order ${order._id}:`, emitErr.message);
        }
      }
    } catch (err: any) {
      console.error("[Expiry Job] Error checking expired orders:", err.message);
    }
  }, 30000);
};

export const getCompletedOrdersForRider = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const { riderId } = req.query;

  if (typeof riderId !== "string") {
    return res.status(400).json({
      message: "Rider id is required and must be a string",
    });
  }

  // Get all delivered orders for this rider
  const orders = await Order.find({
    riderId,
    status: "delivered",
  }).sort({ createdAt: -1 });

  res.json(orders);
});

export const compensateFailedAssignment = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { orderId } = req.body;
  const order = await Order.findById(orderId);

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  // If already cancelled or a rider was assigned in a race condition, skip
  if (order.riderId !== null || order.status !== "ready_for_rider") {
    return res.json({ success: true, status: order.status, message: "Order already claimed or not ready for rider" });
  }

  // 1. Process Saga refund compensation if paid online
  if (order.paymentStatus === "paid") {
    try {
      await axios.post(
        `${process.env.UTILS_SERVICE}/api/payment/refund`,
        {
          orderId: order._id.toString(),
          transactionId: order.transactionId,
          amount: order.totalAmount,
          paymentMethod: order.paymentMethod,
        },
        {
          headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY }
        }
      );
      order.paymentStatus = "refunded";
    } catch (refundError: any) {
      console.error("[Saga Refund] Failed to process compensation refund:", refundError.message);
      order.paymentStatus = "refund_failed";
    }
  }

  // 2. Rollback order status to cancelled
  order.status = "cancelled";
  order.statusHistory.push({ status: "cancelled", timestamp: new Date() });
  await order.save();

  // 3. Emit real-time status update to customer page
  try {
    await axios.post(
      `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
      {
        event: "order:update",
        room: `user:${order.userId}`,
        payload: {
          orderId: order._id,
          status: "cancelled",
          paymentStatus: order.paymentStatus,
          message: "Order cancelled — no delivery riders available."
        }
      },
      {
        headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY }
      }
    );
  } catch (emitErr: any) {
    console.error("[Saga Emit] failed:", emitErr.message);
  }

  res.json({
    success: true,
    status: order.status,
    paymentStatus: order.paymentStatus
  });
});

