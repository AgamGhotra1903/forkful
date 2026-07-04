import express from "express";
import { addUserRole, loginUser, myProfile, updateProfile, devLoginUser, logoutUser, sendOtp, verifyOtp, registerPassword, loginPassword, guestLogin } from "../controllers/auth.js";
import { isAuth } from "../middlewares/isAuth.js";
import { rateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

router.post("/login", rateLimiter(10, 5 * 60 * 1000), loginUser);
router.post("/dev-login", devLoginUser);
router.post("/logout", isAuth, logoutUser);
router.put("/add/role", isAuth, addUserRole);
router.put("/profile", isAuth, updateProfile);
router.get("/me", isAuth, myProfile);
router.post("/send-otp", rateLimiter(5, 5 * 60 * 1000), sendOtp);
router.post("/verify-otp", rateLimiter(10, 5 * 60 * 1000), verifyOtp);
router.post("/register-password", rateLimiter(15, 5 * 60 * 1000), registerPassword);
router.post("/login-password", rateLimiter(15, 5 * 60 * 1000), loginPassword);
router.post("/guest-login", rateLimiter(20, 5 * 60 * 1000), guestLogin);

export default router;
