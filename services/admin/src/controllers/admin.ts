import { ObjectId } from "mongodb";
import TryCatch from "../middlewares/trycatch.js";
import {
  getRestaurantCollection,
  getRiderCollection,
} from "../util/collection.js";
import { connectDb } from "../config/db.js";

export const getUserCollection = async () => {
  const db = await connectDb();
  return db.collection("users");
};

export const getOrderCollection = async () => {
  const db = await connectDb();
  return db.collection("orders");
};

export const getPendingRestaurant = TryCatch(async (req, res) => {
  const restaurants = await (await getRestaurantCollection())
    .find({ isVerified: false })
    .toArray();

  res.json({
    count: restaurants.length,
    restaurants,
  });
});

export const getPendingRiders = TryCatch(async (req, res) => {
  const riders = await (await getRiderCollection())
    .find({ isVerified: false })
    .toArray();

  res.json({
    count: riders.length,
    riders,
  });
});

export const verifyRestaurant = TryCatch(async (req, res) => {
  const { id } = req.params;

  if (typeof id !== "string") {
    return res.status(400).json({
      message: "invalid restaurant id",
    });
  }

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid object id",
    });
  }

  const result = await (
    await getRestaurantCollection()
  ).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        isVerified: true,
        updatedAt: new Date(),
      },
    }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({
      message: "Restaurant not found",
    });
  }

  res.json({
    message: "Restaurant verified successfully",
  });
});

export const verifyRider = TryCatch(async (req, res) => {
  const { id } = req.params;

  if (typeof id !== "string") {
    return res.status(400).json({
      message: "invalid rider id",
    });
  }

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid object id",
    });
  }

  const result = await (
    await getRiderCollection()
  ).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        isVerified: true,
        updatedAt: new Date(),
      },
    }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({
      message: "rider not found",
    });
  }

  res.json({
    message: "rider verified successfully",
  });
});

export const getAllUsers = TryCatch(async (req, res) => {
  const users = await (await getUserCollection())
    .find({ role: { $ne: "admin" } })
    .toArray();
  res.json({ users });
});

export const deleteUser = TryCatch(async (req, res) => {
  const { id } = req.params;
  if (typeof id !== "string" || !ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }
  const result = await (await getUserCollection()).deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) {
    return res.status(404).json({ message: "User not found" });
  }
  res.json({ message: "User removed successfully" });
});

export const deleteRestaurant = TryCatch(async (req, res) => {
  const { id } = req.params;
  if (typeof id !== "string" || !ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid restaurant ID" });
  }
  const result = await (await getRestaurantCollection()).deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) {
    return res.status(404).json({ message: "Restaurant not found" });
  }
  res.json({ message: "Restaurant removed successfully" });
});

export const deleteRider = TryCatch(async (req, res) => {
  const { id } = req.params;
  if (typeof id !== "string" || !ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid rider ID" });
  }
  const result = await (await getRiderCollection()).deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) {
    return res.status(404).json({ message: "Rider not found" });
  }
  res.json({ message: "Rider removed successfully" });
});

export const getAllOrders = TryCatch(async (req, res) => {
  const orders = await (await getOrderCollection())
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
  res.json({ orders });
});

export const getStats = TryCatch(async (req, res) => {
  const totalRestCount = await (await getRestaurantCollection()).countDocuments({ isVerified: true });
  const activeRidersCount = await (await getRiderCollection()).countDocuments({ isVerified: true });
  const usersCount = await (await getUserCollection()).countDocuments({ role: { $ne: "admin" } });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOrders = await (await getOrderCollection()).find({
    createdAt: { $gte: today }
  }).toArray();

  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);

  const monthOrders = await (await getOrderCollection()).find({
    createdAt: { $gte: firstOfMonth },
    paymentStatus: "paid"
  }).toArray();

  const gmv = monthOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);

  const newUsersToday = await (await getUserCollection()).countDocuments({
    createdAt: { $gte: today },
    role: { $ne: "admin" }
  });

  res.json({
    totalRestaurants: totalRestCount,
    activeRiders: activeRidersCount,
    totalUsers: usersCount,
    ordersToday: todayOrders.length,
    gmvThisMonth: gmv,
    newUsersToday
  });
});
