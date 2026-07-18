import axios from "axios";
import mongoose from "mongoose";
import getBuffer from "../config/datauri.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import { Rider } from "../model/Rider.js";

// Lightweight nudge only — tells the rider's client to immediately refetch
// GET /api/rider/orders/available (the durable, time-filtered source of
// truth) rather than duplicating that query here. Keeping exactly one
// place that decides "what's offerable right now" avoids the two getting
// out of sync (this used to run its own unfiltered DB query directly).
const notifyRiderOfUnclaimedOrders = async (rider: any) => {
  try {
    await axios.post(
      `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
      {
        event: "orders:refresh",
        room: `user:${rider.userId}`,
        payload: {},
      },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
      }
    );
  } catch (err: any) {
    console.error("Error nudging rider to refresh available orders:", err.message);
  }
};

export const addRiderProfile = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (user.role !== "rider") {
      return res.status(403).json({
        message: "Only riders can create rider profile",
      });
    }

    const file = req.file;

    if (!file) {
      return res.status(400).json({
        message: "Rider Image is required",
      });
    }

    const fileBuffer = getBuffer(file);

    if (!fileBuffer?.content) {
      return res.status(500).json({
        message: "Failed to generate image buffer",
      });
    }

    const { data: uploadResult } = await axios.post(
      `${process.env.UTILS_SERVICE}/api/upload`,
      { buffer: fileBuffer.content },
      { maxBodyLength: Infinity, maxContentLength: Infinity }
    );

    const {
      phoneNumber,
      aadharNumber,
      drivingLicenseNumber,
      latitude,
      longitude,
    } = req.body;

    if (
      !phoneNumber ||
      !aadharNumber ||
      !drivingLicenseNumber ||
      latitude === undefined ||
      longitude === undefined
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const existingProfile = await Rider.findOne({
      userId: user._id,
    });

    if (existingProfile) {
      return res.status(400).json({
        message: "Rider profile already exists",
      });
    }

    const riderProfile = await Rider.create({
      userId: user._id,
      name: user.name,
      picture: uploadResult.url,
      phoneNumber,
      aadharNumber,
      drivingLicenseNumber,
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      isAvailable: false,
      isVerified: true,
    });

    return res.status(201).json({
      message: "Rider profile created successfully",
      riderProfile,
    });
  }
);

export const fetchMyProfile = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const account = await Rider.findOne({ userId: user._id });

    if (!account) {
      // In development, auto-create a starter profile so the dev bypass rider
      // can immediately toggle online and see available orders without needing
      // an admin to manually create the record.
      if (process.env.NODE_ENV !== "production") {
        const devProfile = await Rider.create({
          userId:                String(user._id),
          name:                  (user as any).name  || "Dev Rider",
          picture:               (user as any).image || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150",
          phoneNumber:           "9999999999",
          aadharNumber:          "000000000000",
          drivingLicenseNumber:  "DL-DEV-0000",
          location:              { type: "Point", coordinates: [77.209, 28.6139] },
          isAvailable:           false,
          isVerified:            true,
        });
        return res.json({
          ...devProfile.toObject(),
          earnings: { today: 0, total: 0 },
          stats:    { deliveries: 0, rating: 5.0, totalEarnings: 0 },
        });
      }
      return res.json(null);
    }

    // FIXED BUG 4: reset todayEarnings if it's a new day
    const today = new Date();
    const lastReset = account.lastEarningsResetDate ? new Date(account.lastEarningsResetDate) : new Date(0);
    const isSameDay = today.toDateString() === lastReset.toDateString();

    let todayEarnings = account.todayEarnings || 0;
    if (!isSameDay) {
      todayEarnings = 0;
      await Rider.findOneAndUpdate(
        { userId: user._id },
        { todayEarnings: 0, lastEarningsResetDate: today }
      );
    }

    // Return with earnings summary and stats for dashboard
    res.json({
      ...account.toObject(),
      earnings: {
        today: todayEarnings,
        total: account.totalEarnings || 0,
      },
      stats: {
        deliveries: account.totalDeliveries || 0,
        rating: account.ratingCount > 0 ? Number((account.rating / account.ratingCount).toFixed(1)) : 5.0,
        totalEarnings: account.totalEarnings || 0,
      },
    });
  }
);

export const toggleRiderAvailablity = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (user.role !== "rider") {
      return res.status(403).json({
        message: "Only riders can create rider profile",
      });
    }

    const { latitude, longitude, isAvailable } = req.body;

    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({
        message: "isAvailable must be boolean",
      });
    }

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        message: "location is required",
      });
    }

    const rider = await Rider.findOne({
      userId: user._id,
    });

    if (!rider) {
      return res.status(404).json({
        message: "Rider profile not found",
      });
    }

    if (isAvailable && !rider.isVerified) {
      return res.status(403).json({
        message: "Cannot go online. Your profile has not been verified by an admin yet.",
      });
    }

    rider.isAvailable = isAvailable;

    rider.location = {
      type: "Point",
      coordinates: [longitude, latitude],
    };
    rider.lastActiveAt = new Date();

    await rider.save();

    if (isAvailable) {
      notifyRiderOfUnclaimedOrders(rider);
    }

    res.json({
      message: isAvailable ? "Rider is now online" : "Rider is now offline",
      rider,
    });
  }
);

export const updateAadharRider = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Please Login",
      });
    }

    const { aadharNumber, aadharImage } = req.body;
    if (!aadharNumber) {
      return res.status(400).json({
        message: "Aadhar number is required",
      });
    }

    const rider = await Rider.findOne({ userId: req.user._id });
    if (!rider) {
      return res.status(404).json({
        message: "Rider profile not found",
      });
    }

    rider.aadharNumber = aadharNumber;
    if (aadharImage) rider.aadharImage = aadharImage;
    // Reset verification so admin reviews the updated info
    rider.isVerified = false;
    rider.isAvailable = false;
    await rider.save();

    res.json({
      message: "Aadhar updated successfully. Please wait for admin manual verification.",
      rider,
    });
  }
);

export const acceptOrder = TryCatch(async (req: AuthenticatedRequest, res) => {
  const riderUserId = req.user?._id;
  const { orderId } = req.params;

  if (!riderUserId) {
    return res.status(400).json({
      message: "Please Login",
    });
  }

  const rider = await Rider.findOne({ userId: riderUserId, isAvailable: true });

  if (!rider) {
    return res.status(404).json({ message: "rider not found" });
  }

  try {
    const { data } = await axios.put(
      `${process.env.RESTAURANT_SERVICE}/api/order/assign/rider`,
      {
        orderId,
        riderId: rider._id.toString(),
        riderUserId: rider.userId,
        riderName: rider.name || rider.picture,
        riderPhone: rider.phoneNumber,
      },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
      }
    );

    if (!data.success) {
      return res.status(400).json({
        message: data.message || "Order already taken or no longer available",
      });
    }

    await Rider.findOneAndUpdate(
      { userId: riderUserId, isAvailable: true },
      { isAvailable: false }
    );

    return res.json({ message: "Order accepted", order: data.order });
  } catch (error: any) {
    return res.status(error.response?.status || 400).json({
      message: error.response?.data?.message || "Order already taken or no longer available",
    });
  }
});

// Durable poll endpoint — the rider dashboard calls this on an interval
// (and immediately whenever a socket nudge arrives) so a rider always sees
// every order currently offerable to them, not just the ones for which a
// push notification happened to land while they were connected.
export const getAvailableOrders = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const riderUserId = req.user?._id;

    if (!riderUserId) {
      return res.status(401).json({ message: "Please Login" });
    }

    // Find rider profile regardless of verification status — isVerified is an
    // admin KYC flag that should not prevent a rider from seeing available orders
    // in development. Production admin flows can enforce it separately.
    const rider = await Rider.findOne({ userId: riderUserId });

    if (!rider) {
      // No rider profile yet — return empty rather than 404 so the dashboard
      // doesn't crash; the UI shows a "complete your profile" prompt instead.
      return res.json({ orders: [] });
    }

    // An offline or already-busy rider shouldn't see offers.
    if (!rider.isAvailable) {
      return res.json({ orders: [] });
    }

    const { latitude, longitude } = req.query;

    try {
      const { data } = await axios.get(
        `${process.env.RESTAURANT_SERVICE}/api/order/available-for-rider`,
        {
          params: { latitude, longitude },
          headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY },
        }
      );

      res.json({ orders: data.orders ?? [] });
    } catch (error: any) {
      res.status(500).json({
        message: error.response?.data?.message || "Failed to fetch available orders",
      });
    }
  }
);

export const fetchMyCurrentOrder = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const riderUserId = req.user?._id;

    if (!riderUserId) {
      return res.status(400).json({
        message: "Please Login",
      });
    }

    const rider = await Rider.findOne({ userId: riderUserId });

    if (!rider) {
      // No profile yet — return null order rather than crashing
      return res.json({ order: null });
    }

    try {
      const { data } = await axios.get(
        `${process.env.RESTAURANT_SERVICE}/api/order/current/rider?riderId=${rider._id}`,
        {
          headers: {
            "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
          },
        }
      );

      const activeList = Array.isArray(data) ? data : [data];

      res.json({
        order: activeList[0] || null,
        orders: activeList,
      });
    } catch (error: any) {
      if (error.response?.status === 404) {
        return res.json({ order: null, orders: [] });
      }
      res.status(500).json({
        message: error.response?.data?.message || "Failed to fetch current order",
      });
    }
  }
);

export const updateOrderStatus = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        message: "Please Login",
      });
    }

    const rider = await Rider.findOne({ userId: userId });

    if (!rider) {
      return res.status(404).json({
        message: "Please Login",
      });
    }

    const { orderId } = req.params;

    try {
      const { data } = await axios.put(
        `${process.env.RESTAURANT_SERVICE}/api/order/update/status/rider`,
        { orderId, riderId: rider._id.toString() },
        {
          headers: {
            "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
          },
        }
      );

      if (data.status === "delivered") {
        const riderAmount = (data.order?.riderAmount || 0) + (data.order?.riderTip || 0);
        const today = new Date();
        const lastReset = rider.lastEarningsResetDate ? new Date(rider.lastEarningsResetDate) : new Date(0);
        const isSameDay = today.toDateString() === lastReset.toDateString();

        if (isSameDay) {
          // Same day — just increment everything
          await Rider.findOneAndUpdate(
            { userId: userId },
            {
              isAvailable: true,
              $inc: {
                totalEarnings: riderAmount,
                todayEarnings: riderAmount,
                totalDeliveries: 1,
              },
            }
          );
        } else {
          // New day — reset todayEarnings, set lastEarningsResetDate
          await Rider.findOneAndUpdate(
            { userId: userId },
            {
              isAvailable: true,
              todayEarnings: riderAmount,
              lastEarningsResetDate: today,
              $inc: {
                totalEarnings: riderAmount,
                totalDeliveries: 1,
              },
            }
          );
        }
        notifyRiderOfUnclaimedOrders(rider);
      }

      res.json({
        message: data.message,
        status: data.status,
      });
    } catch (error: any) {
      console.log(error);
      res.status(500).json({
        message: error.response?.data?.message || "Failed to update order status",
      });
    }
  }
);

export const fetchMyCompletedOrders = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const riderUserId = req.user?._id;

    if (!riderUserId) {
      return res.status(400).json({
        message: "Please Login",
      });
    }

    const rider = await Rider.findOne({ userId: riderUserId });

    if (!rider) {
      return res.status(404).json({ message: "rider not found" });
    }

    try {
      const { data } = await axios.get(
        `${process.env.RESTAURANT_SERVICE}/api/order/completed/rider?riderId=${rider._id}`,
        {
          headers: {
            "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
          },
        }
      );

      res.json({
        orders: data,
      });
    } catch (error: any) {
      res.status(500).json({
        message: error.response?.data?.message || "Failed to fetch completed orders",
      });
    }
  }
);

export const updateRiderLocation = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (user.role !== "rider") {
      return res.status(403).json({
        message: "Only riders can update location",
      });
    }

    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        message: "location is required",
      });
    }

    const rider = await Rider.findOne({ userId: user._id });

    if (!rider) {
      return res.status(404).json({
        message: "Rider profile not found",
      });
    }

    rider.location = {
      type: "Point",
      coordinates: [longitude, latitude],
    };
    rider.lastActiveAt = new Date();
    await rider.save();

    let orderId: string | null = null;
    try {
      const { data } = await axios.get(
        `${process.env.RESTAURANT_SERVICE}/api/order/current/rider?riderId=${rider._id}`,
        {
          headers: {
            "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
          },
        }
      );
      if (data && data._id) {
        orderId = data._id;
      }
    } catch (err: any) {
      console.log("No active order found for rider location update:", rider._id);
    }

    if (orderId) {
      try {
        await axios.post(
          `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
          {
            event: "rider:location_update",   // matches what OrderPage listens for
            room: `order:${orderId}`,
            payload: {
              lat: latitude,                   // matches { lat, lng, orderId } shape
              lng: longitude,
              orderId,
              timestamp: Date.now(),
            },
          },
          {
            headers: {
              "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
            },
          }
        );
      } catch (emitErr: any) {
        console.error("Failed to emit rider location via realtime service:", emitErr.message);
      }
    }

    return res.json({
      message: "Location updated successfully",
      location: rider.location,
    });
  }
);

