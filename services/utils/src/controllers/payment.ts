import { Request, Response } from "express";
import axios from "axios";
import { razorpay } from "../config/razorpay.js";
import { verifyRazorpaySignature } from "../config/verifyRazorpay.js";
import { publishPaymentSuccess } from "../config/payment.producer.js";

const paymentLocks = new Set<string>();

export const createRazorpayOrder = async (req: Request, res: Response) => {
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ message: "orderId is required" });
  }

  if (paymentLocks.has(orderId)) {
    return res.status(429).json({
      message: "Payment transaction already in progress for this order",
    });
  }

  paymentLocks.add(orderId);

  try {
    const { data } = await axios.get(
      `${process.env.RESTAURANT_SERVICE}/api/order/payment/${orderId}`,
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
      }
    );

    if (data.paymentSessionId) {
      return res.json({
        razorpayOrderId: data.paymentSessionId,
        key: process.env.RAZORPAY_KEY_ID,
      });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: data.amount * 100,
      currency: "INR",
      receipt: orderId,
    });

    await axios.put(
      `${process.env.RESTAURANT_SERVICE}/api/order/payment-session/${orderId}`,
      {
        paymentSessionId: razorpayOrder.id,
        paymentSessionUrl: null,
      },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
      }
    );

    res.json({
      razorpayOrderId: razorpayOrder.id,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    console.error("Razorpay order creation failed:", error.message);
    res.status(500).json({
      message: "Razorpay order creation failed",
    });
  } finally {
    paymentLocks.delete(orderId);
  }
};

export const verifyRazorpayPayment = async (req: Request, res: Response) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    orderId,
  } = req.body;

  const isValid = verifyRazorpaySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );

  if (!isValid) {
    return res.status(400).json({
      message: "Payment verification failed",
    });
  }

  await publishPaymentSuccess({
    orderId,
    paymentId: razorpay_payment_id,
    provider: "razorpay",
  });

  res.json({
    message: "Payment verified successfully",
  });
};

import dotenv from "dotenv";

dotenv.config();

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const payWithStripe = async (req: Request, res: Response) => {
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ message: "orderId is required" });
  }

  if (paymentLocks.has(orderId)) {
    return res.status(429).json({
      message: "Payment transaction already in progress for this order",
    });
  }

  paymentLocks.add(orderId);

  try {
    const { data } = await axios.get(
      `${process.env.RESTAURANT_SERVICE}/api/order/payment/${orderId}`,
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
      }
    );

    if (data.paymentSessionId && data.paymentSessionUrl) {
      return res.json({
        url: data.paymentSessionUrl,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",

      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: "Tomato food order",
            },
            unit_amount: data.amount * 100,
          },
          quantity: 1,
        },
      ],

      metadata: {
        orderId,
      },

      success_url: `${process.env.FRONTEND_URL}/ordersuccess?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout`,
    });

    await axios.put(
      `${process.env.RESTAURANT_SERVICE}/api/order/payment-session/${orderId}`,
      {
        paymentSessionId: session.id,
        paymentSessionUrl: session.url,
      },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
      }
    );

    res.json({
      url: session.url,
    });
  } catch (error: any) {
    console.error("Stripe payment creation failed:", error.message);
    res.status(500).json({
      message: "stripe payment failed",
    });
  } finally {
    paymentLocks.delete(orderId);
  }
};

export const verifyStripe = async (req: Request, res: Response) => {
  const { sessionId } = req.body;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session || session.payment_status !== "paid") {
      return res.status(400).json({
        message: "Payment verification failed or unpaid",
      });
    }

    const orderId = session.metadata?.orderId;

    if (!orderId) {
      return res.status(400).json({
        message: "orderid not found in stripe session",
      });
    }

    const paymentId = (typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id) || sessionId;

    await publishPaymentSuccess({
      orderId,
      paymentId,
      provider: "stripe",
    });

    res.json({
      message: "payment verified successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "stripe payment failed",
    });
  }
};

export const refundPayment = async (req: Request, res: Response) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const { orderId, transactionId, amount, paymentMethod } = req.body;

  try {
    if (!transactionId) {
      return res.json({
        message: "No transaction to refund",
        success: true,
      });
    }

    if (paymentMethod === "stripe") {
      await stripe.refunds.create({
        payment_intent: transactionId,
      });
      console.log(`Refunded stripe payment ${transactionId} for order ${orderId}`);
    } else if (paymentMethod === "razorpay") {
      await razorpay.payments.refund(transactionId, {
        amount: Math.ceil(amount * 100),
      });
      console.log(`Refunded razorpay payment ${transactionId} for order ${orderId}`);
    }

    res.json({
      message: "Refund processed successfully",
      success: true,
    });
  } catch (error: any) {
    console.error("Refund error:", error.message);
    res.status(500).json({
      message: "Refund processing failed",
      error: error.message,
    });
  }
};
