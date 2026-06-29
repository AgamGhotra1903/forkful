import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import { suggestMenuItems } from "../controllers/ai.js";
import { aiChat } from "../controllers/ai.chat.js";

const router = express.Router();

// POST /api/ai/suggest - Semantic menu item suggestions
router.post("/suggest", isAuth, suggestMenuItems);
// POST /api/ai/chat - RAG-enabled Forkful AI chat
router.post("/chat", isAuth, aiChat);

export default router;