// ── Internal endpoints (service-to-service, gated by x-internal-key) ───────
// Used by the restaurant service's manual rider-assignment fallback, so a
// restaurant can pick a real, currently-available rider when the automatic
// matching pipeline has exhausted its search radii.

const DEFAULT_NEARBY_RADIUS_METERS = 10000000; // matches the widest radius the automatic search tries

export const getNearbyRidersInternal = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const latitude = Number(req.query.latitude);
  const longitude = Number(req.query.longitude);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return res.status(400).json({ message: "latitude and longitude are required" });
  }

  const riders = await Rider.find({
    isAvailable: true,
    isVerified: true,
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [longitude, latitude] },
        $maxDistance: DEFAULT_NEARBY_RADIUS_METERS,
      },
    },
  }).limit(25);

  res.json({
    riders: riders.map((r) => ({
      _id: r._id.toString(),
      name: r.name,
      phoneNumber: r.phoneNumber,
      picture: r.picture,
      location: r.location,
    })),
  });
});

export const getRiderByIdInternal = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { riderId } = req.params;

  if (typeof riderId !== "string" || !mongoose.Types.ObjectId.isValid(riderId)) {
    return res.status(400).json({ message: "Invalid rider id" });
  }

  const rider = await Rider.findOne({
    _id: riderId,
    isAvailable: true,
    isVerified: true,
  });

  if (!rider) {
    return res.status(404).json({
      message: "Rider not found or no longer available",
    });
  }

  res.json({
    rider: {
      _id: rider._id.toString(),
      name: rider.name,
      phoneNumber: rider.phoneNumber,
    },
  });
});

