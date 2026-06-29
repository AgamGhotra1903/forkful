import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import {
  createRiderReview,
  getRiderReviews,
  checkOrderRiderReview,
} from "../controllers/riderReview.js";

const router = express.Router();

// POST /api/rider-reviews - Rate the rider for a delivered order
router.post("/", isAuth, createRiderReview);

// GET /api/rider-reviews/rider/:riderId - Get all ratings for a rider
router.get("/rider/:riderId", isAuth, getRiderReviews);

// GET /api/rider-reviews/check/:orderId - Check if a rider has been rated for this order
router.get("/check/:orderId", isAuth, checkOrderRiderReview);

export default router;
