// components/ui/AIChefAssistant.tsx
// Floating AI cooking assistant widget — matches Samadhaan floating chat aesthetic.
// Uses Anthropic SDK client-side (VITE_ANTHROPIC_API_KEY env var).
// Degrades gracefully if API key is absent.

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { restaurantService } from "../../main";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AISupportAssistantProps {
  pageContext?: "order" | "explore" | "cart";
}

const GREETING: Record<NonNullable<AISupportAssistantProps["pageContext"]> | "default", string> = {
  order: "👋 Hi there! I'm your Forkful Support Agent. I see you're on the order page. Need help tracking your order or requesting a refund?",
  explore: "👋 Hi! I'm your Forkful Support Agent. Looking for food recommendations, or need help with a past order?",
  cart: "🛒 Having trouble checking out? I can help you with promo codes or payment issues.",
  default: "👋 Hello! I'm your Forkful Support Agent. Ask me about your orders, refunds, or restaurant recommendations!",
};

const QUICK_CHIPS: Record<NonNullable<AISupportAssistantProps["pageContext"]> | "default", string[]> = {
  order: ["Where's my order?", "Request a refund", "Wrong items delivered"],
  explore: ["Any spicy food nearby?", "Track my last order", "Refund policy"],
  cart: ["Promo codes not working", "Payment failed", "Delivery fees explained"],
  default: ["Where's my order?", "Refund policy", "Restaurant recommendations"],
};

// Simple markdown bold renderer
const renderText = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
};

export const AISupportAssistant = ({ pageContext = "explore" }: AISupportAssistantProps) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [pulseActive, setPulseActive] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const greeting = GREETING[pageContext] ?? GREETING.default;
  const chips = QUICK_CHIPS[pageContext] ?? QUICK_CHIPS.default;

  // Stop FAB pulse once opened (store in localStorage)
  useEffect(() => {
    const seen = localStorage.getItem("forkful_ai_seen");
    if (seen) setPulseActive(false);
  }, []);

  const handleOpen = () => {
    setOpen(true);
    setPulseActive(false);
    localStorage.setItem("forkful_ai_seen", "1");
    if (messages.length === 0) {
      setMessages([{ role: "assistant", content: greeting }]);
    }
  };

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    // Add empty assistant message as visual loader indicator
    setMessages((prev) => [...prev, { role: "assistant", content: "Thinking..." }]);

    try {
      let params = {};
      if (navigator.geolocation) {
        const coords: any = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos.coords),
            () => resolve(null),
            { timeout: 2000 }
          );
        });
        if (coords) {
          params = { latitude: coords.latitude, longitude: coords.longitude };
        }
      }

      const historyList = messages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        content: m.content
      }));

      const { data } = await axios.post(
        `${restaurantService}/api/ai/chat`,
        {
          message: text,
          history: historyList,
        },
        {
          params,
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          updated[updated.length - 1] = {
            role: "assistant",
            content: data.answer || "Sorry, I couldn't generate a response."
          };
        }
        return updated;
      });
    } catch (err: any) {
      console.error("[AI Chat] Backend query failed:", err);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          updated[updated.length - 1] = {
            role: "assistant",
            content: `⚠️ AI Assistant offline: ${err.response?.data?.message || err.message}`
          };
        }
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* ── Floating Action Button ── */}
      <button
        onClick={handleOpen}
        aria-label="Open Forkful AI Support assistant"
        className={`fixed bottom-6 right-6 z-[9990] w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 hover:scale-110 active:scale-95 ${pulseActive ? "fab-pulse" : ""}`}
        style={{
          background: "linear-gradient(135deg, #FF5733 0%, #FF824D 100%)",
          color: "white",
          border: "none",
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: "24px", lineHeight: 1 }}>🍳</span>
      </button>

      {/* ── Chat Widget ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-widget"
            initial={{ opacity: 0, y: 60, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed bottom-24 right-6 z-[9991] w-[360px] rounded-3xl overflow-hidden flex flex-col"
            style={{
              height: "520px",
              background: "rgba(15, 23, 42, 0.92)",
              backdropFilter: "blur(24px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #FF5733 0%, #FF824D 100%)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/20">
                  <span style={{ fontSize: "18px" }}>🍳</span>
                </div>
                <div>
                  <p className="text-white font-bold text-sm leading-tight">Forkful Support</p>
                  <p className="text-white/70 text-[10px] font-mono uppercase tracking-wider">
                    AI Support Agent
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                aria-label="Close AI assistant"
                style={{ color: "white" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar"
            >
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{
                      opacity: 0,
                      x: msg.role === "assistant" ? -16 : 16,
                      y: 4,
                    }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    transition={{ duration: 0.22 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className="max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                      style={
                        msg.role === "user"
                          ? {
                              background: "linear-gradient(135deg, #FF5733 0%, #FF824D 100%)",
                              color: "white",
                              borderBottomRightRadius: "6px",
                            }
                          : {
                              background: "rgba(255,255,255,0.07)",
                              color: "rgba(248,250,252,0.92)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              borderBottomLeftRadius: "6px",
                            }
                      }
                    >
                      {msg.role === "assistant"
                        ? renderText(msg.content)
                        : msg.content}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              {streaming && (
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex justify-start"
                >
                  <div
                    className="flex items-center gap-1.5 px-4 py-3 rounded-2xl"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderBottomLeftRadius: "6px",
                    }}
                  >
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="typing-dot w-2 h-2 rounded-full"
                        style={{ background: "rgba(255,87,51,0.8)", display: "inline-block" }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Quick chips */}
            {messages.length <= 1 && !streaming && (
              <div className="px-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {chips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => sendMessage(chip)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer"
                    style={{
                      background: "rgba(255,87,51,0.12)",
                      border: "1px solid rgba(255,87,51,0.25)",
                      color: "#FF824D",
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* Input bar */}
            <div
              className="flex items-end gap-2 px-4 py-3 flex-shrink-0"
              style={{
                borderTop: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Forkful Support anything…"
                rows={1}
                disabled={streaming}
                className="flex-1 resize-none rounded-2xl px-4 py-3 text-sm outline-none transition-all duration-150 no-scrollbar"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1.5px solid rgba(255,255,255,0.10)",
                  color: "rgba(248,250,252,0.92)",
                  maxHeight: "96px",
                  lineHeight: "1.5",
                  fontFamily: "var(--font-body)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,87,51,0.5)";
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(255,87,51,0.12)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={streaming || !input.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 disabled:opacity-40 hover:scale-105 active:scale-95 flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, #FF5733 0%, #FF824D 100%)",
                  color: "white",
                  cursor: streaming || !input.trim() ? "not-allowed" : "pointer",
                }}
                aria-label="Send message"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AISupportAssistant;
