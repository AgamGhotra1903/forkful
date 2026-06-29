import express from "express";
import { isAuth, isSeller } from "../middlewares/isAuth.js";
import {
  addRestraunt,
  fetchMyRestaurant,
  fetchSingleRestaurant,
  getNearbyRestaurant,
  updateRestaurant,
  updateStatusRestaurant,
} from "../controllers/restaraunt.js";
import { aiSearch } from "../controllers/aiSearch.js";
import { nearbyDiscovery } from "../controllers/nearbyDiscovery.js";
import uploadFile from "../middlewares/multer.js";

const router = express.Router();

router.post("/new", isAuth, isSeller, uploadFile, addRestraunt);
router.get("/my", isAuth, isSeller, fetchMyRestaurant);
router.put("/status", isAuth, isSeller, updateStatusRestaurant);
// FIXED BUG 2: alias route so frontend PATCH /api/restaurant/toggle/:id works
router.patch("/toggle/:id", isAuth, isSeller, updateStatusRestaurant);
router.put("/edit", isAuth, isSeller, uploadFile, updateRestaurant);
router.get("/all", isAuth, getNearbyRestaurant);

// ── AI Smart Search ──────────────────────────────────────────────────────────
router.post("/ai-search", isAuth, aiSearch);

// ── OSM Nearby Discovery ─────────────────────────────────────────────────────
router.get("/nearby-discovery", isAuth, nearbyDiscovery);

router.get("/:id", isAuth, fetchSingleRestaurant);

export default router;
