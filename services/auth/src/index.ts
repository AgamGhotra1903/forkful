import dns from "dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);

import express from "express";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import cors from "cors";

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

const PORT = process.env.PORT || 5001;

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "auth" });
});

app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`✅ Auth service running on port ${PORT}`);
  connectDB();
});
