import type { Response } from "express";
import mongoose from "mongoose";
import { GoogleGenAI } from "@google/genai";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import MenuItems from "../models/MenuItems.js";
import Restaurant from "../models/Restaurant.js";
import { embedText } from "../services/embeddings.js";
import { parseJSONDefensively } from "./reviewInsights.js";

const IDENTIFY_PROMPT = `You are a food-recognition assistant for a food delivery app. Look at the photo and identify the single most prominent food or drink item in it.

Return ONLY valid JSON, no markdown, no commentary, in exactly this shape:
{
  "isFood": true or false,
  "itemName": "<short name of the dish/drink, or empty string if isFood is false>",
  "category": "<e.g. Burger, Pizza, Dessert, Beverage, Salad — best guess, or empty string>",
  "description": "<one sentence describing key ingredients/style, used for menu matching, or empty string>"
}

If the photo does not clearly show food or drink, set isFood to false and leave the other fields as empty strings. Never invent a menu, price, or restaurant name — you are only describing what is visible in the photo.`;

/**
 * POST /api/ai/vision
 * Accepts a single image (multipart field "file"), identifies the food/drink
 * item shown using Gemini Vision, then semantically matches it against the
 * live menu inventory (optionally scoped to one restaurant) the same way
 * /api/ai/suggest does for text queries.
 */
export const visionSearch = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Please login" });
  }

  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: "Please provide an image" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ message: "Visual search is temporarily unavailable." });
  }

  const { restaurantId, maxPrice } = req.body;

  // 1. Identify the item in the photo with Gemini Vision.
  let identified: { isFood: boolean; itemName: string; category: string; description: string };
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: file.mimetype || "image/jpeg", data: file.buffer.toString("base64") } },
            { text: IDENTIFY_PROMPT },
          ],
        },
      ],
      config: { responseMimeType: "application/json" },
    });
    identified = parseJSONDefensively(response.text || "{}");
  } catch (err: any) {
    console.error("[AI Vision] Identification failed:", err?.message);
    return res.status(502).json({ message: "Couldn't analyze that photo. Please try again." });
  }

  if (!identified?.isFood || !identified.itemName) {
    return res.json({
      identified: null,
      matches: [],
      message: "That doesn't look like a food or drink item — try pointing the camera at a dish, snack, or drink.",
    });
  }

  // 2. Semantic vector search against the live menu inventory.
  const queryText = [identified.itemName, identified.category, identified.description].filter(Boolean).join(" — ");
  const queryVector = await embedText(queryText);

  const filter: Record<string, any> = {
    isAvailable: true,
    embeddingStatus: "done",
  };
  if (restaurantId) filter.restaurantId = new mongoose.Types.ObjectId(restaurantId);
  if (maxPrice !== undefined) filter.price = { $lte: Number(maxPrice) };

  const candidates = await MenuItems.aggregate([
    {
      $vectorSearch: {
        index: "menuitem_vector_index",
        path: "embedding",
        queryVector,
        numCandidates: 150,
        limit: 12,
        filter,
      },
    },
    {
      $project: {
        _id: 1,
        restaurantId: 1,
        name: 1,
        description: 1,
        price: 1,
        image: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);

  if (candidates.length === 0) {
    return res.json({
      identified: { itemName: identified.itemName, category: identified.category, description: identified.description },
      matches: [],
      message: `Identified "${identified.itemName}", but nothing similar is available right now.`,
    });
  }

  // 3. Ask the LLM to pick + explain the best functional alternatives.
  const candidateItems = candidates.map((c) => ({
    id: c._id.toString(),
    name: c.name,
    description: c.description || "",
    price: c.price,
  }));

  const rankPrompt = `A customer pointed their camera at a food item and our vision model identified it as: "${identified.itemName}" (${identified.category}). Description: ${identified.description}

You do not generate menu items — you select from a fixed list that is provided to you. Treat that list as the complete and only truth.

Return ONLY valid JSON, no markdown, no commentary.

Available menu items (JSON array — you may ONLY choose ids from this exact list):
${JSON.stringify(candidateItems, null, 2)}

Return JSON in exactly this shape:
{
  "matches": [
    { "id": "<id copied exactly from the list above>", "reason": "<max 18 words: why this is a good match or alternative>" }
  ]
}

Rules:
1. Every "id" must be character-for-character identical to an "id" in the list above. Omit if uncertain.
2. Return at most 5 matches, best first. Include the closest direct match first if one exists, then reasonable functional alternatives (similar cuisine, flavor profile, or meal type).
3. If nothing reasonably matches, return {"matches": []}.
4. "reason" never invents price, stock, or delivery claims.`;

  let matches: any[] = [];
  try {
    const { generateLlmResponse } = await import("./reviewInsights.js");
    const raw = await generateLlmResponse(rankPrompt);
    const result = parseJSONDefensively(raw);
    const returned = result.matches || [];
    const candidateIdsSet = new Set(candidateItems.map((i) => i.id));
    const validMatches = returned.filter((m: any) => m?.id && candidateIdsSet.has(m.id));

    const validIds = validMatches.map((m: any) => new mongoose.Types.ObjectId(m.id));
    const dbItems = await MenuItems.find({ _id: { $in: validIds } }).lean();
    const restaurantIds = [...new Set(dbItems.map((i) => i.restaurantId.toString()))];
    const restaurants = await Restaurant.find({ _id: { $in: restaurantIds } }).select("name").lean();
    const restaurantNameById = new Map(restaurants.map((r) => [r._id.toString(), r.name]));

    matches = validMatches
      .map((m: any) => {
        const item = dbItems.find((i) => i._id.toString() === m.id);
        if (!item) return null;
        return {
          item,
          restaurant: { id: item.restaurantId.toString(), name: restaurantNameById.get(item.restaurantId.toString()) || "" },
          reason: m.reason,
        };
      })
      .filter(Boolean);
  } catch (err: any) {
    console.error("[AI Vision] Ranking failed:", err?.message);
    return res.status(502).json({ message: "Couldn't rank menu matches. Please try again." });
  }

  res.json({
    identified: { itemName: identified.itemName, category: identified.category, description: identified.description },
    matches,
  });
});
