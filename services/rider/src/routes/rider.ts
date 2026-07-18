import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import {
  acceptOrder,
  addRiderProfile,
  fetchMyCurrentOrder,
  fetchMyProfile,
  toggleRiderAvailablity,
  updateOrderStatus,
  fetchMyCompletedOrders,
  updateRiderLocation,
  getNearbyRidersInternal,
  getRiderByIdInternal,
  markRiderBusyInternal,
  addRiderRatingInternal,
  getAvailableOrders,
  updateAadharRider,
} from "../controllers/rider.js";
import uploadFile from "../middlewares/multer.js";

const router = express.Router();

router.post("/new", isAuth, uploadFile, addRiderProfile);
router.put("/aadhar", isAuth, updateAadharRider);

router.get("/myprofile", isAuth, fetchMyProfile);
router.patch("/toggle", isAuth, toggleRiderAvailablity);
router.get("/orders/available", isAuth, getAvailableOrders);
router.post("/accept/:orderId", isAuth, acceptOrder);
router.post("/order/accept/:orderId", isAuth, acceptOrder); // Alias for frontend routing
router.get("/order/current", isAuth, fetchMyCurrentOrder);
router.put("/location", isAuth, updateRiderLocation);
router.put("/order/update/:orderId", isAuth, updateOrderStatus);
router.put("/order/status/:orderId", isAuth, updateOrderStatus); // Alias for frontend routing
router.get("/orders/completed", isAuth, fetchMyCompletedOrders);

// Internal, service-to-service only (gated by x-internal-key inside each handler)
router.get("/internal/nearby", getNearbyRidersInternal);
router.get("/internal/:riderId", getRiderByIdInternal);
router.post("/internal/:riderId/mark-busy", markRiderBusyInternal);
router.post("/internal/:riderId/rating", addRiderRatingInternal);

export default router;
