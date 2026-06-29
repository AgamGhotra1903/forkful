import express from "express";
import {
  createRazorpayOrder,
  payWithStripe,
  verifyRazorpayPayment,
  verifyStripe,
  refundPayment,
} from "../controllers/payment.js";

const router = express.Router();

router.post("/create", createRazorpayOrder);
router.post("/verify", verifyRazorpayPayment);
router.post("/stripe/create", payWithStripe);
router.post("/stripe/verify", verifyStripe);
router.post("/refund", refundPayment);

export default router;
