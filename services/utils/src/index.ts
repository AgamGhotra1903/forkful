import express from "express";
import dotenv from "dotenv";
import cloudinaryRoutes from "./routes/cloudinary.js";
import paymentRoutes from "./routes/payment.js";
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

app.use(express.json({ limit: "50mb" }));

const PORT = process.env.PORT || 5005;

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "utils" });
});

app.use("/api", cloudinaryRoutes);
app.use("/api/payment", paymentRoutes);

app.listen(PORT, () => {
  console.log(`✅ Utils service running on port ${PORT}`);
});
