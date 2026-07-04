import axios from "axios";
import crypto from "crypto";
import mongoose from "mongoose";
import { GoogleGenAI } from "@google/genai";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import MenuItems from "../models/MenuItems.js";
import AIChatSession from "../models/AIChatSession.js";
import { embedText } from "../services/embeddings.js";
import Review from "../models/Review.js";
import User from "../models/User.js";

// How many past messages (user + assistant combined) to keep per session.
const MAX_STORED_MESSAGES = 40;

export const aiChat = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const { message, history = [], sessionId: incomingSessionId } = req.body;
  if (!message?.trim()) return res.status(400).json({ message: "Message required" });

  const sessionId = incomingSessionId || `session_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

  // 1. Fetch persistent user preferences from DB
  const dbUser = await User.findById(user._id);
  const userPreferences = {
    dietaryPreferences: dbUser?.dietaryPreferences || [],
    allergies: dbUser?.allergies || [],
    healthGoals: dbUser?.healthGoals || ""
  };

  // ── Server-side memory: prefer the persisted session if one exists for
  // this user + sessionId. Falls back to whatever history the client sent
  let session = await AIChatSession.findOne({ userId: user._id.toString(), sessionId });
  const priorHistory = session
    ? session.messages.map((m) => ({ role: m.role, content: m.content }))
    : (history as any[]);

  // RAG: Fetch user context
  const recentOrders = await Order.find({ userId: user._id.toString() })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  // RAG: Fetch nearby restaurants if location provided
  const { latitude, longitude, weather } = req.query as any;
  let nearbyRestaurants: any[] = [];
  let matchedMenuItems: any[] = [];
  let weatherContextReviews: any[] = [];

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
      
      // Fetch menus
      const menus = await MenuItems.find({ restaurantId: { $in: restaurantIds } }).lean();
      nearbyRestaurants = nearbyRestaurants.map(r => ({
        ...r,
        menu: menus.filter(m => m.restaurantId.toString() === r._id.toString()).map(m => ({
          name: m.name, price: m.price, description: m.description, category: m.category,
        })),
      }));

      // RAG Vector Search: find dishes matching the user's specific request semantically
      try {
        const queryVector = await embedText(message);
        matchedMenuItems = await MenuItems.aggregate([
          {
            $vectorSearch: {
              index: "menuitem_vector_index",
              path: "embedding",
              queryVector: queryVector,
              numCandidates: 100,
              limit: 8,
              filter: {
                restaurantId: { $in: restaurantIds.map(id => new mongoose.Types.ObjectId(id)) },
                isAvailable: true,
                embeddingStatus: "done"
              }
            }
          },
          {
            $project: {
              _id: 1,
              restaurantId: 1,
              name: 1,
              description: 1,
              price: 1,
              category: 1,
              score: { $meta: "vectorSearchScore" }
            }
          }
        ]);
      } catch (err) {
        console.warn("[AI Chat] Menu Vector search failed, falling back to keyword matching:", err);
        const tokens = message.split(/\s+/).filter(Boolean);
        const regexQueries = tokens.map((t: string) => ({
          $or: [
            { name: { $regex: t, $options: "i" } },
            { description: { $regex: t, $options: "i" } }
          ]
        }));
        
        matchedMenuItems = await MenuItems.find({
          restaurantId: { $in: restaurantIds.map(id => new mongoose.Types.ObjectId(id)) },
          isAvailable: true,
          ...(regexQueries.length > 0 ? { $or: regexQueries } : {})
        }).limit(8).lean();
      }

      // RAG Vector Search: fetch reviews matching mood / weather context
      if (weather) {
        try {
          const weatherQuery = `${weather} comfort food`;
          const weatherVector = await embedText(weatherQuery);
          weatherContextReviews = await Review.aggregate([
            {
              $vectorSearch: {
                index: "review_vector_index",
                path: "embedding",
                queryVector: weatherVector,
                numCandidates: 50,
                limit: 5,
                filter: {
                  restaurantId: { $in: restaurantIds.map(id => new mongoose.Types.ObjectId(id)) },
                  embeddingStatus: "done"
                }
              }
            },
            {
              $project: {
                _id: 1,
                restaurantId: 1,
                rating: 1,
                text: 1,
                score: { $meta: "vectorSearchScore" }
              }
            },
            {
              $match: {
                score: { $gt: 0.35 }
              }
            }
          ]);
        } catch (err) {
          console.warn("[AI Chat] Weather review vector search failed, falling back to keyword reviews:", err);
          weatherContextReviews = await Review.find({
            restaurantId: { $in: restaurantIds.map(id => new mongoose.Types.ObjectId(id)) },
            $or: [
              { text: { $regex: weather, $options: "i" } },
              { text: { $regex: "comfort food", $options: "i" } }
            ]
          }).limit(5).lean();
        }
      }
    }
  }

  const systemPrompt = `You are Forkful AI, a smart food delivery assistant for the Forkful platform (like Swiggy/Zomato). You help users with orders, restaurant discovery, food recommendations, and account questions.

USER CONTEXT:
- Name: ${user.name}
- Email: ${user.email}
- Role: ${user.role}

