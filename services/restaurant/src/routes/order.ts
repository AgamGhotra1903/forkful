import express from "express";
import { isAuth, isSeller } from "../middlewares/isAuth.js";
import {
  assignRiderToOrder,
  createOrder,
  fetchOrderForPayment,
  fetchRestaurantOrders,
  fetchSingleOrder,
  getCurrentOrderForRider,
  getMyOrders,
  updateOrderStatus,
  updateOrderStatusRider,
  updatePaymentSession,
  cancelOrder,
  fetchRestaurantAnalytics,
  fetchOrderInternal,
  getCompletedOrdersForRider,
  getNearbyRidersForOrder,
  manualAssignRider,
  getAvailableOrdersForRider,
  checkRiderBatchEligibilityHTTP,
  getSurgeCharge,
  compensateFailedAssignment,
} from "../controllers/order.js";

const router = express.Router();

// FIXED BUG 3: specific routes MUST come before parameterized /:orderId routes
// or Express will match "current" and "completed" as orderId values

router.get("/myorder", isAuth, getMyOrders);
router.post("/new", isAuth, createOrder);
router.get("/available-for-rider", getAvailableOrdersForRider);
router.get("/current/rider", getCurrentOrderForRider);
router.get("/completed/rider", getCompletedOrdersForRider);
router.get("/internal/batch/eligible", checkRiderBatchEligibilityHTTP);
router.put("/internal/compensate", compensateFailedAssignment);
router.get("/surge-charge", getSurgeCharge);
router.put("/assign/rider", assignRiderToOrder);
router.put("/update/status/rider", updateOrderStatusRider);
router.put("/manual-assign", isAuth, isSeller, manualAssignRider);
router.get("/payment/:id", fetchOrderForPayment);
router.get("/internal/:id", fetchOrderInternal);
router.get("/restaurant/:restaurantId", isAuth, isSeller, fetchRestaurantOrders);
router.put("/payment-session/:id", updatePaymentSession);
router.post("/cancel/:orderId", isAuth, cancelOrder);
router.get("/analytics/:restaurantId", isAuth, isSeller, fetchRestaurantAnalytics);
router.put("/status/:orderId", isAuth, isSeller, updateOrderStatus);
router.get("/:orderId/nearby-riders", isAuth, isSeller, getNearbyRidersForOrder);
// /:orderId must come LAST so it doesn't swallow static route segments
router.get("/:id", isAuth, fetchSingleOrder);

export default router;
