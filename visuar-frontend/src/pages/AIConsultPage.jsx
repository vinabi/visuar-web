import { Link } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  BrainCircuit,
  User,
  Bot,
  PhoneCall,
  MoreHorizontal,
  Send,
  Zap,
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

function ChatBubble({ msg, isDarkMode, updateDone, onAccept, onReject, updateLoading }) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-start" : "justify-end"}`}>
      {isUser && (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg flex-shrink-0">
          <User className="w-5 h-5" />
        </div>
      )}

      <div className="max-w-[78%] flex flex-col">
        <div
          className={`px-5 py-4 rounded-2xl shadow-xl border transition-all ${
            isUser
              ? "bg-blue-100 border-blue-200 text-slate-900 shadow-blue-200/50"
              : "bg-cyan-700 text-white border-cyan-700 shadow-cyan-600/50"
          }`}
        >
          <ReactMarkdown
            components={{
              p: ({ node, children }) => (
                <p className="text-sm leading-7 font-medium whitespace-pre-wrap">{children}</p>
              ),
              strong: ({ node, children }) => (
                <strong>{children}</strong>
              ),
            }}
          >
            {msg.content}
          </ReactMarkdown>
          {msg.created_at && (
            <p className={`text-[10px] mt-1 text-right ${isUser ? "text-slate-400" : "text-cyan-200/60"}`}>
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
          <p className="text-xs text-emerald-500 mt-1.5">Profile updated.</p>
        )}
        {updateDone === "rejected" && (
          <p className={`text-xs mt-1.5 ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>Kept unchanged.</p>
        )}
        {updateDone === "error" && (
          <p className="text-xs text-red-500 mt-1.5">Update failed. Try from Settings.</p>
        )}
      </div>

      {!isUser && (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-700 text-white shadow-lg flex-shrink-0">
          <Bot className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}

function TypingIndicator({ isDarkMode }) {
  return (
    <div className="flex items-end gap-3 justify-end">
      <div className={`rounded-2xl px-4 py-3 ${
        isDarkMode
          ? "bg-slate-800 border-2 border-slate-700"
          : "bg-gradient-to-r from-cyan-100 to-cyan-200 border-2 border-cyan-300"
      }`}>
        <div className="flex gap-2">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="h-2 w-2 rounded-full bg-cyan-500 animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-700 text-white shadow-lg flex-shrink-0">
        <Bot className="w-5 h-5" />
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
      className={`min-h-screen relative transition-colors duration-300 ${
        isDarkMode ? "bg-[#07111f]" : "bg-gradient-to-br from-slate-50 via-cyan-50 to-white"
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

      <div className="relative z-10 flex h-screen flex-col">
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <header className={`sticky top-0 z-50 border-b backdrop-blur-xl ${
          isDarkMode ? "border-slate-700/50 bg-slate-950/80" : "border-white/30 bg-white/80"
        }`}>
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 md:px-8 py-4">
            <div className="flex items-center gap-2">
              {/* Mobile hamburger — opens drawer */}
              <button
                onClick={() => setSidebarOpen(true)}
                className={`lg:hidden flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
                  isDarkMode
                    ? "text-slate-400 hover:text-white hover:bg-slate-800/50"
                    : "text-slate-600 hover:text-cyan-600 hover:bg-white/50"
                }`}
                aria-label="Open chats"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Desktop sidebar toggle */}
              <button
                onClick={() => setSidebarOpen((o) => !o)}
                className={`hidden lg:flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
                  isDarkMode
                    ? "text-slate-400 hover:text-white hover:bg-slate-800/50"
                    : "text-slate-600 hover:text-cyan-600 hover:bg-white/50"
                }`}
                aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              >
                {sidebarOpen
                  ? <PanelLeftClose className="w-5 h-5" />
                  : <PanelLeftOpen  className="w-5 h-5" />}
              </button>

              <Link
                to="/dashboard"
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isDarkMode
                    ? "text-slate-400 hover:text-white hover:bg-slate-800/50"
                    : "text-slate-600 hover:text-cyan-600 hover:bg-white/50"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  AI Vision Consultant
                </h1>
                <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Powered by context-aware AI + RAG
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                isDarkMode
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "bg-cyan-500/10 text-cyan-700 border border-cyan-200"
              }`}>
                <Zap className="w-3 h-3" />
                Live
              </span>
              <Link
                to="/pricing"
                className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activePlanId === "free"
                    ? isDarkMode
                      ? "bg-slate-700/80 text-slate-300 border border-slate-600 hover:border-cyan-500"
                      : "bg-slate-100 text-slate-600 border border-slate-200 hover:border-cyan-400"
                    : isDarkMode
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "bg-cyan-50 text-cyan-700 border border-cyan-200"
                }`}
              >
                <Crown className="w-3 h-3" />
                {plan.name} Plan
              </Link>
              <button
                onClick={handleCallClick}
                disabled={isCalling}
                className={`flex items-center gap-2 rounded-full px-5 py-2.5 font-bold text-white shadow-xl transition-all ${
                  isCalling
                    ? "bg-cyan-700 cursor-not-allowed animate-pulse scale-105"
                    : "bg-cyan-600 hover:bg-cyan-700 ring-1 ring-cyan-200/20 hover:scale-105"
                }`}
              >
                <PhoneCall className={`w-5 h-5 ${isCalling ? "animate-bounce" : ""}`} />
                <span className="hidden sm:inline">{isCalling ? "Calling..." : "Call AI Now"}</span>
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
              // Mobile: fixed overlay drawer (below call modal z-[60])
              "fixed inset-y-0 left-0 z-[55]",
              // Desktop: static in the flex row, no z-fighting needed
              "lg:relative lg:inset-y-auto lg:left-auto lg:z-20",
              // Width + slide: mobile always w-72 but translated; desktop w-72 or w-0
              sidebarOpen
                ? "w-72 translate-x-0"
                : "-translate-x-full w-72 lg:translate-x-0 lg:w-0",
              isDarkMode
                ? "bg-slate-900 border-slate-700"
                : "bg-white border-slate-200",
            ].join(" ")}
          >
            {/* Sidebar header row */}
            <div className={`px-4 py-3 flex items-center justify-between border-b shrink-0 ${
              isDarkMode ? "border-slate-700" : "border-slate-200"
            }`}>
              <h3 className={`text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Chats</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleNewChat}
                  className="text-xs px-2 py-1 rounded-md bg-cyan-600 text-white hover:bg-cyan-700"
                >
                  + New
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

            <div className="flex-1 overflow-y-auto">
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
                    className={`flex items-center justify-between w-full px-4 py-3 border-b cursor-pointer transition-colors ${
                      isDarkMode
                        ? `border-slate-800 hover:bg-slate-800 ${selectedConvId === c.id ? "bg-slate-800" : ""}`
                        : `border-slate-100 hover:bg-slate-50 ${selectedConvId === c.id ? "bg-slate-100" : ""}`
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
          <main className="flex-1 flex flex-col min-w-0">
            {/* Messages */}
            <div
              className={`flex-1 overflow-y-auto p-4 md:p-8 ${isDarkMode ? "bg-slate-950" : "bg-white"}`}
              style={{ minHeight: 0 }}
              onClick={() => setMenuOpenId(null)}
            >
              {!selectedConvId ? (
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-md text-center">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-2xl">
                      <BrainCircuit className="w-10 h-10" />
                    </div>
                    <h2 className={`text-2xl font-bold mb-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                      Welcome to AI Consult
                    </h2>
                    <p className={`text-sm leading-6 mb-6 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                      Your personal eye wellness assistant, powered by RAG. Personalized to your profile and test history.
                    </p>
                    <button
                      onClick={handleNewChat}
                      className="rounded-xl bg-cyan-600 text-white px-6 py-3 font-semibold hover:bg-cyan-700 transition-all"
                    >
                      Start a new chat
                    </button>
                  </div>
                </div>
              ) : msgLoading ? (
                <div className="flex h-full items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-cyan-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-md text-center">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-2xl">
                      <BrainCircuit className="w-10 h-10" />
                    </div>
                    <h2 className={`text-2xl font-bold mb-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                      Ask me anything
                    </h2>
                    <p className={`text-sm leading-6 mb-4 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                      I'll answer based on your profile, test history, and a curated eye wellness knowledge base.
                    </p>
                    <div className={`rounded-2xl border-2 p-4 ${
                      isDarkMode ? "border-cyan-500/30 bg-cyan-500/10" : "border-cyan-200 bg-cyan-50/50"
                    }`}>
                      <p className={`text-xs leading-5 ${isDarkMode ? "text-cyan-300" : "text-cyan-700"}`}>
                        Try: "Why did my vision score drop?" · "What helps with dry eyes?" · "Explain the 20-20-20 rule"
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto w-full space-y-5">
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
                  <div ref={messagesEndRef} />
                </div>
              )}
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
            <div className={`sticky bottom-0 z-40 border-t backdrop-blur-xl ${
              isDarkMode ? "border-slate-700/50 bg-slate-900/95" : "border-slate-200/80 bg-white/95"
            }`}>
              <div className="mx-auto max-w-3xl px-4 md:px-8 py-5">
                {/* Speaking indicator */}
                {isSpeaking && (
                  <div className={`flex items-center gap-2 mb-3 px-3 py-1.5 rounded-xl text-xs font-medium w-fit ${
                    isDarkMode ? "bg-cyan-500/20 text-cyan-300" : "bg-cyan-50 text-cyan-700"
                  }`}>
                    <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                    Speaking response...
                    <button onClick={stopSpeaking} className="ml-1 underline opacity-70 hover:opacity-100">
                      Stop
                    </button>
                  </div>
                )}

                {/* Transcribing indicator */}
                {isTranscribing && (
                  <div className={`flex items-center gap-2 mb-3 px-3 py-1.5 rounded-xl text-xs font-medium w-fit ${
                    isDarkMode ? "bg-violet-500/20 text-violet-300" : "bg-violet-50 text-violet-700"
                  }`}>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Transcribing voice...
                  </div>
                )}

                <form onSubmit={handleSend} className="flex items-end gap-3">
                  {/* Mic button */}
                  <button
                    type="button"
                    onClick={toggleRecording}
                    disabled={!selectedConvId || limitReached || sending || isTranscribing}
                    title={isRecording ? "Stop recording" : "Record voice message"}
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl font-semibold shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ${
                      isRecording
                        ? "bg-red-500 text-white animate-pulse ring-4 ring-red-400/40"
                        : isDarkMode
                        ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => { setInput(e.target.value); voiceTriggeredRef.current = false; }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend(e);
                        }
                      }}
                      placeholder={
                        isRecording
                          ? "Recording... tap mic to stop"
                          : isTranscribing
                          ? "Transcribing..."
                          : !selectedConvId
                          ? "Start a new chat first..."
                          : limitReached
                          ? "Start a new chat to continue..."
                          : "Ask me about your vision health..."
                      }
                      disabled={sending || !selectedConvId || limitReached || isRecording || isTranscribing}
                      rows={1}
                      className={`w-full rounded-2xl border-2 px-4 py-3 text-sm outline-none transition-all resize-none min-h-[48px] max-h-[120px] font-medium ${
                        isDarkMode
                          ? "border-cyan-600 bg-slate-900 text-white placeholder-slate-400 focus:border-cyan-500"
                          : "border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:border-cyan-500"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    />
                    <div className={`absolute bottom-3 right-3 text-xs pointer-events-none ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                      ⏎ Send
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={sending || !input.trim() || !selectedConvId || limitReached}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl font-semibold shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 bg-cyan-600 text-white hover:bg-cyan-700"
                  >
                    {sending ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </form>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
