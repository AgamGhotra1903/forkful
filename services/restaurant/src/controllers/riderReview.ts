import type { Response } from "express";
import mongoose from "mongoose";
import axios from "axios";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Order from "../models/Order.js";
import RiderReview from "../models/RiderReview.js";
import User from "../models/User.js";

// Explicitly reference the model so the TypeScript compiler does not tree-shake the import
const _userModel = User;

/**
 * POST /api/rider-reviews
 * Creates a rating for the rider who delivered a given order.
 */
export const createRiderReview = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Please login" });
  }

  const { orderId, rating, text } = req.body;

  if (!orderId || !rating) {
    return res.status(400).json({ message: "orderId and rating are required" });
  }

  const ratingNum = Number(rating);
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ message: "Rating must be a number between 1 and 5" });
  }

  // userId in Order is stored as String (set via user._id.toString() at createOrder).
  // req.user._id from JWT is also a string — compare directly.
  // _id field: Mongoose auto-casts string to ObjectId, so passing the raw string is fine.
  const order = await Order.findOne({
    _id: orderId,
    userId: String(req.user._id),
    status: "delivered",
  });

  if (!order) {
    // Diagnostic log so operators can see what we searched for without leaking data to clients
    console.warn("[RiderReview] Order not found for rider rating:", {
      orderId,
      userId: String(req.user._id),
    });
    return res.status(403).json({
      message: "You can only rate a rider for your own delivered orders",
    });
  }

  if (!order.riderId) {
    return res.status(400).json({ message: "This order has no rider to rate" });
  }

  // One rider rating per order
  const existingReview = await RiderReview.findOne({ orderId: order._id });
  if (existingReview) {
    return res.status(400).json({ message: "You have already rated the rider for this order" });
  }

  const review = await RiderReview.create({
    orderId: order._id,
    riderId: order.riderId,
    userId: req.user._id,
    rating: ratingNum,
    text: text ? String(text).slice(0, 1000) : "",
  });

  // Best-effort: push rating to rider service — do not fail if it's temporarily unreachable
  try {
    await axios.post(
      `${process.env.RIDER_SERVICE}/api/rider/internal/${order.riderId}/rating`,
      { rating: ratingNum, text: text ? String(text).slice(0, 1000) : "" },
      {
        headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY },
        timeout: 5000,
      }
    );
  } catch (err: any) {
    console.error("[RiderReview] Failed to push rating to rider service:", err.message);
  }

  return res.status(201).json({
    message: "Rider rating submitted successfully",
    review,
  });
});

/**
 * GET /api/rider-reviews/rider/:riderId
 */
export const getRiderReviews = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Please login" });

  const { riderId } = req.params;
  if (!riderId) return res.status(400).json({ message: "riderId is required" });

  const reviews = await RiderReview.find({ riderId })
    .populate("userId", "name email image")
    .sort({ createdAt: -1 });

  return res.json(reviews);
});

/**
 * GET /api/rider-reviews/check/:orderId
 */
export const checkOrderRiderReview = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Please login" });

  const { orderId } = req.params;
  if (!orderId) return res.status(400).json({ message: "orderId is required" });

  const review = await RiderReview.findOne({
    orderId: new mongoose.Types.ObjectId(orderId as string),
    userId: req.user._id,
  });

  return res.json({ reviewed: !!review, review: review || null });
});
