// components/AIAssistant.tsx
// One unified AI assistant — replaces the old two separate surfaces
// (a text-only "Support Agent" floating widget, and a full-page voice/vision
// "AI Shopping Assistant" route). There's now a single engine and a single
// shared conversation with three view states:
//   closed   → a glass launcher bubble, bottom-right, on every page
//   compact  → a small glass chat panel (same full capability set: text,
//              voice input, camera vision, spoken replies)
//   expanded → an immersive fullscreen glass surface, morphed from the
//              compact panel via a shared-layout animation (no page nav,
//              no lost context — same conversation, same session).
// Mounted once, globally (see App.tsx), so it survives route changes.
// Nav entry points (desktop navbar link, mobile "AI Shop" tab) open it
// straight into "expanded" by dispatching a "forkful:open-ai" event —
// exactly the same event-dispatch pattern the app already uses for the
// command palette (Ctrl/Cmd+K), so no new global state plumbing is needed.

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  BiCamera,
  BiMicrophone,
  BiSend,
  BiVolumeFull,
  BiVolumeMute,
  BiX,
  BiRefresh,
  BiExpandAlt,
  BiCollapseAlt,
} from "react-icons/bi";
import { restaurantService } from "../main";
import { useAppData } from "../context/AppContext";

interface VisionMatch {
  item: { _id: string; name: string; description?: string; price: number; image?: string };
  restaurant: { id: string; name: string };
  reason: string;
}

type ChatMessage =
  | { id: string; role: "user"; kind: "text"; content: string }
  | { id: string; role: "user"; kind: "image"; imageUrl: string }
  | { id: string; role: "assistant"; kind: "text"; content: string }
  | { id: string; role: "assistant"; kind: "loading" }
  | {
      id: string;
      role: "assistant";
      kind: "vision";
      identified: { itemName: string; category: string; description: string } | null;
      matches: VisionMatch[];
      message?: string;
    };

type ViewState = "closed" | "compact" | "expanded";

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const SESSION_KEY = "forkful_ai_session";
const GREETING =
  "Hey! I'm your Forkful AI assistant. Ask about your orders, get dish recommendations, speak your request, or point your camera at food to find something similar nearby.";
const QUICK_CHIPS = ["Where's my order?", "Something spicy near me", "Refund policy"];

// Custom event other parts of the UI (navbar, mobile tab) dispatch to open
// this assistant without needing a shared context/provider.
export const OPEN_AI_ASSISTANT_EVENT = "forkful:open-ai";

const renderText = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>
  );
};

