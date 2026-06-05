import { Link } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  BrainCircuit,
  User,
  PhoneCall,
  MoreHorizontal,
  Send,
  Trash2,
  PencilLine,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Mic,
  MicOff,
  Volume2,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Crown,
  Plus,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { useTheme } from "../context/ThemeContext";
import { usePlan } from "../context/PlanContext";
import { chatAPI } from "../lib/api";
import ReactMarkdown from "react-markdown";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProfileUpdateCard({ update, isDarkMode, onAccept, onReject, loading }) {
  return (
    <div className={`mt-3 rounded-xl border-2 p-4 ${
      isDarkMode ? "bg-amber-500/10 border-amber-500/30" : "bg-amber-50 border-amber-300"
    }`}>
      <p className={`text-sm font-semibold mb-1 ${isDarkMode ? "text-amber-300" : "text-amber-800"}`}>
        Profile update detected
      </p>
      <p className={`text-xs mb-3 ${isDarkMode ? "text-amber-200/70" : "text-amber-700"}`}>
        You mentioned your <strong>{update.label}</strong> is{" "}
        <strong>{update.new_value}</strong>, but your profile shows{" "}
        <strong>{update.current_value || "not set"}</strong>. Update your profile?
      </p>
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <Check className="w-3 h-3" /> Yes, update
        </button>
        <button
          onClick={onReject}
          disabled={loading}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
            isDarkMode
              ? "bg-slate-700 text-slate-200 hover:bg-slate-600"
              : "bg-slate-200 text-slate-700 hover:bg-slate-300"
          } disabled:opacity-50`}
        >
          <X className="w-3 h-3" /> No, keep profile
        </button>
      </div>
    </div>
  );
}

const SUGGESTION_PROMPTS = [
  "Why did my vision score drop?",
  "What helps with dry eyes?",
  "Explain the 20-20-20 rule",
  "How often should I get an eye exam?",
];

const markdownComponents = (isDarkMode, isUser) => ({
  p: ({ children }) => (
    <p className={`text-sm leading-relaxed whitespace-pre-wrap mb-2 last:mb-0 ${isUser ? "" : isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
      {children}
    </p>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1 text-sm">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-sm">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  code: ({ children }) => (
    <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${isDarkMode ? "bg-slate-800 text-cyan-300" : "bg-slate-100 text-slate-800"}`}>
      {children}
    </code>
  ),
});

function ChatBubble({ msg, isDarkMode, updateDone, onAccept, onReject, updateLoading }) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex gap-2.5 sm:gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md"
            : isDarkMode
              ? "bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-md"
              : "bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md"
        }`}
      >
        {isUser ? <User className="w-4 h-4 sm:w-5 sm:h-5" /> : <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />}
      </div>

      <div className={`flex flex-col min-w-0 max-w-[88%] sm:max-w-[82%] md:max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 shadow-sm border transition-all ${
            isUser
              ? isDarkMode
                ? "bg-blue-600/90 border-blue-500/40 text-white rounded-tr-md"
                : "bg-blue-600 border-blue-500 text-white rounded-tr-md"
              : isDarkMode
                ? "bg-slate-800/90 border-slate-700/80 text-slate-100 rounded-tl-md"
                : "bg-white border-slate-200 text-slate-800 rounded-tl-md shadow-md"
          }`}
        >
          <ReactMarkdown components={markdownComponents(isDarkMode, isUser)}>
            {msg.content}
          </ReactMarkdown>
          {msg.created_at && (
            <p className={`text-[10px] mt-2 ${isUser ? "text-blue-100/70 text-right" : isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
              {formatTime(msg.created_at)}
            </p>
          )}
        </div>

        {!isUser && msg.profileUpdate && !updateDone && (
          <ProfileUpdateCard
            update={msg.profileUpdate}
            isDarkMode={isDarkMode}
            onAccept={onAccept}
            onReject={onReject}
            loading={updateLoading}
          />
        )}
        {updateDone === "accepted" && (
          <p className="text-xs text-emerald-500 mt-1.5 px-1">Profile updated.</p>
        )}
        {updateDone === "rejected" && (
          <p className={`text-xs mt-1.5 px-1 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>Kept unchanged.</p>
        )}
        {updateDone === "error" && (
          <p className="text-xs text-red-500 mt-1.5 px-1">Update failed. Try from Settings.</p>
        )}
      </div>
    </div>
  );
}

function TypingIndicator({ isDarkMode }) {
  return (
    <div className="flex gap-2.5 sm:gap-3">
      <div className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full ${
        isDarkMode ? "bg-gradient-to-br from-cyan-600 to-blue-700" : "bg-gradient-to-br from-cyan-500 to-blue-600"
      } text-white shadow-md`}>
        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <div className={`rounded-2xl rounded-tl-md px-4 py-3.5 border ${
        isDarkMode ? "bg-slate-800/90 border-slate-700/80" : "bg-white border-slate-200 shadow-sm"
      }`}>
        <div className="flex items-center gap-1.5">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className={`h-2 w-2 rounded-full animate-bounce ${isDarkMode ? "bg-cyan-400" : "bg-cyan-500"}`}
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
          <span className={`text-xs ml-2 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Thinking…</span>
        </div>
      </div>
    </div>
  );
}

function EmptyChatState({ isDarkMode, onNewChat, onSuggestion }) {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg text-center">
        <div className={`mx-auto mb-5 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl sm:rounded-3xl shadow-xl ${
          isDarkMode ? "bg-gradient-to-br from-cyan-600 to-blue-700" : "bg-gradient-to-br from-cyan-500 to-blue-600"
        } text-white`}>
          <BrainCircuit className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>
        <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          AI Vision Consultant
        </h2>
        <p className={`text-sm leading-6 mb-6 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
          Personalized guidance from your profile, test history, and eye wellness knowledge base.
        </p>
        <button
          onClick={onNewChat}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-5 py-3 text-sm font-semibold hover:from-cyan-500 hover:to-blue-500 shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          New conversation
        </button>
        <div className="mt-8 text-left">
          <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
            Try asking
          </p>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            {SUGGESTION_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onSuggestion(prompt)}
                className={`text-left text-xs sm:text-sm px-3 py-2 rounded-xl border transition-all hover:scale-[1.02] ${
                  isDarkMode
                    ? "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-cyan-500/50 hover:bg-slate-800"
                    : "border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:bg-cyan-50"
                }`}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AIConsultPage() {
  const { isDarkMode } = useTheme();
  const { plan, activePlanId } = usePlan();
  const MAX_MESSAGES = plan.maxMessages;

  // Sidebar open/closed — default open on desktop, closed on mobile/tablet
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1024
  );

  // Auto-close sidebar when resizing to small screen; auto-open on large
  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Conversations list
  const [conversations, setConversations] = useState([]);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [convLoading, setConvLoading] = useState(true);

  // Current chat messages (local display copy)
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);

  // Input
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  // Sidebar search
  const [searchQuery, setSearchQuery] = useState("");

  // Sidebar rename/menu state
  const [editingConvId, setEditingConvId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [menuOpenId, setMenuOpenId] = useState(null);

  // Live-call modal (unchanged)
  const [isCalling, setIsCalling] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);

  // Error banner
  const [error, setError] = useState(null);

  // Profile update decisions: msgId -> "accepted" | "rejected" | "error"
  // Persisted in localStorage so decisions survive page reloads
  const [profileDecisions, setProfileDecisions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("visuar_profile_decisions") || "{}");
    } catch {
      return {};
    }
  });
  const [profileUpdateLoading, setProfileUpdateLoading] = useState(null); // msgId being updated

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const voiceTriggeredRef = useRef(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ── Load conversations on mount ─────────────────────────────────────────────
  useEffect(() => {
    loadConversations();
  }, []);

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 1024) { setSidebarOpen(false); setSearchQuery(""); }
  };

  const loadConversations = async () => {
    setConvLoading(true);
    try {
      const data = await chatAPI.listConversations();
      setConversations(data);
      if (data.length > 0 && !selectedConvId) {
        selectConversation(data[0].id, data[0].message_count);
      }
    } catch (e) {
      setError("Could not load conversations. Is the backend running?");
    } finally {
      setConvLoading(false);
    }
  };

  // ── Load messages when selected conversation changes ───────────────────────
  const selectConversation = useCallback(async (convId, messageCount) => {
    setSelectedConvId(convId);
    setMessages([]);
    setLimitReached(messageCount >= MAX_MESSAGES);
    setMsgLoading(true);
    setError(null);
    try {
      const msgs = await chatAPI.listMessages(convId);
      setMessages(msgs.map(normalizeMessage));
    } catch {
      setError("Could not load messages.");
    } finally {
      setMsgLoading(false);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ── Normalize message from API ─────────────────────────────────────────────
  function normalizeMessage(m) {
    let profileUpdate = null;
    if (m.extra_data) {
      try {
        const meta = typeof m.extra_data === "string" ? JSON.parse(m.extra_data) : m.extra_data;
        profileUpdate = meta?.profile_update || null;
      } catch {}
    }
    return { ...m, profileUpdate };
  }

  // ── Create new conversation ────────────────────────────────────────────────
  const handleNewChat = async () => {
    try {
      const conv = await chatAPI.createConversation("New Chat");
      setConversations((prev) => [conv, ...prev]);
      setSelectedConvId(conv.id);
      setMessages([]);
      setLimitReached(false);
      setError(null);
      closeSidebarOnMobile();
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch {
      setError("Could not create a new conversation.");
    }
  };

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = async (e, textOverride) => {
    e?.preventDefault();
    const text = (textOverride ?? input).trim();
    if (!text || sending || !selectedConvId) return;

    // Optimistic user message
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
      profileUpdate: null,
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    if (!textOverride) setInput("");
    setSending(true);
    setError(null);

    try {
      const result = await chatAPI.sendMessage(selectedConvId, text);
      const assistantMsg = {
        id: result.message_id,
        role: "assistant",
        content: result.message,
        created_at: new Date().toISOString(),
        profileUpdate: result.profile_update || null,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (voiceTriggeredRef.current) {
        voiceTriggeredRef.current = false;
        speakText(result.message);
      }

      // Update conversation message count in sidebar
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConvId
            ? { ...c, message_count: (c.message_count || 0) + 1, title: c.title }
            : c
        )
      );

      // Refresh sidebar to pick up auto-generated title
      const updatedConvs = await chatAPI.listConversations();
      setConversations(updatedConvs);
      const current = updatedConvs.find((c) => c.id === selectedConvId);
      if (current && current.message_count >= MAX_MESSAGES) {
        setLimitReached(true);
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 429) {
        setLimitReached(true);
        setError(detail || `Max ${MAX_MESSAGES} messages reached. Start a new chat.`);
      } else {
        setError(detail || "Failed to send message. Please try again.");
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      }
    } finally {
      setSending(false);
    }
  };

  // ── Rename conversation ────────────────────────────────────────────────────
  const startRename = (conv) => {
    setEditingConvId(conv.id);
    setEditTitle(conv.title || "");
    setMenuOpenId(null);
  };

  const saveRename = async (convId) => {
    if (!editTitle.trim()) { setEditingConvId(null); return; }
    try {
      const updated = await chatAPI.renameConversation(convId, editTitle.trim());
      setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, title: updated.title } : c)));
    } catch {}
    setEditingConvId(null);
    setEditTitle("");
  };

  // ── Delete conversation ────────────────────────────────────────────────────
  const deleteConv = async (convId) => {
    if (!window.confirm("Delete this chat? This cannot be undone.")) return;
    try {
      await chatAPI.deleteConversation(convId);
      const remaining = conversations.filter((c) => c.id !== convId);
      setConversations(remaining);
      if (selectedConvId === convId) {
        if (remaining.length > 0) {
          selectConversation(remaining[0].id, remaining[0].message_count);
        } else {
          setSelectedConvId(null);
          setMessages([]);
        }
      }
    } catch {
      setError("Could not delete conversation.");
    }
    setMenuOpenId(null);
  };

  // ── Profile update accept / reject ────────────────────────────────────────
  const persistDecision = (id, decision) => {
    setProfileDecisions((prev) => {
      const next = { ...prev, [id]: decision };
      try { localStorage.setItem("visuar_profile_decisions", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const handleProfileAccept = async (msg) => {
    setProfileUpdateLoading(msg.id);
    try {
      await chatAPI.updateProfileField(msg.profileUpdate.field, msg.profileUpdate.new_value);
      persistDecision(msg.id, "accepted");
    } catch {
      persistDecision(msg.id, "error");
    } finally {
      setProfileUpdateLoading(null);
    }
  };

  const handleProfileReject = (msgId) => {
    persistDecision(msgId, "rejected");
  };

  // ── Voice: speak AI response ──────────────────────────────────────────────
  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const plain = text.replace(/[#*`_~[\]()]/g, "").replace(/\n+/g, " ").trim();
    const utterance = new SpeechSynthesisUtterance(plain);
    utterance.lang = "en-US";
    utterance.rate = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  // ── Voice: record → ElevenLabs STT → send ────────────────────────────────
  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    if (!selectedConvId || limitReached) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await transcribeAndSend(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      setError("Microphone access denied. Please allow microphone permissions.");
    }
  };

  const transcribeAndSend = async (audioBlob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");
      formData.append("model_id", "scribe_v2");

      const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
        method: "POST",
        headers: { "xi-api-key": import.meta.env.VITE_ELEVENLABS_API_KEY },
        body: formData,
      });

      if (!response.ok) throw new Error("Transcription failed");
      const data = await response.json();
      const transcript = data.text?.trim();

      if (transcript) {
        voiceTriggeredRef.current = true;
        setInput(transcript);
      } else {
        setError("Could not understand audio. Please try again.");
      }
    } catch {
      setError("Voice transcription failed. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const selectedConversation = conversations.find((c) => c.id === selectedConvId);
  const messageCount = selectedConversation?.message_count ?? messages.filter((m) => !String(m.id).startsWith("temp-")).length;

  const handleSuggestion = async (text) => {
    if (!selectedConvId) await handleNewChat();
    setInput(text);
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  // ── Live call (unchanged - coming soon) ───────────────────────────────────
  const handleCallClick = () => {
    setShowCallModal(true);
    setIsCalling(true);
    const comingSoonMsg = {
      id: `call-${Date.now()}`,
      role: "assistant",
      content: "This feature is coming soon. Live calling with AI is under development.",
      created_at: new Date().toISOString(),
      profileUpdate: null,
    };
    setMessages((prev) => [...prev, comingSoonMsg]);
    setTimeout(() => setIsCalling(false), 4000);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className={`h-[100dvh] relative overflow-hidden transition-colors duration-300 ${
        isDarkMode ? "bg-[#0a0e1a]" : "bg-[#f4f6f8]"
      }`}
    >
      <AnimatedBackground isDarkMode={isDarkMode} />

      {/* ── Live Call Modal (unchanged) ─────────────────────────────────── */}
      {showCallModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-sm bg-black/30">
          <div className={`rounded-3xl shadow-2xl p-8 max-w-sm mx-4 ${
            isDarkMode ? "bg-slate-900 border border-slate-700" : "bg-white border border-slate-200"
          }`}>
            <div className="flex flex-col items-center gap-6">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 animate-pulse">
                  <div className="w-full h-full rounded-full bg-emerald-500/20 border-2 border-emerald-500" />
                </div>
                <div className="absolute inset-2 animate-pulse" style={{ animationDelay: "0.3s" }}>
                  <div className="w-full h-full rounded-full bg-emerald-500/30 border-2 border-emerald-400" />
                </div>
                <div className="absolute inset-4 flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 shadow-lg">
                  <PhoneCall className="w-10 h-10 text-white animate-bounce" />
                </div>
              </div>
              <div className="text-center">
                <h3 className={`text-2xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  Calling AI Assistant...
                </h3>
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  {isCalling && "Connecting to AI consultant..."}
                </p>
              </div>
              <div className={`w-full p-4 rounded-2xl text-center border-2 ${
                isDarkMode ? "bg-emerald-500/10 border-emerald-500/30" : "bg-emerald-50 border-emerald-200"
              }`}>
                <p className={`font-semibold text-lg ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}>
                  Coming Soon!
                </p>
                <p className={`text-xs mt-2 ${isDarkMode ? "text-emerald-200/70" : "text-emerald-600"}`}>
                  Live AI consultant feature will be available soon.
                </p>
              </div>
              <button
                onClick={() => setShowCallModal(false)}
                className={`w-full rounded-xl py-2.5 font-semibold transition-all ${
                  isDarkMode ? "bg-slate-800 text-slate-200 hover:bg-slate-700" : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 flex h-full flex-col">
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <header className={`shrink-0 z-50 border-b backdrop-blur-xl ${
          isDarkMode ? "border-slate-800/80 bg-slate-950/90" : "border-slate-200/80 bg-white/90"
        }`}>
          <div className="flex items-center justify-between gap-2 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3">
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className={`lg:hidden flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                  isDarkMode ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
                aria-label="Open chats"
              >
                <Menu className="w-5 h-5" />
              </button>
              <button
                onClick={() => setSidebarOpen((o) => !o)}
                className={`hidden lg:flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                  isDarkMode ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
                aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              >
                {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
              </button>
              <Link
                to="/dashboard"
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                  isDarkMode ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>

            <div className="flex-1 min-w-0 text-center px-2">
              <h1 className={`text-sm sm:text-base font-bold truncate ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                {selectedConversation?.title || "AI Vision Consultant"}
              </h1>
              <p className={`text-[10px] sm:text-xs truncate ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                {selectedConvId
                  ? `${messageCount}/${MAX_MESSAGES} messages · ${plan.name}`
                  : "Context-aware eye wellness assistant"}
              </p>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <button
                onClick={handleNewChat}
                className={`hidden sm:flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                  isDarkMode ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
                title="New chat"
              >
                <Plus className="w-5 h-5" />
              </button>
              <Link
                to="/pricing"
                className={`hidden md:inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] sm:text-xs font-semibold border ${
                  isDarkMode
                    ? "border-slate-700 bg-slate-800 text-slate-300"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                <Crown className="w-3 h-3" />
                {plan.name}
              </Link>
              <button
                onClick={handleCallClick}
                disabled={isCalling}
                className={`flex h-9 items-center gap-1.5 rounded-full px-3 sm:px-4 text-xs sm:text-sm font-semibold text-white transition-all ${
                  isCalling
                    ? "bg-emerald-600 animate-pulse"
                    : "bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 shadow-md"
                }`}
              >
                <PhoneCall className={`w-4 h-4 ${isCalling ? "animate-bounce" : ""}`} />
                <span className="hidden sm:inline">{isCalling ? "Calling…" : "Call"}</span>
              </button>
            </div>
          </div>
        </header>

        {/* ── Body ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Mobile backdrop — tap outside to close */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-[52] lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* ── Sidebar ──────────────────────────────────────────────────── */}
          {/*
            Mobile  (< lg): fixed full-height drawer that slides in from the left.
            Desktop (>= lg): inline flex panel that collapses by shrinking to w-0.
          */}
          <aside
            className={[
              "flex flex-col border-r shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
              "fixed inset-y-0 left-0 z-[55] pt-[env(safe-area-inset-top)]",
              "lg:relative lg:inset-y-auto lg:left-auto lg:z-20 lg:pt-0",
              sidebarOpen
                ? "w-[min(85vw,18rem)] sm:w-72 translate-x-0"
                : "-translate-x-full w-[min(85vw,18rem)] sm:w-72 lg:translate-x-0 lg:w-0",
              isDarkMode
                ? "bg-slate-950/95 border-slate-800 backdrop-blur-xl"
                : "bg-white/95 border-slate-200 backdrop-blur-xl",
            ].join(" ")}
          >
            {/* Sidebar header row */}
            <div className={`px-3 sm:px-4 py-3 flex items-center justify-between border-b shrink-0 ${
              isDarkMode ? "border-slate-800" : "border-slate-200"
            }`}>
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>
                <MessageSquare className="w-4 h-4 text-cyan-500" />
                Conversations
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleNewChat}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold hover:from-cyan-500 hover:to-blue-500 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New
                </button>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className={`lg:hidden flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                    isDarkMode
                      ? "text-slate-400 hover:text-white hover:bg-slate-700"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                  aria-label="Close sidebar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search bar */}
            <div className={`px-3 py-2 border-b shrink-0 ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}>
              <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${
                isDarkMode ? "bg-slate-800 border border-slate-700" : "bg-slate-50 border border-slate-200"
              }`}>
                <Search className={`w-3.5 h-3.5 shrink-0 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats…"
                  className={`flex-1 bg-transparent text-xs outline-none ${
                    isDarkMode ? "text-slate-200 placeholder-slate-500" : "text-slate-700 placeholder-slate-400"
                  }`}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className={isDarkMode ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"}>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-1">
              {convLoading ? (
                <div className="flex items-center justify-center h-24">
                  <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                    No chats yet. Start a new conversation!
                  </p>
                </div>
              ) : (() => {
                const filtered = conversations.filter((c) =>
                  (c.title || "").toLowerCase().includes(searchQuery.toLowerCase())
                );
                if (filtered.length === 0) return (
                  <div className="px-4 py-6 text-center">
                    <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                      No chats match "{searchQuery}"
                    </p>
                  </div>
                );
                return filtered.map((c) => (
                  <div
                    key={c.id}
                    className={`group flex items-center justify-between w-full my-0.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                      selectedConvId === c.id
                        ? isDarkMode
                          ? "bg-cyan-500/15 border border-cyan-500/30"
                          : "bg-cyan-50 border border-cyan-200"
                        : isDarkMode
                          ? "hover:bg-slate-800/80 border border-transparent"
                          : "hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <div
                      onClick={() => { selectConversation(c.id, c.message_count); closeSidebarOnMobile(); }}
                      className="flex-1 text-left pr-2 min-w-0"
                    >
                      {editingConvId === c.id ? (
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveRename(c.id);
                            if (e.key === "Escape") setEditingConvId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={`w-full rounded px-2 py-1 text-sm border ${
                            isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300"
                          }`}
                          autoFocus
                        />
                      ) : (
                        <>
                          <div className={`font-medium truncate text-sm ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                            {c.title}
                          </div>
                          <div className={`text-xs truncate mt-0.5 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                            {c.message_count}/{MAX_MESSAGES} messages
                          </div>
                        </>
                      )}
                    </div>

                    <div className="relative flex-shrink-0">
                      {editingConvId === c.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => saveRename(c.id)} className="p-1 text-emerald-500 hover:text-emerald-600">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingConvId(null)} className="p-1 text-slate-400 hover:text-slate-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === c.id ? null : c.id); }}
                            className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700`}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {menuOpenId === c.id && (
                            <div className={`absolute right-0 mt-1 w-36 rounded shadow z-30 border ${
                              isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                            }`}>
                              <button
                                onClick={(e) => { e.stopPropagation(); startRename(c); }}
                                className={`flex items-center gap-2 w-full text-left px-3 py-2 text-sm ${
                                  isDarkMode ? "hover:bg-slate-700 text-slate-200" : "hover:bg-slate-50"
                                }`}
                              >
                                <PencilLine className="w-3.5 h-3.5" /> Rename
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteConv(c.id); }}
                                className={`flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-red-500 ${
                                  isDarkMode ? "hover:bg-slate-700" : "hover:bg-red-50"
                                }`}
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Plan badge at sidebar bottom */}
            <div className={`p-3 border-t shrink-0 ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}>
              <Link
                to="/pricing"
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
                  activePlanId === "free"
                    ? isDarkMode
                      ? "bg-gradient-to-r from-cyan-900/40 to-blue-900/40 border border-cyan-700/50 text-cyan-300 hover:border-cyan-500"
                      : "bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 text-cyan-700 hover:border-cyan-400"
                    : isDarkMode
                    ? "bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-500"
                    : "bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <Crown className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{plan.name} Plan · {plan.messagesLabel}</span>
                {activePlanId === "free" && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-600 text-white">
                    Upgrade
                  </span>
                )}
              </Link>
            </div>
          </aside>

          {/* ── Chat Column ──────────────────────────────────────────────── */}
          <main className="flex-1 flex flex-col min-w-0 min-h-0">
            {/* Messages */}
            <div
              className={`flex-1 overflow-y-auto overscroll-contain ${
                isDarkMode
                  ? "bg-gradient-to-b from-slate-950 to-[#0a0e1a]"
                  : "bg-gradient-to-b from-slate-50/80 to-white"
              }`}
              style={{ minHeight: 0 }}
              onClick={() => setMenuOpenId(null)}
            >
              <div className="mx-auto w-full max-w-3xl px-3 sm:px-4 md:px-6 py-4 sm:py-6 min-h-full">
                {!selectedConvId ? (
                  <EmptyChatState isDarkMode={isDarkMode} onNewChat={handleNewChat} onSuggestion={handleSuggestion} />
                ) : msgLoading ? (
                  <div className="flex h-full min-h-[40vh] items-center justify-center gap-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
                    <span className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Loading messages…</span>
                  </div>
                ) : messages.length === 0 ? (
                  <EmptyChatState isDarkMode={isDarkMode} onNewChat={handleNewChat} onSuggestion={handleSuggestion} />
                ) : (
                  <div className="space-y-4 sm:space-y-6 pb-2">
                    {messages.map((msg) => (
                      <ChatBubble
                        key={msg.id}
                        msg={msg}
                        isDarkMode={isDarkMode}
                        updateDone={profileDecisions[msg.id] ?? null}
                        updateLoading={profileUpdateLoading === msg.id}
                        onAccept={() => handleProfileAccept(msg)}
                        onReject={() => handleProfileReject(msg.id)}
                      />
                    ))}
                    {sending && <TypingIndicator isDarkMode={isDarkMode} />}
                    <div ref={messagesEndRef} className="h-1" />
                  </div>
                )}
              </div>
            </div>

            {/* ── Error Banner ────────────────────────────────────────── */}
            {error && (
              <div className={`px-4 py-2 flex items-center gap-2 text-sm border-t ${
                isDarkMode
                  ? "bg-red-500/10 border-red-500/30 text-red-300"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
                <button onClick={() => setError(null)} className="ml-auto">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ── Message Limit Banner ─────────────────────────────────── */}
            {limitReached && selectedConvId && (
              <div className={`px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-t text-sm ${
                activePlanId === "free"
                  ? isDarkMode
                    ? "bg-gradient-to-r from-cyan-900/40 to-blue-900/40 border-cyan-500/40 text-cyan-200"
                    : "bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-300 text-cyan-900"
                  : isDarkMode
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : "bg-amber-50 border-amber-300 text-amber-800"
              }`}>
                {activePlanId === "free" ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                      <span className="font-semibold">Free plan limit reached ({MAX_MESSAGES} messages).</span>
                      <span className={`text-xs ${isDarkMode ? "text-cyan-400/70" : "text-cyan-700/70"}`}>
                        Upgrade for up to 50 or unlimited messages.
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleNewChat}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                          isDarkMode ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                        }`}
                      >
                        + New Chat
                      </button>
                      <Link
                        to="/pricing"
                        className="rounded-lg px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 whitespace-nowrap flex items-center gap-1.5 shadow"
                      >
                        <Crown className="w-3 h-3" /> Upgrade Plan
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="font-medium">This chat has reached the {MAX_MESSAGES}-message limit.</span>
                    <button
                      onClick={handleNewChat}
                      className="rounded-lg px-3 py-1.5 text-xs font-bold bg-cyan-600 text-white hover:bg-cyan-700 whitespace-nowrap"
                    >
                      + New Chat
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── Input Area ──────────────────────────────────────────── */}
            <div className={`shrink-0 z-40 border-t backdrop-blur-xl pb-[env(safe-area-inset-bottom)] ${
              isDarkMode ? "border-slate-800/80 bg-slate-950/95" : "border-slate-200/80 bg-white/95"
            }`}>
              <div className="mx-auto max-w-3xl px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                {(isSpeaking || isTranscribing) && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {isSpeaking && (
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                        isDarkMode ? "bg-cyan-500/15 text-cyan-300" : "bg-cyan-50 text-cyan-700"
                      }`}>
                        <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                        Speaking…
                        <button type="button" onClick={stopSpeaking} className="underline opacity-80">Stop</button>
                      </div>
                    )}
                    {isTranscribing && (
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                        isDarkMode ? "bg-violet-500/15 text-violet-300" : "bg-violet-50 text-violet-700"
                      }`}>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Transcribing…
                      </div>
                    )}
                  </div>
                )}

                <form
                  onSubmit={handleSend}
                  className={`flex items-end gap-2 sm:gap-3 rounded-2xl border p-2 sm:p-2.5 shadow-lg ${
                    isDarkMode
                      ? "bg-slate-900/80 border-slate-700/80 shadow-black/20"
                      : "bg-white border-slate-200 shadow-slate-200/60"
                  }`}
                >
                  <button
                    type="button"
                    onClick={toggleRecording}
                    disabled={!selectedConvId || limitReached || sending || isTranscribing}
                    title={isRecording ? "Stop recording" : "Voice input"}
                    className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl transition-all disabled:opacity-40 flex-shrink-0 ${
                      isRecording
                        ? "bg-red-500 text-white animate-pulse ring-2 ring-red-400/50"
                        : isDarkMode
                          ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    }`}
                  >
                    {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      voiceTriggeredRef.current = false;
                      e.target.style.height = "auto";
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                    placeholder={
                      isRecording
                        ? "Recording… tap mic to stop"
                        : isTranscribing
                          ? "Transcribing…"
                          : !selectedConvId
                            ? "Start a new chat to begin"
                            : limitReached
                              ? "Message limit reached — start a new chat"
                              : "Message AI Vision Consultant…"
                    }
                    disabled={sending || !selectedConvId || limitReached || isRecording || isTranscribing}
                    rows={1}
                    className={`flex-1 bg-transparent text-sm outline-none resize-none min-h-[40px] max-h-32 py-2.5 px-1 leading-relaxed ${
                      isDarkMode
                        ? "text-white placeholder-slate-500"
                        : "text-slate-900 placeholder-slate-400"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  />

                  <button
                    type="submit"
                    disabled={sending || !input.trim() || !selectedConvId || limitReached}
                    className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl flex-shrink-0 bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {sending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </form>
                <p className={`hidden sm:block text-[10px] text-center mt-2 ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
                  Enter to send · Shift+Enter for new line · AI responses use your profile & test history
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
