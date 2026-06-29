import express from "express";
import { getIO } from "../socket.js";

const router = express.Router();

// ── /emit — targeted room emit ──────────────────────────────────────────────
router.post("/emit", (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { event, room, payload } = req.body;
  if (!event || !room) {
    return res.status(400).json({ message: "event and room are required" });
  }

  const io = getIO();
  console.log(`📶 Emitting event ${event} to room ${room}`);
  io.to(room).emit(event, payload ?? {});

  return res.json({ success: true });
});

// ── /broadcast — system-wide announcement ──────────────────────────────────
// Body: { event, payload, segment? }
// segment: "all" | "customers" | "riders" | "restaurants"  (optional, default "all")
router.post("/broadcast", (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { event, payload, segment } = req.body;
  if (!event) {
    return res.status(400).json({ message: "event is required" });
  }

  const io = getIO();
  const broadcastEvent = event ?? "admin:broadcast";

  if (segment && segment !== "all") {
    // Emit to a named segment room — clients join these on connect by role
    io.to(`segment:${segment}`).emit(broadcastEvent, payload ?? {});
    console.log(`📣 Segment broadcast [${segment}]: ${broadcastEvent}`);
  } else {
    io.emit(broadcastEvent, payload ?? {});
    console.log(`📣 Global broadcast: ${broadcastEvent}`);
  }

  return res.json({ success: true });
});

export default router;