const AIAssistant = () => {
  const navigate = useNavigate();
  const { isAuth, user, setUser } = useAppData();

  const [viewState, setViewState] = useState<ViewState>("closed");
  const [pulseActive, setPulseActive] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const [sessionId, setSessionId] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const speechSupported =
    typeof window !== "undefined" && (!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition);

  const chatMode: "new" | "followup" = messages.length <= 1 ? "new" : "followup";

  useEffect(() => {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    setSessionId(sid);
    if (localStorage.getItem("forkful_ai_seen")) setPulseActive(false);
  }, []);

  // Listen for other UI (navbar link, mobile "AI Shop" tab) asking us to open.
  useEffect(() => {
    const onOpenRequest = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      openAssistant(detail.expanded ? "expanded" : "compact");
    };
    window.addEventListener(OPEN_AI_ASSISTANT_EVENT, onOpenRequest);
    return () => window.removeEventListener(OPEN_AI_ASSISTANT_EVENT, onOpenRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, viewState]);

  const openAssistant = (mode: "compact" | "expanded") => {
    setViewState(mode);
    setPulseActive(false);
    localStorage.setItem("forkful_ai_seen", "1");
    setMessages((prev) => (prev.length === 0 ? [{ id: uid(), role: "assistant", kind: "text", content: GREETING }] : prev));
  };

  const closeAssistant = () => {
    window.speechSynthesis?.cancel();
    if (recognitionRef.current) recognitionRef.current.stop();
    setViewState("closed");
  };

  const speak = useCallback(
    (text: string) => {
      if (!ttsEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text.replace(/[*#_`]/g, ""));
        utterance.rate = 1.02;
        window.speechSynthesis.speak(utterance);
      } catch {
        /* TTS is a nice-to-have; never block the UI on it. */
      }
    },
    [ttsEnabled]
  );

  const sendText = useCallback(
    async (text: string) => {
      if (!text.trim() || sending) return;
      setInput("");
      setSending(true);

      const userMsg: ChatMessage = { id: uid(), role: "user", kind: "text", content: text.trim() };
      const loadingMsg: ChatMessage = { id: uid(), role: "assistant", kind: "loading" };
      setMessages((prev) => [...prev, userMsg, loadingMsg]);

      try {
        let params: Record<string, any> = {};
        if (navigator.geolocation) {
          const coords: any = await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition((pos) => resolve(pos.coords), () => resolve(null), { timeout: 2000 });
          });
          if (coords) params = { latitude: coords.latitude, longitude: coords.longitude };
        }

        // Add dynamically suggested weather condition
        const hours = new Date().getHours();
        let currentSeasonWeather = "clear sky";
        if (hours >= 17 || hours <= 6) {
          currentSeasonWeather = "chilly evening breeze";
        } else if (hours >= 12 && hours <= 15) {
          currentSeasonWeather = "hot sunny afternoon";
        } else {
          currentSeasonWeather = "pleasant morning sun";
        }
        
        // Randomize weather selection to highlight RAG variability
        const weatherOptions = ["rainy evening", "chilly winter breeze", "heavy downpour", "clear warm sunny day", currentSeasonWeather];
        params.weather = weatherOptions[Math.floor(Math.random() * weatherOptions.length)];

        const { data } = await axios.post(
          `${restaurantService}/api/ai/chat`,
          { message: text.trim(), sessionId },
          { params, headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );

        const answer: string = data?.answer || "Sorry, I couldn't generate a response.";
        
        if (data?.profileUpdated && data?.userPreferences && user) {
          setUser({
            ...user,
            dietaryPreferences: data.userPreferences.dietaryPreferences,
            allergies: data.userPreferences.allergies,
            healthGoals: data.userPreferences.healthGoals,
          });
          toast.success("AI Profile updated via chat!");
        }

        setMessages((prev) =>
          prev.map((m) => (m.id === loadingMsg.id ? { id: loadingMsg.id, role: "assistant", kind: "text", content: answer } : m))
        );
        speak(answer);
      } catch (err) {
        console.error("[AI Assistant] chat failed:", err);
        const fallback = "Something went wrong reaching the assistant. Please try again.";
        setMessages((prev) =>
          prev.map((m) => (m.id === loadingMsg.id ? { id: loadingMsg.id, role: "assistant", kind: "text", content: fallback } : m))
        );
      } finally {
        setSending(false);
      }
    },
    [sending, sessionId, speak]
  );

  const sendImage = useCallback(
    async (file: File) => {
      if (sending) return;
      setSending(true);

      const imageUrl = URL.createObjectURL(file);
      const userMsg: ChatMessage = { id: uid(), role: "user", kind: "image", imageUrl };
      const loadingMsg: ChatMessage = { id: uid(), role: "assistant", kind: "loading" };
      setMessages((prev) => [...prev, userMsg, loadingMsg]);

      try {
        const form = new FormData();
        form.append("file", file);

        const { data } = await axios.post(`${restaurantService}/api/ai/vision`, form, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "multipart/form-data" },
        });

        const visionMsg: ChatMessage = {
          id: loadingMsg.id,
          role: "assistant",
          kind: "vision",
          identified: data?.identified || null,
          matches: data?.matches || [],
          message: data?.message,
        };
        setMessages((prev) => prev.map((m) => (m.id === loadingMsg.id ? visionMsg : m)));

        if (data?.identified?.itemName) speak(`I found ${data.identified.itemName}. Here are some similar options.`);
        else if (data?.message) speak(data.message);
      } catch (err) {
        console.error("[AI Assistant] vision failed:", err);
        const failMsg: ChatMessage = {
          id: loadingMsg.id,
          role: "assistant",
          kind: "text",
          content: "Couldn't analyze that photo. Please try again with a clearer shot.",
        };
        setMessages((prev) => prev.map((m) => (m.id === loadingMsg.id ? failMsg : m)));
      } finally {
        setSending(false);
      }
    },
    [sending, speak]
  );

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) sendImage(file);
    e.target.value = "";
  };

  const toggleListening = () => {
    if (!speechSupported) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) sendText(transcript);
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const startNewChat = () => {
    window.speechSynthesis?.cancel();
    const sid = `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_KEY, sid);
    setSessionId(sid);
    setMessages([{ id: uid(), role: "assistant", kind: "text", content: GREETING }]);
  };

  if (!isAuth) return null;

  return (
    <>
      {/* ── Launcher bubble ── */}
      <AnimatePresence>
        {viewState === "closed" && (
          <motion.button
            key="ai-launcher"
            type="button"
            onClick={() => openAssistant("compact")}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
            aria-label="Open AI assistant"
            className={`fixed bottom-24 right-4 md:bottom-6 md:right-6 z-[9990] w-14 h-14 rounded-full flex items-center justify-center ${
              pulseActive ? "fab-pulse" : ""
            }`}
            style={{
              background: "linear-gradient(135deg, #FF5733 0%, #FF824D 100%)",
              boxShadow: "0 12px 32px rgba(255,87,51,0.4), 0 0 0 1px rgba(255,255,255,0.12) inset",
            }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
          >
            <span className="text-2xl select-none">🍳</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Dim backdrop, expanded mode only ── */}
      <AnimatePresence>
        {viewState === "expanded" && (
          <motion.div
            key="ai-backdrop"
            className="fixed inset-0 z-[9991]"
            style={{ background: "rgba(6,6,10,0.6)", backdropFilter: "blur(2px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewState("compact")}
          />
        )}
      </AnimatePresence>

      {/* ── Panel: compact or expanded, morphs between the two via shared layoutId ── */}
      <AnimatePresence mode="popLayout">
        {viewState === "compact" && (
          <motion.div
            key="ai-panel-compact"
            layoutId="ai-panel"
            initial={{ opacity: 0, y: 40, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className="fixed bottom-24 right-4 left-4 md:left-auto md:bottom-6 md:right-6 z-[9992] md:w-[400px] rounded-[28px] overflow-hidden flex flex-col"
            style={{
              height: "min(600px, 72vh)",
              background: "var(--glass-bg)",
              backdropFilter: "var(--glass-blur)",
              WebkitBackdropFilter: "var(--glass-blur)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,87,51,0.08)",
            }}
          >
            <AssistantHeader
              chatMode={chatMode}
              ttsEnabled={ttsEnabled}
              onToggleTts={() =>
                setTtsEnabled((v) => {
                  if (v) window.speechSynthesis?.cancel();
                  return !v;
                })
              }
              onExpand={() => setViewState("expanded")}
              onClose={closeAssistant}
              onNewChat={startNewChat}
              showNewChat={messages.length > 1}
              expandLabel="Expand to full screen"
              expandIcon={<BiExpandAlt className="text-base" />}
            />
            <AssistantBody messages={messages} scrollRef={scrollRef} navigate={navigate} showChips={messages.length <= 1} onChip={sendText} user={user} />
            <AssistantInput
              input={input}
              setInput={setInput}
              sending={sending}
              listening={listening}
              speechSupported={speechSupported}
              fileInputRef={fileInputRef}
              onFilePick={handleFilePick}
              onToggleListening={toggleListening}
              onSend={sendText}
            />
          </motion.div>
        )}

        {viewState === "expanded" && (
          <motion.div
            key="ai-panel-expanded"
            layoutId="ai-panel"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="fixed inset-2 md:inset-10 lg:inset-x-[15%] lg:inset-y-[6%] z-[9992] rounded-[28px] overflow-hidden flex flex-col"
            style={{
              background: "var(--glass-bg)",
              backdropFilter: "var(--glass-blur)",
              WebkitBackdropFilter: "var(--glass-blur)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,87,51,0.1)",
            }}
          >
            <AssistantHeader
              chatMode={chatMode}
              ttsEnabled={ttsEnabled}
              onToggleTts={() =>
                setTtsEnabled((v) => {
                  if (v) window.speechSynthesis?.cancel();
                  return !v;
                })
              }
              onExpand={() => setViewState("compact")}
              onClose={closeAssistant}
              onNewChat={startNewChat}
              showNewChat={messages.length > 1}
              expandLabel="Minimize"
              expandIcon={<BiCollapseAlt className="text-base" />}
              expanded
            />
            <AssistantBody
              messages={messages}
              scrollRef={scrollRef}
              navigate={navigate}
              showChips={messages.length <= 1}
              onChip={sendText}
              roomy
              user={user}
            />
            <AssistantInput
              input={input}
              setInput={setInput}
              sending={sending}
              listening={listening}
              speechSupported={speechSupported}
              fileInputRef={fileInputRef}
              onFilePick={handleFilePick}
              onToggleListening={toggleListening}
              onSend={sendText}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ── Shared sub-components (used by both compact + expanded panels) ─────────

const AssistantHeader = ({
  chatMode,
  ttsEnabled,
  onToggleTts,
  onExpand,
  onClose,
  onNewChat,
  showNewChat,
  expandLabel,
  expandIcon,
}: {
  chatMode: "new" | "followup";
  ttsEnabled: boolean;
  onToggleTts: () => void;
  onExpand: () => void;
  onClose: () => void;
  onNewChat: () => void;
  showNewChat: boolean;
  expandLabel: string;
  expandIcon: React.ReactNode;
  expanded?: boolean;
}) => (
  <div
    className="flex items-center gap-3 px-4 md:px-5 py-3.5 flex-shrink-0"
    style={{
      background: "linear-gradient(135deg, rgba(255,87,51,0.16), rgba(255,130,77,0.06))",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
    }}
  >
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: "linear-gradient(135deg, #FF5733, #FF824D)" }}
    >
      <span className="text-base select-none">🍳</span>
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-bold truncate" style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}>
        Forkful AI Assistant
      </p>
      <p
        className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: "var(--color-manifest)", fontFamily: "var(--font-mono)" }}
      >
        {chatMode === "new" ? "New Chat" : "Follow Up"}
      </p>
    </div>

    {showNewChat && (
      <IconButton label="Start new chat" onClick={onNewChat}>
        <BiRefresh className="text-base" />
      </IconButton>
    )}
    <IconButton label={ttsEnabled ? "Disable spoken replies" : "Enable spoken replies"} onClick={onToggleTts} active={ttsEnabled}>
      {ttsEnabled ? <BiVolumeFull className="text-base" /> : <BiVolumeMute className="text-base" />}
    </IconButton>
    <IconButton label={expandLabel} onClick={onExpand}>
      {expandIcon}
    </IconButton>
    <IconButton label="Close assistant" onClick={onClose}>
      <BiX className="text-lg" />
    </IconButton>
  </div>
);

const IconButton = ({
  label,
  onClick,
  children,
  active = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
    style={{ color: active ? "#FF5733" : "var(--color-manifest)", background: active ? "rgba(255,87,51,0.14)" : "transparent" }}
  >
    {children}
  </button>
);

const AssistantBody = ({
  messages,
  scrollRef,
  navigate,
  showChips,
  onChip,
  roomy = false,
  user,
}: {
  messages: ChatMessage[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
  navigate: ReturnType<typeof useNavigate>;
  showChips: boolean;
  onChip: (text: string) => void;
  roomy?: boolean;
  user: any;
}) => (
  <div ref={scrollRef} className={`flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-3 ${roomy ? "md:px-10 md:py-6" : ""}`}>
    <div className={roomy ? "max-w-2xl mx-auto space-y-3" : "space-y-3"}>
      {((user?.dietaryPreferences && user.dietaryPreferences.length > 0) || 
        (user?.allergies && user.allergies.length > 0)) && (
        <div 
          className="flex gap-1.5 flex-wrap items-center p-2 rounded-xl mb-1 border select-none transition-all duration-200"
          style={{ 
            backgroundColor: "rgba(255,87,51,0.04)", 
            borderColor: "rgba(255,87,51,0.18)",
            boxShadow: "inset 0 0 8px rgba(255,87,51,0.02)"
          }}
        >
          <div className="flex items-center gap-1.5 mr-1 text-[8px] font-bold uppercase tracking-widest font-mono text-orange-500" style={{ color: "#FF824D" }}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
            </span>
            AI Filters
          </div>
          {user.dietaryPreferences?.map((pref: string) => (
            <span
              key={pref}
              className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide transition-all"
              style={{ 
                backgroundColor: "rgba(255,87,51,0.1)", 
                color: "#FF824D", 
                border: "1px solid rgba(255,87,51,0.15)" 
              }}
            >
              🌱 {pref}
            </span>
          ))}
          {user.allergies?.map((allergy: string) => (
            <span
              key={allergy}
              className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide transition-all"
              style={{ 
                backgroundColor: "rgba(239,68,68,0.06)", 
                color: "var(--color-alert)", 
                border: "1px solid rgba(239,68,68,0.15)" 
              }}
            >
              🚫 {allergy}
            </span>
          ))}
        </div>
      )}
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} navigate={navigate} />
      ))}
      {showChips && (
        <div className="flex gap-2 flex-wrap pt-1">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onChip(chip)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-transform hover:scale-105 active:scale-95"
              style={{ background: "rgba(255,87,51,0.12)", border: "1px solid rgba(255,87,51,0.25)", color: "#FF824D" }}
            >
              {chip}
            </button>
          ))}
        </div>
      )}
    </div>
  </div>
);

const AssistantInput = ({
  input,
  setInput,
  sending,
  listening,
  speechSupported,
  fileInputRef,
  onFilePick,
  onToggleListening,
  onSend,
}: {
  input: string;
  setInput: (v: string) => void;
  sending: boolean;
  listening: boolean;
  speechSupported: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFilePick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleListening: () => void;
  onSend: (text: string) => void;
}) => (
  <div
    className="flex-shrink-0 px-3 md:px-4 py-3"
    style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" }}
  >
    {listening && (
      <div className="flex items-center gap-2 px-2 pb-2 text-xs font-semibold" style={{ color: "#FF5733" }}>
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#FF5733" }} />
        Listening…
      </div>
    )}
    <div className="flex items-center gap-2 max-w-2xl mx-auto">
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFilePick} />
      <IconButton label="Scan a product with your camera" onClick={() => fileInputRef.current?.click()}>
        <BiCamera className="text-lg" />
      </IconButton>
      {speechSupported && (
        <button
          type="button"
          onClick={onToggleListening}
          aria-label={listening ? "Stop listening" : "Speak your request"}
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ background: listening ? "#FF5733" : "transparent", color: listening ? "#fff" : "var(--color-manifest)" }}
        >
          <BiMicrophone className="text-lg" />
        </button>
      )}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend(input);
          }
        }}
        placeholder="Ask, speak, or scan a dish…"
        disabled={sending}
        className="flex-1 min-w-0 h-10 px-4 rounded-full text-sm outline-none"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "var(--color-ink)",
          fontFamily: "var(--font-body)",
        }}
      />
      <button
        type="button"
        onClick={() => onSend(input)}
        disabled={!input.trim() || sending}
        aria-label="Send message"
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40 transition-transform hover:scale-105 active:scale-95"
        style={{ background: "linear-gradient(135deg, #FF5733, #FF824D)", color: "#fff" }}
      >
        <BiSend className="text-sm" />
      </button>
    </div>
  </div>
);

const MessageBubble = ({ message, navigate }: { message: ChatMessage; navigate: ReturnType<typeof useNavigate> }) => {
  const isUser = message.role === "user";

  if (message.kind === "loading") {
    return (
      <div className="flex justify-start">
        <div
          className="rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#FF824D" }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (message.kind === "image") {
    return (
      <div className="flex justify-end">
        <img src={message.imageUrl} alt="Scanned item" className="max-w-[60%] rounded-2xl rounded-br-sm object-cover" style={{ maxHeight: 200 }} />
      </div>
    );
  }

  if (message.kind === "vision") {
    return (
      <div className="flex justify-start">
        <div
          className="rounded-2xl rounded-bl-sm px-4 py-3 max-w-[92%] space-y-3"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {message.identified ? (
            <p className="text-sm" style={{ color: "var(--color-ink)" }}>
              That looks like <strong>{message.identified.itemName}</strong>
              {message.identified.category ? ` (${message.identified.category})` : ""}. Here's what's available near you:
            </p>
          ) : (
            <p className="text-sm" style={{ color: "var(--color-ink)" }}>
              {message.message}
            </p>
          )}
          {message.matches.length === 0 && message.identified && (
            <p className="text-xs" style={{ color: "var(--color-manifest)" }}>
              {message.message || "No close matches found right now."}
            </p>
          )}
          <div className="space-y-2">
            {message.matches.map((m) => (
              <button
                key={m.item._id}
                type="button"
                onClick={() => navigate(`/restaurant/${m.restaurant.id}`)}
                className="w-full flex items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-white/5"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                {m.item.image ? (
                  <img src={m.item.image} alt={m.item.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)" }} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate" style={{ color: "var(--color-ink)" }}>
                    {m.item.name}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: "var(--color-manifest)" }}>
                    {m.restaurant.name} · ₹{m.item.price}
                  </p>
                  <p className="text-[10px] mt-0.5 line-clamp-1" style={{ color: "#FF824D" }}>
                    {m.reason}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
        style={
          isUser
            ? { background: "linear-gradient(135deg, #FF5733, #FF824D)", color: "#fff", borderBottomRightRadius: "6px" }
            : {
                background: "rgba(255,255,255,0.06)",
                color: "var(--color-ink)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderBottomLeftRadius: "6px",
              }
        }
      >
        {isUser ? message.content : renderText(message.content)}
      </div>
    </div>
  );
};

export default AIAssistant;
