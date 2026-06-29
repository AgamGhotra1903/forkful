import { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";
import { useAppData } from "../context/AppContext";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

interface ChatMessage {
  senderId: string;
  senderName: string;
  role: string;
  message: string;
  timestamp: string;
}

interface ChatDrawerProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
}

const roleColor: Record<string, string> = {
  customer: "#3B82F6",
  rider: "#10B981",
  restaurant: "#F59E0B",
  admin: "#8B5CF6",
};

const roleLabel: Record<string, string> = {
  customer: "Customer",
  rider: "Rider",
  restaurant: "Restaurant",
  admin: "Support",
};

export const ChatDrawer = ({ orderId, isOpen, onClose }: ChatDrawerProps) => {
  const { socket } = useSocket();
  const { user } = useAppData();
  const shouldReduceMotion = useReducedMotion();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const cached = sessionStorage.getItem(`chat_history_${orderId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync state if orderId changes dynamically
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(`chat_history_${orderId}`);
      setMessages(cached ? JSON.parse(cached) : []);
    } catch {
      setMessages([]);
    }
  }, [orderId]);

  // Persist messages to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(`chat_history_${orderId}`, JSON.stringify(messages));
  }, [messages, orderId]);

  // Join the order chat room when drawer opens
  useEffect(() => {
    if (!socket || !isOpen || !orderId) return;
    socket.emit("chat:join_order", orderId);
    
    // Prevent duplicate listeners
    socket.off("chat:message");
    socket.on("chat:message", (msg: ChatMessage) => {
      setMessages((prev) => {
        // Prevent duplicate messages if any re-emits occur
        const exists = prev.some((m) => m.timestamp === msg.timestamp && m.message === msg.message && m.senderId === msg.senderId);
        if (exists) return prev;
        return [...prev, msg];
      });
    });
    return () => {
      socket.off("chat:message");
    };
  }, [socket, isOpen, orderId]);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 200);
  }, [isOpen]);

  const sendMessage = () => {
    if (!socket || !input.trim() || !user) return;
    socket.emit("chat:send", {
      orderId,
      message: input.trim(),
      role: user.role,
      senderName: user.name,
    });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 cursor-pointer"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={shouldReduceMotion ? { duration: 0.1 } : { type: "spring", stiffness: 300, damping: 30, delay: 0.05 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-full max-w-sm shadow-2xl glass-card"
            style={{
              background: "rgba(10,10,11,0.85)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              borderLeft: "1px solid var(--color-rule)",
            }}
            role="dialog"
            aria-label="Order chat"
            aria-modal="true"
          >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 h-14 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--color-rule)" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "var(--color-route)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>Order Chat</p>
              <p className="text-[10px] font-mono" style={{ color: "var(--color-ghost)" }}>
                #{orderId.slice(-6).toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
            style={{ backgroundColor: "var(--color-muted)", color: "var(--color-ink)" }}
            aria-label="Close chat"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Participant legend */}
        <div
          className="flex items-center gap-3 px-4 py-2 flex-shrink-0 flex-wrap"
          style={{ borderBottom: "1px solid var(--color-rule)", backgroundColor: "var(--color-receipt)" }}
        >
          {(["customer", "restaurant", "rider", "admin"] as const).map((r) => (
            <span key={r} className="flex items-center gap-1 text-[10px] font-bold">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: roleColor[r] }}
              />
              <span style={{ color: "var(--color-manifest)" }}>{roleLabel[r]}</span>
            </span>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: "var(--color-muted)" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-route)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p className="text-xs text-center" style={{ color: "var(--color-ghost)" }}>
                No messages yet.<br />Say hi to your rider or restaurant!
              </p>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isMe = msg.senderId === user?._id;
            const color = roleColor[msg.role] ?? "#6B7280";
            const time = new Date(msg.timestamp).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });

            return (
              <div
                key={idx}
                className={`flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}
              >
                {/* Sender label */}
                <span className="text-[10px] font-bold px-1" style={{ color }}>
                  {isMe ? "You" : `${msg.senderName} · ${roleLabel[msg.role] ?? msg.role}`}
                </span>
                {/* Bubble */}
                <div
                  className="max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-snug"
                  style={{
                    backgroundColor: isMe ? "var(--color-route)" : "var(--color-receipt)",
                    color: isMe ? "white" : "var(--color-ink)",
                    borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    border: isMe ? "none" : "1px solid var(--color-rule)",
                  }}
                >
                  {msg.message}
                </div>
                <span className="text-[9px] px-1" style={{ color: "var(--color-ghost)" }}>
                  {time}
                </span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          className="px-4 py-3 flex-shrink-0 flex items-center gap-2"
          style={{ borderTop: "1px solid var(--color-rule)" }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 h-10 px-4 rounded-xl text-sm outline-none"
            style={{
              backgroundColor: "var(--color-receipt)",
              border: "1px solid var(--color-rule)",
              color: "var(--color-ink)",
            }}
            aria-label="Chat message input"
            id="chat-message-input"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--color-route)", color: "white" }}
            aria-label="Send message"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
          </div>
        </motion.aside>
      </>
    )}
  </AnimatePresence>
  );
};

export default ChatDrawer;
