import type { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import User from "../models/User.js";
import { GoogleGenAI } from "@google/genai";

/**
 * POST /api/ai/analyze-cart
 * Analyzes the user's cart against their active dietary profile and health goals.
 */
export const analyzeCart = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Please login" });
  }

  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ message: "items array is required" });
  }

  // Get active user preferences
  const dbUser = await User.findById(req.user._id);
  const preferences = {
    dietaryPreferences: dbUser?.dietaryPreferences || [],
    allergies: dbUser?.allergies || [],
    healthGoals: dbUser?.healthGoals || "",
  };

  // If user has no goals/allergies/preferences, return simple perfect score
  if (
    preferences.dietaryPreferences.length === 0 &&
    preferences.allergies.length === 0 &&
    !preferences.healthGoals
  ) {
    return res.json({
      matchScore: 100,
      analysis: "No active dietary preferences or health targets configured. Set them on the Home page!",
      warnings: [],
      suggestions: [],
    });
  }

  // Fallback default response in case API key is missing or fails
  let analysisResult = {
    matchScore: 80,
    analysis: "Matches most of your profile, but exact nutrient metrics couldn't be calculated.",
    warnings: [] as string[],
    suggestions: [] as string[],
  };

  // Run through active allergen warning detection right away programmatically for absolute safety!
  if (preferences.allergies.length > 0) {
    for (const item of items) {
      const itemNameLower = item.name.toLowerCase();
      const descLower = (item.description || "").toLowerCase();
      for (const allergy of preferences.allergies) {
        const allergyLower = allergy.toLowerCase();
        if (itemNameLower.includes(allergyLower) || descLower.includes(allergyLower)) {
          analysisResult.warnings.push(`⚠️ Contains allergen: ${allergy} found in "${item.name}"`);
          analysisResult.matchScore = Math.max(10, analysisResult.matchScore - 40);
        }
      }
    }
  }

  const systemPrompt = `You are a nutrition expert. Review a user's food cart items against their dietary preferences, allergy list, and health targets.

User Profile:
- Dietary Preferences: ${preferences.dietaryPreferences.join(", ") || "None"}
- Allergies: ${preferences.allergies.join(", ") || "None"}
- Health/Calorie Goals: ${preferences.healthGoals || "None"}

Cart items:
${JSON.stringify(items.map(i => ({ name: i.name, description: i.description || "" })), null, 2)}

Evaluate:
1. "matchScore": An integer from 0 to 100 representing how well the combined meal fits their preferences and targets. Deduct points for high-calorie/fat meals if they have a calorie-deficit target, or if a preference is violated. If an allergen warning is present, keep the score low.
2. "analysis": A concise, encouraging summary (max 20 words) explaining the score/fit.
3. "warnings": A list of specific warnings (e.g. dietary mismatches or allergen details).
4. "suggestions": A list of recommended adjustments or additions (max 2 suggestions) to help hit their caloric/macros goal.

Return ONLY a valid JSON object in this exact shape:
{
  "matchScore": 95,
  "analysis": "This fits your vegetarian goal and keeps you within your 1800 kcal target.",
  "warnings": [],
  "suggestions": ["Swap plain rice with salad to cut down carbs."]
}`;

  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: "Evaluate my food cart" }] }],
        config: {
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          responseMimeType: "application/json",
        },
      });

      const text = response.text?.trim() || "";
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed.matchScore !== undefined) {
          analysisResult.matchScore = Number(parsed.matchScore);
          analysisResult.analysis = parsed.analysis || "";
          analysisResult.warnings = [...new Set([...analysisResult.warnings, ...(parsed.warnings || [])])];
          analysisResult.suggestions = parsed.suggestions || [];
        }
      }
    } catch (err: any) {
      console.warn("[AI Cart Analysis] Gemini call failed, returning safety fallback:", err.message);
    }
  }

  return res.json(analysisResult);
});
