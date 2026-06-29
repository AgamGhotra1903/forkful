import express from "express";
import { addUserRole, loginUser, myProfile, devLoginUser, logoutUser, sendOtp, verifyOtp } from "../controllers/auth.js";
import { isAuth } from "../middlewares/isAuth.js";
import { rateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

router.post("/login", rateLimiter(10, 5 * 60 * 1000), loginUser);
router.post("/dev-login", devLoginUser);
router.post("/logout", isAuth, logoutUser);
router.put("/add/role", isAuth, addUserRole);
router.get("/me", isAuth, myProfile);
router.post("/send-otp", rateLimiter(5, 5 * 60 * 1000), sendOtp);
router.post("/verify-otp", rateLimiter(10, 5 * 60 * 1000), verifyOtp);

export default router;
