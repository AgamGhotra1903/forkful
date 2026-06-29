import express from "express";
import { isAdmin, isAuth } from "../middlewares/isAuth.js";
import {
  getPendingRestaurant,
  getPendingRiders,
  verifyRestaurant,
  verifyRider,
  getAllUsers,
  deleteUser,
  deleteRestaurant,
  deleteRider,
  getAllOrders,
  getStats,
} from "../controllers/admin.js";

const router = express.Router();

router.get("/restaurant/pending", isAuth, isAdmin, getPendingRestaurant);
router.get("/rider/pending", isAuth, isAdmin, getPendingRiders);
router.patch("/rider/verify/:id", isAuth, isAdmin, verifyRider);
router.patch("/restaurant/verify/:id", isAuth, isAdmin, verifyRestaurant);

// Functional E2E Admin routes
router.get("/users", isAuth, isAdmin, getAllUsers);
router.delete("/user/:id", isAuth, isAdmin, deleteUser);
router.delete("/restaurant/:id", isAuth, isAdmin, deleteRestaurant);
router.delete("/rider/:id", isAuth, isAdmin, deleteRider);
router.get("/orders", isAuth, isAdmin, getAllOrders);
router.get("/stats", isAuth, isAdmin, getStats);

export default router;
