"use client";

import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { Send, Bot, MessageSquare, Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "../lib/api";

// Helper function to render simple markdown formatting in chat dialogs
const parseMarkdown = (text: string) => {
  if (!text) return "";

  // Split by code blocks first
  const parts = text.split(/(```[a-z]*\n[\s\S]*?\n```)/g);

  return parts.map((part, index) => {
    // Check if code block
    if (part.startsWith("```")) {
      const match = part.match(/```([a-z]*)\n([\s\S]*?)\n```/);
      const language = match ? match[1] : "";
      const code = match ? match[2] : part.slice(3, -3);

      return (
        <pre key={index} className="my-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[10.5px] font-mono text-emerald-400 overflow-x-auto leading-relaxed dark:bg-slate-950 dark:border-slate-850">
          {language && (
            <span className="block text-[8px] font-sans font-bold text-slate-500 uppercase tracking-widest mb-1 border-b border-slate-900 pb-0.5">
              {language}
            </span>
          )}
          <code>{code}</code>
        </pre>
      );
    }

    // Process inline elements line-by-line
    const lines = part.split("\n");
    return (
      <div key={index} className="space-y-1">
        {lines.map((line, lineIdx) => {
          let cleanLine = line;

          // Check if bullet point
          const isBullet = cleanLine.startsWith("- ") || cleanLine.startsWith("* ");
          if (isBullet) {
            cleanLine = cleanLine.slice(2);
          }

          // Regex to parse **bold** and `code`
          const inlineRegex = /(\*\*.*?\*\*|`.*?`)/g;
          const tokens = cleanLine.split(inlineRegex);

          const parsedElements = tokens.map((token, tokenIdx) => {
            if (token.startsWith("**") && token.endsWith("**")) {
              return <strong key={tokenIdx} className="font-extrabold">{token.slice(2, -2)}</strong>;
            }
            if (token.startsWith("`") && token.endsWith("`")) {
              return <code key={tokenIdx} className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[10px] text-pink-650 dark:text-pink-400">{token.slice(1, -1)}</code>;
            }
            return token;
          });

          if (isBullet) {
            return (
              <ul key={lineIdx} className="list-disc pl-4 space-y-0.5 text-xs">
                <li>{parsedElements}</li>
              </ul>
            );
          }

          // Render empty lines as linebreaks
          if (line.trim() === "") {
            return <div key={lineIdx} className="h-1.5" />;
          }

          return <p key={lineIdx} className="leading-relaxed">{parsedElements}</p>;
        })}
      </div>
    );
  });
};

export default function AiChatPage() {
  const [profile, setProfile] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ sender: "user" | "ai"; text: string; time?: string }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Load profile and conversations list
  useEffect(() => {
    async function loadData() {
      try {
        const [profileRes, convRes] = await Promise.all([
          api.get("/api/user/profile").catch(() => null),
          api.get("/api/chat/conversations").catch(() => ({ data: [] }))
        ]);

        if (profileRes) setProfile(profileRes.data);
        const convList = convRes.data || [];
        setConversations(convList);

        if (convList.length > 0) {
          setActiveConvId(convList[0].id);
        } else {
          // Auto create a default conversation if none exist
          const newConvRes = await api.post("/api/chat/conversations", {
            title: "Tanya Jawab AIphy",
          });
          setConversations([newConvRes.data]);
          setActiveConvId(newConvRes.data.id);
        }
      } catch (err) {
        console.error("Gagal memuat percakapan:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Fetch history when active conversation changes
  useEffect(() => {
    if (!activeConvId) return;

    async function loadHistory() {
      try {
        const res = await api.get(`/api/chat/history/${activeConvId}`);
        const history = res.data || [];
        setMessages(
          history.map((m: any) => ({
            sender: m.role === "user" ? "user" : "ai",
            text: m.content,
            time: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }))
        );
      } catch (err) {
        console.error("Gagal memuat riwayat:", err);
      }
    }
    loadHistory();
  }, [activeConvId]);

  // Create new chat session
  const handleNewChat = async () => {
    try {
      const newTitle = prompt("Masukkan judul percakapan baru:", `Obrolan #${conversations.length + 1}`);
      if (!newTitle) return;

      const res = await api.post("/api/chat/conversations", { title: newTitle });
      setConversations((prev) => [res.data, ...prev]);
      setActiveConvId(res.data.id);
    } catch (err) {
      alert("Gagal membuat percakapan baru.");
    }
  };

  // Delete chat session
  const handleDeleteChat = async (convId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus sesi obrolan ini beserta seluruh riwayat pesannya?")) return;

    try {
      await api.delete(`/api/chat/conversations/${convId}`);
      const remaining = conversations.filter((c) => c.id !== convId);

      if (remaining.length === 0) {
        const newConvRes = await api.post("/api/chat/conversations", {
          title: "Tanya Jawab AIphy",
        });
        setConversations([newConvRes.data]);
        setActiveConvId(newConvRes.data.id);
      } else {
        setConversations(remaining);
        if (activeConvId === convId) {
          setActiveConvId(remaining[0].id);
        }
      }
    } catch (err: any) {
      alert("Gagal menghapus sesi obrolan: " + err.message);
    }
  };

  // Streaming Send Message
  const handleSend = async () => {
    if (!input.trim() || !activeConvId || sending) return;
    const userMsgText = input;
    setInput("");

    // Add user message locally
    const userMsg = {
      sender: "user" as const,
      text: userMsgText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Add AI answer placeholder
    const aiPlaceholderIndex = messages.length + 1;
    const aiMsgPlaceholder = {
      sender: "ai" as const,
      text: "",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, aiMsgPlaceholder]);

    let accumulated = "";
    setSending(true);

    await api.stream(
      "/api/chat/message",
      { conversationId: activeConvId, message: userMsgText },
      (chunk) => {
        accumulated += chunk;
        setMessages((prev) =>
          prev.map((m, idx) => (idx === prev.length - 1 ? { ...m, text: accumulated } : m))
        );
      },
      () => {
        setSending(false);
      },
      (err) => {
        console.error("Streaming error:", err);
        setMessages((prev) =>
          prev.map((m, idx) =>
            idx === prev.length - 1
              ? { ...m, text: `Gagal mendapatkan respon: ${err.message || "Batas harian token terlampaui."}` }
              : m
          )
        );
        setSending(false);
      }
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-955">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto dark:border-indigo-400"></div>
          <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Memuat AIphy Tutor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pl-20 dark:bg-slate-955">
      <Sidebar />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Header userName={profile?.name || "Learner"} userTitle="Tanyakan apa saja seputar AI kepada tutor virtual adaptif Anda." />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 h-[600px] overflow-hidden">
          
          {/* Left panel: Conversations List */}
          <div className="md:col-span-1 border-r border-slate-100 dark:border-slate-800 flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/20">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <button
                onClick={handleNewChat}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 transition shadow-md shadow-indigo-600/10"
              >
                <Plus className="h-4 w-4" /> Baru
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
                    activeConvId === conv.id
                      ? "bg-white text-indigo-600 dark:bg-slate-900 dark:text-indigo-400 shadow-sm"
                      : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <button
                    onClick={() => setActiveConvId(conv.id)}
                    className="flex items-center gap-2 text-xs font-bold truncate flex-1 text-left cursor-pointer"
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span className="truncate">{conv.title}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChat(conv.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 rounded transition shrink-0 ml-1 cursor-pointer dark:hover:bg-rose-950/20"
                    title="Hapus Obrolan"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: Active Chat logs */}
          <div className="md:col-span-3 flex flex-col h-full bg-white dark:bg-slate-900">
            {/* Active Session Header */}
            <div className="flex items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/20">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400">
                <Bot className="h-5.5 w-5.5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  AIphy Tutor <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">Online</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Adaptif, Responsif & Penyederhana Konsep Sulit</p>
              </div>
            </div>

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 max-w-[85%] ${
                    msg.sender === "user" ? "ml-auto flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl text-xs font-bold ${
                      msg.sender === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {msg.sender === "user" ? "U" : "AI"}
                  </div>
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm whitespace-pre-wrap ${
                      msg.sender === "user"
                        ? "bg-indigo-600 text-white rounded-tr-none"
                        : "bg-slate-50 text-slate-800 dark:bg-slate-800/40 dark:text-slate-200 rounded-tl-none border border-slate-100/50 dark:border-slate-800/50"
                    }`}
                  >
                    {msg.text ? parseMarkdown(msg.text) : (sending && idx === messages.length - 1 && <span className="animate-pulse">AIphy sedang memikirkan jawaban...</span>)}
                  </div>
                </div>
              ))}
            </div>

            {/* Input Box */}
            <div className="border-t border-slate-100 p-4 dark:border-slate-800">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Tanyakan tentang neural network, regresi, atau silabus belajar..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-14 text-xs text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-500 font-bold"
                />
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-sm disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