USER DIETARY & HEALTH PROFILE:
- Dietary Preferences: ${userPreferences.dietaryPreferences.length > 0 ? userPreferences.dietaryPreferences.join(", ") : "None specified"}
- Allergies: ${userPreferences.allergies.length > 0 ? userPreferences.allergies.join(", ") : "None specified"}
- Health Goals: ${userPreferences.healthGoals || "None specified"}

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

SEMANTICALLY MATCHING DISHES (RAG Context):
${matchedMenuItems.length > 0 ? JSON.stringify(matchedMenuItems.map(m => ({
    id: m._id,
    restaurantId: m.restaurantId,
    restaurantName: nearbyRestaurants.find(r => r._id.toString() === m.restaurantId.toString())?.name || "Unknown",
    name: m.name,
    description: m.description,
    price: m.price,
    category: m.category,
    relevanceScore: m.score
  })), null, 2) : "No semantically matching items found for the current query."}

WEATHER & MOOD CONTEXT REVIEWS (RAG Context):
${weather ? `Current weather condition: ${weather}` : "Weather not provided"}
${weatherContextReviews.length > 0 ? JSON.stringify(weatherContextReviews.map(rev => ({
    restaurantName: nearbyRestaurants.find(r => r._id.toString() === rev.restaurantId.toString())?.name || "Unknown",
    rating: rev.rating,
    text: rev.text,
    relevanceScore: rev.score
  })), null, 2) : "No specific mood/weather reviews retrieved."}

PLATFORM INFO:
- Delivery fee: ₹49 for orders under ₹250, free above
- Platform fee: ₹7
- Payment methods: Razorpay, Stripe, COD

AI RULES & BEHAVIORS:
1. ALLERGY & DIETARY ALERTS: Always check menu items against the user's allergies and dietary preferences. If a user asks for or you suggest a dish that conflicts with their allergies or dietary preferences, flag a clear warning (e.g. "**⚠️ Allergen Warning: Contains Peanuts**") and suggest a safe alternative from the menu.
2. CONTEXT-AWARE RECOMMENDATIONS: Incorporate the weather and time into suggestions (e.g. on a rainy day, recommend warm comfort foods like soup, pakoras, tea, and reference the weather comfort reviews supplied above).
3. GROUP ORDER ASSISTANT: If the user indicates a group order (e.g. "order for a group", "ordering with friends", "group cart suggestions"), ask or resolve preferences/budgets for all participants, then suggest a combination of items from a single nearby restaurant to minimize delivery fees and maximize coupons/discounts.
4. PROFILE UPDATE CAPABILITY: If the user requests to update, add, or clear their dietary preferences, allergies, or health goals, append the special token exactly at the end of your response:
   :::PROFILE_UPDATE:::JSON_PAYLOAD:::
   JSON_PAYLOAD must be a JSON object containing the updated fields:
   {
     "dietaryPreferences": [...],
     "allergies": [...],
     "healthGoals": "..."
   }
   Confirm the changes politely in your response. Do not output this token unless the user explicitly requested profile changes.
5. Format responses in clean markdown. Keep responses concise but complete and friendly.`;

  const messages = [
    ...priorHistory.slice(-10),
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
      sessionId,
    });
  }

  // ── Parse any profile updates requested by LLM ──────────────────────────
  let profileUpdated = false;
  const tokenMatch = answer.match(/:::PROFILE_UPDATE:::(.*?):::/);
  if (tokenMatch && tokenMatch[1]) {
    try {
      const payload = JSON.parse(tokenMatch[1].trim());
      answer = answer.replace(/:::PROFILE_UPDATE:::.*?:::/, "").trim();

      if (dbUser) {
        if (payload.dietaryPreferences !== undefined) dbUser.dietaryPreferences = payload.dietaryPreferences;
        if (payload.allergies !== undefined) dbUser.allergies = payload.allergies;
        if (payload.healthGoals !== undefined) dbUser.healthGoals = payload.healthGoals;
        await dbUser.save();
        profileUpdated = true;
        console.log(`[AI Chat] Updated user profile for ${user._id} through chat.`);
      }
    } catch (parseErr: any) {
      console.warn("[AI Chat] Profile update parsing failed:", parseErr.message);
    }
  }

  // ── Persist this turn to server-side session memory ─────────────────────
  try {
    const newMessages = [
      { role: "user" as const, content: message.trim(), at: new Date() },
      { role: "assistant" as const, content: answer, at: new Date() },
    ];
    if (session) {
      session.messages = [...session.messages, ...newMessages].slice(-MAX_STORED_MESSAGES);
      await session.save();
    } else {
      await AIChatSession.create({
        userId: user._id.toString(),
        sessionId,
        messages: newMessages,
      });
    }
  } catch (persistErr: any) {
    console.warn("[AI Chat] Failed to persist session memory:", persistErr?.message);
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
    sessionId,
    profileUpdated, // Signal the frontend to refetch profile if needed
    userPreferences: profileUpdated && dbUser ? {
      dietaryPreferences: dbUser.dietaryPreferences,
      allergies: dbUser.allergies,
      healthGoals: dbUser.healthGoals,
    } : undefined
  });
});

