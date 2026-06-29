import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import { createReview, getRestaurantReviews, checkOrderReview } from "../controllers/review.js";
import { askReviews, getDemandForecast } from "../controllers/reviewInsights.js";

const router = express.Router();

// POST /api/reviews - Add a review
router.post("/", isAuth, createReview);

// GET /api/reviews/analytics/forecast/:restaurantId - AI Forecast
router.get("/analytics/forecast/:restaurantId", isAuth, getDemandForecast);

// POST /api/reviews/ask - Natural language review ask summary
router.post("/ask", isAuth, askReviews);

// GET /api/reviews/restaurant/:restaurantId - Get all reviews for a restaurant
router.get("/restaurant/:restaurantId", isAuth, getRestaurantReviews);

// GET /api/reviews/check/:orderId - Check if an order was reviewed
router.get("/check/:orderId", isAuth, checkOrderReview);

// REMOVED: GET /api/reviews/insights/:restaurantId ("Seller AI" / Owner
// Insights). Replaced on the restaurant dashboard by a plain Customer
// Reviews list (reusing getRestaurantReviews above) — see Restaurant.tsx.

export default router;