export const markRiderBusyInternal = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { riderId } = req.params;

  if (typeof riderId !== "string" || !mongoose.Types.ObjectId.isValid(riderId)) {
    return res.status(400).json({ message: "Invalid rider id" });
  }

  const rider = await Rider.findByIdAndUpdate(
    riderId,
    { isAvailable: false },
    { new: true }
  );

  if (!rider) {
    return res.status(404).json({ message: "Rider not found" });
  }

  res.json({ message: "Rider marked busy", success: true });
});

// Called by the restaurant service whenever a customer submits a new rider
// rating, so the rider's aggregate rating stays in sync without the rider
// service needing to know anything about RiderReview documents (those live
// in the restaurant service's database alongside Order/Review).
//
// `rating` (the running sum) and `ratingCount` are stored separately and
// averaged on read (see fetchMyProfile) rather than storing a pre-computed
// average directly — this keeps the update a single atomic $inc with no
// read-modify-write race between concurrent ratings.
export const addRiderRatingInternal = TryCatch(async (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { riderId } = req.params;
  const { rating, text } = req.body;

  if (typeof riderId !== "string" || !mongoose.Types.ObjectId.isValid(riderId)) {
    return res.status(400).json({ message: "Invalid rider id" });
  }

  const ratingNum = Number(rating);
  if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ message: "rating must be a number between 1 and 5" });
  }

  const rider = await Rider.findByIdAndUpdate(
    riderId,
    {
      $inc: {
        rating: ratingNum,
        ratingCount: 1,
      },
    },
    { new: true }
  );

  if (!rider) {
    return res.status(404).json({ message: "Rider not found" });
  }

  // FIX: Emit a "rider:rated" socket event to the rider's personal room so
  // the RiderDashboard can show a 30-second passive notification window.
  // rider.userId is the auth user ID which is the socket room key.
  try {
    await axios.post(
      `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
      {
        event: "rider:rated",
        room: `user:${rider.userId}`,
        payload: { rating: ratingNum, text: text || "" },
      },
      { headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY } }
    );
  } catch (emitErr: any) {
    console.error("[Rider Rating] Failed to emit rider:rated socket event:", emitErr.message);
    // Do not fail the request — the rating update was already persisted
  }

  res.json({
    message: "Rider rating updated",
    success: true,
    averageRating:
      rider.ratingCount > 0 ? Number((rider.rating / rider.ratingCount).toFixed(1)) : 5.0,
  });
});

