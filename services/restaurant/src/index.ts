import express from "express";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import restaurantRoutes from "./routes/restaraunt.js";
import itemRoutes from "./routes/menuitem.js";
import cartRoutes from "./routes/cart.js";
import addressRoutes from "./routes/address.js";
import orderRoutes from "./routes/order.js";
import reviewRoutes from "./routes/review.js";
import riderReviewRoutes from "./routes/riderReview.js";
import aiRoutes from "./routes/ai.js";
import cors from "cors";
import { connectRabbitMQ } from "./config/rabbitmq.js";
import { startPaymentConsumer } from "./config/payment.consumer.js";
import { startOrderExpiryJob } from "./controllers/order.js";
import { startReviewEmbeddingConsumer } from "./config/reviewEmbedding.consumer.js";
import { startMenuItemEmbeddingConsumer } from "./config/menuItemEmbedding.consumer.js";

dotenv.config();

const app = express();

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(
  cors({
    origin: frontendUrl.includes(",") ? frontendUrl.split(",") : frontendUrl,
    credentials: true,
  })
);

app.use(express.json());

const PORT = process.env.PORT || 5002;

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "restaurant" });
});

app.use("/api/restaurant", restaurantRoutes);
app.use("/api/item", itemRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/address", addressRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/rider-reviews", riderReviewRoutes);
app.use("/api/ai", aiRoutes);

app.listen(PORT, async () => {
  console.log(`✅ Restaurant service running on port ${PORT}`);
  connectDB();
  startOrderExpiryJob();

  // RabbitMQ is optional — the service runs without it (queued features like
  // AI embeddings will be skipped gracefully, but core ordering still works).
  try {
    await connectRabbitMQ();
    startPaymentConsumer();
    startReviewEmbeddingConsumer();
    startMenuItemEmbeddingConsumer();
  } catch (err: any) {
    console.warn(
      "⚠️  RabbitMQ not available — AI embeddings & payment events disabled.",
      "Start RabbitMQ to enable these features. Core ordering still works.",
      "\n   Error:", err?.message
    );
  }
});
