import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import { suggestMenuItems } from "../controllers/ai.js";
import { aiChat } from "../controllers/ai.chat.js";
import { visionSearch } from "../controllers/ai.vision.js";
import { analyzeCart } from "../controllers/ai.cart-analysis.js";
import uploadFile from "../middlewares/multer.js";

const router = express.Router();

// POST /api/ai/suggest - Semantic menu item suggestions
router.post("/suggest", isAuth, suggestMenuItems);
// POST /api/ai/chat - RAG-enabled Forkful AI chat
router.post("/chat", isAuth, aiChat);
// POST /api/ai/vision - Camera-based product identification + menu matching
router.post("/vision", isAuth, uploadFile, visionSearch);
// POST /api/ai/analyze-cart - Evaluate cart dietary profile fit
router.post("/analyze-cart", isAuth, analyzeCart);

export default router;
