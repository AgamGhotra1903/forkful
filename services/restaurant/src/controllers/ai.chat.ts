import axios from "axios";
import mongoose from "mongoose";
import { GoogleGenAI } from "@google/genai";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import MenuItems from "../models/MenuItems.js";

export const aiChat = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const { message, history = [], sessionId } = req.body;
  if (!message?.trim()) return res.status(400).json({ message: "Message required" });

  // RAG: Fetch user context
  const recentOrders = await Order.find({ userId: user._id.toString() })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  // RAG: Fetch nearby restaurants if location provided
  const { latitude, longitude } = req.query as any;
  let nearbyRestaurants: any[] = [];
  if (latitude && longitude) {
    nearbyRestaurants = await Restaurant.find({
      autoLocation: {
        $nearSphere: {
          $geometry: { type: "Point", coordinates: [parseFloat(longitude as string), parseFloat(latitude as string)] },
          $maxDistance: 8000,
        },
      },
      isVerified: true,
      isOpen: true,
    }).limit(10).lean();

    if (nearbyRestaurants.length > 0) {
      const restaurantIds = nearbyRestaurants.map(r => r._id.toString());
      const menus = await MenuItems.find({ restaurantId: { $in: restaurantIds } }).lean();
      nearbyRestaurants = nearbyRestaurants.map(r => ({
        ...r,
        menu: menus.filter(m => m.restaurantId.toString() === r._id.toString()).map(m => ({
          name: m.name, price: m.price, description: m.description, category: m.category,
        })),
      }));
    }
  }

  const systemPrompt = `You are Forkful AI, a smart food delivery assistant for the Forkful platform (like Swiggy/Zomato). You help users with orders, restaurant discovery, food recommendations, and account questions.

USER CONTEXT:
- Name: ${user.name}
- Email: ${user.email}
- Role: ${user.role}

RECENT ORDERS (last 5):
${recentOrders.length > 0 ? JSON.stringify(recentOrders.map(o => ({
    id: o._id,
    restaurant: o.restaurantName,
    status: o.status,
    total: o.totalAmount,
    items: o.items?.map((i: any) => `${i.name} x${i.quantity}`).join(", "),
    date: o.createdAt,
  })), null, 2) : "No recent orders"}

NEARBY RESTAURANTS (available now):
${nearbyRestaurants.length > 0 ? JSON.stringify(nearbyRestaurants.map(r => ({
    id: r._id,
    name: r.name,
    description: r.description,
    address: r.autoLocation?.formattedAddress,
    menu: r.menu,
  })), null, 2) : "Location not provided or no nearby restaurants"}

PLATFORM INFO:
- Delivery fee: ₹49 for orders under ₹250, free above
- Platform fee: ₹7
- Payment methods: Razorpay, Stripe, COD
- You can help with: order tracking, restaurant info, menu items, dietary questions, account help

Respond conversationally and helpfully. If recommending restaurants, mention specific dishes from their menu. If asked about order status, refer to the actual order data above. Keep responses concise but complete. Format responses in clean markdown.`;

  const messages = [
    ...(history as any[]).slice(-10),
    { role: "user", content: message.trim() },
  ];

  let answer = "";

  // ── Try Anthropic first ──────────────────────────────────────────────────
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      console.log("[AI Chat] Dispatching to Anthropic...");
      const response = await axios.post(
        "https://api.anthropic.com/v1/messages",
        {
          model: "claude-3-5-sonnet-latest",
          max_tokens: 1000,
          system: systemPrompt,
          messages: messages.map(m => ({
            role: m.role === "model" || m.role === "assistant" ? "assistant" : "user",
            content: m.content
          })),
        },
        {
          headers: {
            "x-api-key": process.env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
        }
      );
      answer = response.data?.content?.[0]?.text || "";
    } catch (anthropicErr: any) {
      console.warn("[AI Chat] Anthropic failed:", anthropicErr?.response?.status, anthropicErr?.message, "— falling back to Gemini.");
    }
  }

  // ── Fallback to Gemini if Anthropic produced no answer ───────────────────
  if (!answer && process.env.GEMINI_API_KEY) {
    try {
      console.log("[AI Chat] Using Gemini fallback...");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: messages.map((m) => ({
          role: m.role === "assistant" || m.role === "model" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        config: {
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
        },
      });
      answer = response.text || "";
    } catch (geminiErr: any) {
      console.error("[AI Chat] Gemini also failed:", geminiErr?.message);
    }
  }

  if (!answer) {
    return res.status(503).json({
      answer: "AI assistant is temporarily unavailable. Please try again shortly.",
      sources: [],
      sessionId: sessionId || `session_${Date.now()}`,
    });
  }

  const sources: { type: string; name: string; id?: string }[] = [];
  recentOrders.forEach(o => {
    if (answer.toLowerCase().includes((o.restaurantName || "").toLowerCase())) {
      sources.push({ type: "order", name: `Order from ${o.restaurantName}`, id: o._id.toString() });
    }
  });
  nearbyRestaurants.forEach(r => {
    if (answer.toLowerCase().includes((r.name || "").toLowerCase())) {
      sources.push({ type: "restaurant", name: r.name, id: r._id.toString() });
    }
  });

  res.json({
    answer,
    sources: [...new Map(sources.map(s => [s.name, s])).values()],
    sessionId: sessionId || `session_${Date.now()}`,
  });
});

