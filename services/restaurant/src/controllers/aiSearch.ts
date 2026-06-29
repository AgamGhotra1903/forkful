/**
 * AI-Powered Smart Search Controller
 * POST /api/v1/restaurant/ai-search
 *
 * Body:
 *   { query: string, mood?: string, latitude: number, longitude: number }
 *
 * Response:
 *   { results: { restaurant, score, reasoning }[], source: "ai"|"fuzzy" }
 */

import type { Request, Response } from "express";
import Restaurant from "../models/Restaurant.js";
import MenuItem from "../models/MenuItems.js";

interface AISearchBody {
  query: string;
  mood?: string;
  latitude: number;
  longitude: number;
}

interface RestaurantResult {
  restaurant: any;
  score: number;
  reasoning: string;
  matchedItems: string[];
}

// Simple fuzzy scorer for fallback
function fuzzyScore(text: string, query: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return 1;
  const words = q.split(/\s+/);
  const matched = words.filter((w) => t.includes(w)).length;
  return matched / Math.max(words.length, 1);
}

export const aiSearch = async (req: Request, res: Response) => {
  try {
    const { query, mood, latitude, longitude } = req.body as AISearchBody;

    if (!query) {
      return res.status(400).json({ message: "query is required" });
    }

    const lat = parseFloat(String(latitude));
    const lng = parseFloat(String(longitude));

    // 1. Fetch nearby restaurants (within 20km)
    const restaurants = await Restaurant.find({
      isOpen: true,
      isVerified: true,
      ...(lat && lng
        ? {
            autoLocation: {
              $near: {
                $geometry: { type: "Point", coordinates: [lng, lat] },
                $maxDistance: 20000,
              },
            },
          }
        : {}),
    }).limit(20);

    if (restaurants.length === 0) {
      return res.json({ results: [], source: "ai" });
    }

    // 2. Fetch menus for all restaurants
    const restaurantIds = restaurants.map((r) => r._id);
    const allItems = await MenuItem.find({
      restaurantId: { $in: restaurantIds },
      isAvailable: true,
    }).lean();

    const itemsByRestaurant: Record<string, typeof allItems> = {};
    allItems.forEach((item) => {
      const id = String(item.restaurantId);
      if (!itemsByRestaurant[id]) itemsByRestaurant[id] = [];
      itemsByRestaurant[id].push(item);
    });

    // 3. Try Anthropic Claude if API key is configured
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    let results: RestaurantResult[] = [];
    let source: "ai" | "fuzzy" = "fuzzy";

    if (anthropicKey) {
      try {
        const context = restaurants.map((r) => {
          const items = itemsByRestaurant[String(r._id)] || [];
          return {
            id: String(r._id),
            name: r.name,
            description: r.description || "",
            menu: items.map((i) => `${i.name} (₹${i.price})`).join(", "),
          };
        });

        const systemPrompt = `You are a food recommendation AI for Forkful, an Indian food delivery platform.
Given a user query and a list of restaurants with their menus, rank up to 5 best matching restaurants.
Return a JSON array of objects with: { id, score (0-100), reasoning (1 sentence), matchedItems (array of item names) }
Sort by score descending. Be concise. Only return JSON.`;

        const userMessage = `Query: "${query}"${mood ? `\nMood: ${mood}` : ""}

Restaurants:
${JSON.stringify(context, null, 2)}`;

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: "user", content: userMessage }],
          }),
        });

        if (response.ok) {
          const aiResponse = await response.json() as any;
          const content = aiResponse?.content?.[0]?.text ?? "[]";
          // Extract JSON from response
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const ranked: { id: string; score: number; reasoning: string; matchedItems: string[] }[] = JSON.parse(jsonMatch[0]);
            results = ranked
              .map((r) => {
                const rest = restaurants.find((res) => String(res._id) === r.id);
                if (!rest) return null;
                return {
                  restaurant: rest,
                  score: r.score,
                  reasoning: r.reasoning,
                  matchedItems: r.matchedItems || [],
                };
              })
              .filter(Boolean) as RestaurantResult[];
            source = "ai";
          }
        }
      } catch (aiErr) {
        console.error("AI search error, falling back to fuzzy:", aiErr);
      }
    }

    // 4. Fallback: fuzzy text scoring
    if (results.length === 0) {
      const combined = query + (mood ? " " + mood : "");
      results = restaurants
        .map((r) => {
          const items = itemsByRestaurant[String(r._id)] || [];
          const itemNames = items.map((i) => i.name);
          const textToScore =
            r.name + " " + (r.description || "") + " " + itemNames.join(" ");
          const score = Math.round(fuzzyScore(textToScore, combined) * 100);
          const matchedItems = itemNames.filter((n) =>
            n.toLowerCase().includes(query.toLowerCase())
          );
          return {
            restaurant: r,
            score,
            reasoning: score > 0 ? `Matches your search for "${query}"` : "Nearby restaurant",
            matchedItems,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);
      source = "fuzzy";
    }

    return res.json({ results, source });
  } catch (error) {
    console.error("AI search controller error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
