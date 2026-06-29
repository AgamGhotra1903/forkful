import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import http from "http";
import jwt from "jsonwebtoken";

let io: Server;
let pubClient: any;
let subClient: any;

export const initSocket = async (server: http.Server) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  // Initialize Socket.io server
  io = new Server(server, {
    cors: {
      origin: frontendUrl.includes(",") ? frontendUrl.split(",") : frontendUrl,
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Setup Redis adapter for horizontal scaling
  try {
    pubClient = createClient({ url: redisUrl });
    subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));

    console.log("✅ Redis adapter connected for Socket.io");
  } catch (error) {
    console.warn("⚠️ Redis adapter failed, running in single-instance mode:", error);
  }

  // JWT Authentication middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SEC!) as any;

      if (!decoded || !decoded.user) {
        return next(new Error("Unauthorized"));
      }

      socket.data.user = decoded.user;
      socket.data.socketId = socket.id;

      next();
    } catch (error) {
      console.log("❌ Socket auth failed: ", error);
      next(new Error("Unauthorized"));
    }
  });

  // Connection handler
  io.on("connection", (socket) => {
    const user = socket.data.user;

    if (!user) {
      socket.disconnect();
      return;
    }

    const userId = user._id;
    const userRole = user.role;

    // Join user room for targeted messages
    socket.join(`user:${userId}`);

    // Join role-based rooms
    if (userRole === "rider") {
      socket.join(`riders`);
    } else if (userRole === "restaurant") {
      socket.join(`restaurants`);
    } else if (userRole === "admin") {
      socket.join(`admin`);
    }

    // Join restaurant-specific room if applicable
    if (user.restaurantId) {
      socket.join(`restaurant:${user.restaurantId}`);
    }

    console.log(`✅ User ${userRole} connected: ${userId} (Socket: ${socket.id})`);
    console.log("   Rooms: ", [...socket.rooms]);

    // ── Generic room join/leave ──────────────────────────────────────────────
    socket.on("join", (room: string) => {
      console.log(`Socket ${socket.id} joining room: ${room}`);
      socket.join(room);
    });

    socket.on("leave", (room: string) => {
      console.log(`Socket ${socket.id} leaving room: ${room}`);
      socket.leave(room);
    });

    // ── RIDER LOCATION TRACKING ──────────────────────────────────────────────
    // Rider emits their location every 10s
    socket.on("rider:update_location", (payload: { lat: number; lng: number; orderId: string }) => {
      const { lat, lng, orderId } = payload;
      if (!orderId) return;

      // Broadcast to customer (in the order room)
      io.to(`order:${orderId}`).emit("rider:location_update", {
        lat,
        lng,
        orderId,
        riderId: userId,
        timestamp: new Date().toISOString(),
      });

      console.log(`📍 Rider ${userId} location: (${lat}, ${lng}) for order ${orderId}`);
    });

    // ── TABLE BOOKINGS ────────────────────────────────────────────────────────
    socket.on("table:book", (payload: { restaurantId: string; booking: any }) => {
      const { restaurantId, booking } = payload;
      if (!restaurantId || !booking) return;
      io.to(`restaurant:${restaurantId}`).emit("table:booked_notification", booking);
      console.log(`📅 Customer booked table at restaurant ${restaurantId}:`, booking);
    });

    // ── TRI-PARTY ORDER CHAT ──────────────────────────────────────────────────
    // Join order-specific chat room
    socket.on("chat:join_order", (orderId: string) => {
      const room = `order:${orderId}`;
      socket.join(room);
      console.log(`💬 ${userRole} ${userId} joined order room: ${room}`);
    });

    socket.on("chat:leave_order", (orderId: string) => {
      const room = `order:${orderId}`;
      socket.leave(room);
      console.log(`💬 ${userRole} ${userId} left order room: ${room}`);
    });

    // Send chat message to order room
    socket.on(
      "chat:send",
      (payload: {
        orderId: string;
        message: string;
        role?: string;
        senderName: string;
      }) => {
        const { orderId, message, senderName } = payload;
        if (!orderId || !message) return;

        const room = `order:${orderId}`;
        const chatMessage = {
          senderId: userId,
          senderName,
          role: userRole,
          message,
          timestamp: new Date().toISOString(),
        };

        io.to(room).emit("chat:message", chatMessage);
        console.log(`💬 [${userRole}] ${senderName} → order ${orderId}: ${message}`);
      }
    );

    // ── ADMIN SUPPORT ────────────────────────────────────────────────────────
    socket.on(
      "admin:message",
      (payload: { targetUserId: string; message: string }) => {
        if (userRole !== "admin") return;

        const { targetUserId, message } = payload;
        if (!targetUserId || !message) return;

        io.to(`user:${targetUserId}`).emit("admin:support_message", {
          message,
          timestamp: new Date().toISOString(),
        });

        console.log(`📢 Admin support message → user:${targetUserId}`);
      }
    );

    // ── ORDER NOTIFICATIONS ──────────────────────────────────────────────────
    socket.on("order:notify_available", (payload: { orderId: string; restaurantId: string }) => {
      const { orderId, restaurantId } = payload;
      io.to(`riders`).emit("order:available", { orderId, restaurantId });
      console.log(`🔔 Order ${orderId} notified to all riders`);
    });

    socket.on("order:accepted", (payload: { orderId: string; riderId: string; riderName: string }) => {
      const { orderId, riderId, riderName } = payload;
      io.to(`order:${orderId}`).emit("rider:assigned", {
        riderId,
        riderName,
        timestamp: new Date().toISOString(),
      });
      console.log(`✅ Order ${orderId} assigned to rider ${riderName}`);
    });

    socket.on("order:status_update", (payload: { orderId: string; status: string }) => {
      const { orderId, status } = payload;
      io.to(`order:${orderId}`).emit("order:status_changed", {
        orderId,
        status,
        timestamp: new Date().toISOString(),
      });
      console.log(`📋 Order ${orderId} status: ${status}`);
    });

    // ── RIDER AVAILABILITY ───────────────────────────────────────────────────
    socket.on("rider:availability_changed", (payload: { riderId: string; isAvailable: boolean }) => {
      const { isAvailable } = payload;
      io.to(`riders`).emit("rider:status_update", {
        riderId: userId,
        isAvailable,
        timestamp: new Date().toISOString(),
      });
      console.log(`🟢 Rider ${userId} availability: ${isAvailable}`);
    });

    // ── DISCONNECT HANDLER ───────────────────────────────────────────────────
    socket.on("disconnect", () => {
      console.log(`🔌 User ${userRole} ${userId} disconnected`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

// Helper to emit to specific user
export const sendMessageToSocketId = (io: Server, socketId: string, event: string, data: any) => {
  io.to(socketId).emit(event, data);
};

// Cleanup on server shutdown
export const closeSocket = async () => {
  if (pubClient) {
    await pubClient.quit();
  }
  if (subClient) {
    await subClient.quit();
  }
  if (io) {
    io.close();
  }
};
