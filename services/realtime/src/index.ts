import dns from "dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { initSocket, closeSocket } from "./socket.js";
import internalRoute from "./routes/internal.js";

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

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "realtime" });
});

app.use("/api/v1/internal", internalRoute);

const server = http.createServer(app);

const startServer = async () => {
  try {
    await initSocket(server);
    
    server.listen(process.env.PORT || 5006, () => {
      console.log(`✅ Realtime service running on port ${process.env.PORT || 5006}`);
    });

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      console.log("SIGTERM received, shutting down...");
      await closeSocket();
      server.close(() => {
        console.log("Server closed");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("❌ Failed to start realtime service:", error);
    process.exit(1);
  }
};

startServer();
