import type { Response } from "express";
import mongoose from "mongoose";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Order from "../models/Order.js";
import Review from "../models/Review.js";
import Restaurant from "../models/Restaurant.js";
import User from "../models/User.js"; // Import User model to register it for populate
import { getChannel } from "../config/rabbitmq.js";

// Explicitly reference the model so the TypeScript compiler does not tree-shake the import
const _userModel = User;

/**
 * POST /api/reviews
 * Creates a review for a restaurant.
 * Validates that the user has at least one delivered order from this restaurant.
 */
export const createReview = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Please login" });
  }

  const { restaurantId, rating, text, orderId } = req.body;

  if (!restaurantId || !rating || !text) {
    return res.status(400).json({ message: "restaurantId, rating, and text are required" });
  }

  const ratingNum = Number(rating);
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ message: "Rating must be a number between 1 and 5" });
  }

  // userId is stored as a String in orders (set via user._id.toString() at creation).
  // req.user._id comes from JWT and is always a string.
  // restaurantId is a Mongoose ObjectId in orders — cast the incoming string to ObjectId
  // so the query actually matches; comparing a raw string against an ObjectId field
  // returns zero documents in Mongoose even when the value looks identical.
  const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);

  const orderQuery: any = {
    userId: String(req.user._id),
    restaurantId: restaurantObjectId,
    status: "delivered",
    $or: [
      { paymentStatus: "paid" },
      { paymentMethod: "cod" },
    ],
  };

  if (orderId) {
    orderQuery._id = new mongoose.Types.ObjectId(orderId);
  }

  const hasDeliveredOrder = await Order.findOne(orderQuery);

  if (!hasDeliveredOrder) {
    // Helpful diagnostic: tell the developer exactly what we searched for
    console.warn("[Review] No delivered order found for", {
      userId: String(req.user._id),
      restaurantId: restaurantObjectId.toString(),
      orderId: orderId || "(any)",
    });
    return res.status(403).json({
      message: "You can only review restaurants where you have a delivered order",
    });
  }

  // One review per order
  const existingReview = await Review.findOne({
    orderId: hasDeliveredOrder._id,
  });
  if (existingReview) {
    return res.status(400).json({ message: "You have already reviewed this order" });
  }

  const review = await Review.create({
    orderId: hasDeliveredOrder._id,
    restaurantId: restaurantObjectId,
    userId: req.user._id,
    rating: ratingNum,
    text: text.slice(0, 1000),
    embeddingStatus: "pending",
  });

  // Atomically update the restaurant's running rating totals.
  // The dashboard derives avgRating = overallRating / ratingCount.
  try {
    await Restaurant.findByIdAndUpdate(restaurantObjectId, {
      $inc: { overallRating: ratingNum, ratingCount: 1 },
    });
  } catch (ratingErr) {
    console.error("[Review] Failed to update restaurant aggregate rating:", ratingErr);
  }

  // Publish embedding job to queue (best-effort)
  try {
    const channel = getChannel();
    channel.sendToQueue(
      "review.created",
      Buffer.from(JSON.stringify({ reviewId: review._id })),
      { persistent: true }
    );
  } catch (queueError) {
    console.error("[Review] Failed to publish review.created event:", queueError);
  }

  return res.status(201).json({
    message: "Review submitted successfully",
    review,
  });
});

/**
 * GET /api/reviews/restaurant/:restaurantId
 * Retrieves all reviews for a specific restaurant.
 */
export const getRestaurantReviews = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Please login" });
  }

  const { restaurantId } = req.params;
  if (!restaurantId) {
    return res.status(400).json({ message: "restaurantId is required" });
  }

  // Always query by ObjectId for consistency — casting a valid string is safe
  // and avoids silent mismatches when stored IDs are ObjectIds.
  const reviews = await Review.find({
    restaurantId: new mongoose.Types.ObjectId(restaurantId as string),
  })
    .populate("userId", "name email image")
    .sort({ createdAt: -1 });

  return res.json(reviews);
});

/**
 * GET /api/reviews/check/:orderId
 * Checks if a review has already been created for a specific order.
 */
export const checkOrderReview = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Please login" });
  }

  const { orderId } = req.params;
  if (!orderId) {
    return res.status(400).json({ message: "orderId is required" });
  }

  const review = await Review.findOne({
    orderId: new mongoose.Types.ObjectId(orderId as string),
    userId: req.user._id,
  });

  return res.json({ reviewed: !!review, review: review || null });
});
