import mongoose, { Schema, Document } from "mongoose";

// Server-side persisted conversation memory for the AI shopping assistant.
// Replaces "trust whatever history array the client sends" with a durable,
// per-user, per-session store so multi-turn context (including topic
// switches) survives page reloads and isn't spoofable from the client.
// Purely additive — the /api/ai/chat response shape is unchanged, so the
// existing AISupportAssistant widget keeps working exactly as before.

export interface IAIChatMessage {
  role: "user" | "assistant";
  content: string;
  at: Date;
}

export interface IAIChatSession extends Document {
  userId: string;
  sessionId: string;
  messages: IAIChatMessage[];
  updatedAt: Date;
  createdAt: Date;
}

const messageSchema = new Schema<IAIChatMessage>(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const schema = new Schema<IAIChatSession>(
  {
    userId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true }
);

schema.index({ userId: 1, sessionId: 1 }, { unique: true });

export default mongoose.model<IAIChatSession>("AIChatSession", schema);
