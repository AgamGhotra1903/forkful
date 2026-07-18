import dns from "dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);

import express from "express";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import riderRoutes from "./routes/rider.js";
import cors from "cors";
import { connectRabbitMQ } from "./config/rabbitmq.js";

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

const PORT = process.env.PORT || 5003;

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "rider" });
});

app.use("/api/rider", riderRoutes);

app.listen(PORT, async () => {
  console.log(`✅ Rider service running on port ${PORT}`);
  await connectDB();

  // Run rating database self-healing migration
  try {
    const { Rider } = await import("./model/Rider.js");
    const riders = await Rider.find();
    for (const r of riders) {
      let updated = false;
      if (r.ratingCount === undefined || r.ratingCount === null) {
        r.ratingCount = 0;
        updated = true;
      }
      if (r.rating === undefined || r.rating === null) {
        r.rating = 0;
        updated = true;
      }
      // Correct 5.0 offset if rating is larger than count * 5
      if (r.ratingCount > 0 && r.rating > r.ratingCount * 5) {
        r.rating = r.rating - 5;
        updated = true;
      }
      if (updated) {
        await r.save();
        console.log(`[Rider Migration] Corrected rating/count for rider ${r.name} (ID: ${r._id})`);
      }
    }
  } catch (migErr: any) {
    console.error("[Rider Migration] Failed to run rating migration:", migErr.message);
  }

  // RabbitMQ is optional — the service runs without it (order-ready queue
  // notifications disabled, but riders can still poll for available orders).
  try {
    await connectRabbitMQ();
  } catch (err: any) {
    console.warn(
      "⚠️  RabbitMQ not available — order-ready queue notifications disabled.",
      "Riders can still poll GET /orders/available to see ready orders.",
      "\n   Error:", err?.message
    );
  }
});
