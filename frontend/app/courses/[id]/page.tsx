"use client";

import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { useState, useEffect, use, useRef, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { 
  ArrowLeft, Play, FileText, Code2, CheckCircle2, ChevronRight, HelpCircle, 
  Star, Users, Clock, BookOpen, Check, Award, Heart, MessageSquare,
  Bot, Send, Smile, Mic, Volume2, Copy, RotateCcw, ThumbsDown, Lock,
  Plus, Trash2, RotateCw, Timer, ChevronDown, ChevronUp, History
} from "lucide-react";
import { api } from "../../lib/api";

// CodeMirror lazy-loaded (SSR safe)
const CodeMirrorEditor = dynamic(() => import("@uiw/react-codemirror"), { ssr: false });
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";

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

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.id;

  // Global Page States
  const [course, setCourse] = useState<any>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Study Player Workspace Navigation
  const [activeTab, setActiveTab] = useState<"playlist" | "aichat">("playlist");
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [lessonContent, setLessonContent] = useState<any>(null);
  const [lessonLoading, setLessonLoading] = useState(false);

  // AI Chat states inside Course Player
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Python Code Sandbox cells
  const [codeCells, setCodeCells] = useState<any[]>([]);
  const [initialCode, setInitialCode] = useState<string>("");
  const [cellExecTimer, setCellExecTimer] = useState<Record<number, number>>({});
  const cellTimerRefs = useRef<Record<number, ReturnType<typeof setInterval>>>({});

  // Quiz evaluation states
  const [quizData, setQuizData] = useState<any>(null); // full quiz with timeLimitSeconds
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<any>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizActiveQuestionIdx, setQuizActiveQuestionIdx] = useState(0);
  const [quizTimeLeft, setQuizTimeLeft] = useState<number | null>(null);
  const [quizTimeLimitSeconds, setQuizTimeLimitSeconds] = useState<number>(0);
  const [quizTimerActive, setQuizTimerActive] = useState(false);
  const [quizPhase, setQuizPhase] = useState<"attempts" | "question" | "result">("question");
  const quizTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const [showAttempts, setShowAttempts] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);

  // Fake video player states (kept for future use)
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(20);

  // Cleanup quiz timer on unmount
  useEffect(() => {
    return () => {
      if (quizTimerRef.current) clearInterval(quizTimerRef.current);
      Object.values(cellTimerRefs.current).forEach(clearInterval);
    };
  }, []);

  // Load Course and User Session Details
  const loadCourseData = async () => {
    try {
      const [courseRes, enrolledRes, profileRes] = await Promise.all([
        api.get(`/api/courses/${courseId}`),
        api.get("/api/courses/enrolled").catch(() => ({ data: [] })),
        api.get("/api/user/profile").catch(() => null),
      ]);

      const courseData = courseRes.data;
      setCourse(courseData);

      const isEnr = enrolledRes.data.some((c: any) => c.id === courseId);
      setIsEnrolled(isEnr);

      if (profileRes) {
        setProfile(profileRes.data);
      }

      // If enrolled and modules exist, load the first lesson
      if (isEnr && courseData.modules && courseData.modules.length > 0) {
        const firstModule = courseData.modules[0];
        if (firstModule.lessons && firstModule.lessons.length > 0) {
          setActiveModuleIdx(0);
          setActiveLessonIdx(0);
          loadLessonContent(courseId, firstModule.lessons[0].id);
        }
      }
    } catch (err) {
      console.error("Gagal memuat materi kursus:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  // Load Specific Lesson Details
  const loadLessonContent = async (cId: string, lId: string) => {
    setLessonLoading(true);
    setQuizResult(null);
    setSelectedAnswers({});
    setQuizQuestions([]);
    setQuizTimeLeft(null);
    setQuizTimerActive(false);
    setQuizAttempts([]);
    setQuizPhase("attempts"); // show attempts screen first if any exist
    if (quizTimerRef.current) clearInterval(quizTimerRef.current);
    try {
      const res = await api.get(`/api/courses/${cId}/lessons/${lId}`);
      const lesson = res.data;
      setLessonContent(lesson);

      if (lesson.type === "coding") {
        const initialCode = lesson.contentBody || `# Tulis kode Python Anda di sini\nprint("Selamat datang di AIphy Sandbox!")`;
        setCodeCells([
          {
            id: 1,
            code: initialCode,
            initialCode,
            output: "",
            error: undefined,
            running: false,
            plots: [],
            executionTime: undefined,
            countdown: null,
          },
        ]);
      } else if (lesson.type === "quiz") {
        setQuizLoading(true);
        try {
          const [quizRes, attemptsRes] = await Promise.all([
            api.get(`/api/quiz/${lId}`),
            api.get(`/api/quiz/${lId}/attempts`).catch(() => ({ data: [] })),
          ]);
          const questions = quizRes.data.questions || [];
          setQuizQuestions(questions);
          setQuizTimeLimitSeconds(quizRes.data.timeLimitSeconds || 0);
          setQuizAttempts(attemptsRes.data || []);
          // If there are past attempts, show attempts screen; otherwise go straight to quiz
          if ((attemptsRes.data || []).length === 0) {
            setQuizPhase("question");
          }
        } catch (err) {
          console.error("Gagal memuat kuis:", err);
          setQuizQuestions([]);
        } finally {
          setQuizLoading(false);
        }
      }
    } catch (err) {
      console.error("Gagal memuat konten materi:", err);
    } finally {
      setLessonLoading(false);
    }
  };

  // Setup virtual AI Chat for this course
  useEffect(() => {
    if (activeTab === "aichat" && isEnrolled && course) {
      async function setupCourseChat() {
        try {
          const listRes = await api.get("/api/chat/conversations");
          let existingConv = listRes.data.find((c: any) => c.courseId === courseId);

          if (!existingConv) {
            const createRes = await api.post("/api/chat/conversations", {
              title: `Tutor AI: ${course.title}`,
              courseId,
            });
            existingConv = createRes.data;
          }

          setActiveConversationId(existingConv.id);
          const historyRes = await api.get(`/api/chat/history/${existingConv.id}`);
          setChatMessages(
            historyRes.data.map((m: any) => ({
              id: m.id,
              sender: m.role === "user" ? "user" : "ai",
              text: m.content,
              time: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            }))
          );
        } catch (err) {
          console.error("Gagal memuat Tutor AI:", err);
        }
      }
      setupCourseChat();
    }
  }, [activeTab, isEnrolled, courseId, course]);

  // Send message to Tutor AI using streaming SSE helper
  const handleSendChat = async () => {
    if (!chatInput.trim() || !activeConversationId || sendingChat) return;
    const userMsgText = chatInput;
    setChatInput("");

    // Add user message locally
    const userMsg = {
      id: Date.now(),
      sender: "user" as const,
      text: userMsgText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setChatMessages((prev) => [...prev, userMsg]);

    // Add AI response placeholder
    const aiMsgId = Date.now() + 1;
    const aiMsgPlaceholder = {
      id: aiMsgId,
      sender: "ai" as const,
      text: "",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setChatMessages((prev) => [...prev, aiMsgPlaceholder]);

    let accumulatedText = "";
    setSendingChat(true);

    await api.stream(
      "/api/chat/message",
      {
        conversationId: activeConversationId,
        message: userMsgText,
        lessonId: lessonContent?.id,
      },
      (chunk) => {
        accumulatedText += chunk;
        setChatMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, text: accumulatedText } : m))
        );
      },
      () => {
        setSendingChat(false);
      },
      (err) => {
        console.error("Streaming error:", err);
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? { ...m, text: `Gagal mendapatkan respon AI: ${err.message || "Batas pemakaian token tercapai."}` }
              : m
          )
        );
        setSendingChat(false);
      }
    );
  };

  // Run python code in sandbox API
  const handleRunCell = async (cellId: number) => {
    const targetCell = codeCells.find((c) => c.id === cellId);
    if (!targetCell) return;

    // Start countdown timer (max 15s)
    let countdownVal = 15;
    setCodeCells((prev) =>
      prev.map((c) => (c.id === cellId ? { ...c, running: true, output: "", error: undefined, plots: [], countdown: countdownVal, executionTime: undefined } : c))
    );

    const countdownInterval = setInterval(() => {
      countdownVal -= 1;
      setCodeCells((prev) =>
        prev.map((c) => (c.id === cellId ? { ...c, countdown: countdownVal > 0 ? countdownVal : 0 } : c))
      );
      if (countdownVal <= 0) clearInterval(countdownInterval);
    }, 1000);

    try {
      const res = await api.post("/api/code/run", { code: targetCell.code });
      const runResult = res.data;
      clearInterval(countdownInterval);
      setCodeCells((prev) =>
        prev.map((c) =>
          c.id === cellId
            ? {
                ...c,
                running: false,
                countdown: null,
                output: runResult.output || (runResult.error ? "" : "Program dieksekusi dengan sukses tanpa output konsol."),
                error: runResult.error,
                plots: runResult.plots || [],
                executionTime: runResult.executionTime,
              }
            : c
        )
      );
    } catch (err: any) {
      clearInterval(countdownInterval);
      console.error("Gagal eksekusi kode:", err);
      const isForbidden = err.statusCode === 403;
      setCodeCells((prev) =>
        prev.map((c) =>
          c.id === cellId
            ? {
                ...c,
                running: false,
                countdown: null,
                error: isForbidden
                  ? "Akses Ditolak: Fitur sandbox eksekusi Python hanya tersedia bagi pengguna Pro Learner. Silakan upgrade paket Anda."
                  : (err.message || "Gagal menghubungkan ke container sandbox."),
              }
            : c
        )
      );
    }
  };

  // Quiz submission & grading
  const handleQuizSubmit = async () => {
    if (quizQuestions.length === 0 || quizLoading) return;
    // Stop timer
    if (quizTimerRef.current) clearInterval(quizTimerRef.current);
    setQuizLoading(true);
    try {
      const answers: Record<string, string> = {};
      quizQuestions.forEach((q) => {
        answers[q.id] = selectedAnswers[q.id] || "";
      });

      const res = await api.post(`/api/quiz/${lessonContent.id}/submit`, { answers });
      setQuizResult(res.data);
      // Reload attempts after submit
      try {
        const attemptsRes = await api.get(`/api/quiz/${lessonContent.id}/attempts`);
        setQuizAttempts(attemptsRes.data || []);
      } catch {}
    } catch (err: any) {
      console.error("Gagal mengirim jawaban kuis:", err);
      setQuizResult({
        score: 0,
        passed: false,
        aiFeedback: `Gagal mengirim jawaban: ${err.message || "Periksa koneksi Anda dan coba lagi."}`,
        questions: [],
      });
    } finally {
      setQuizLoading(false);
    }
  };

  // Lesson mark complete action
  const handleMarkComplete = async () => {
    if (!lessonContent) return;
    try {
      await api.put(`/api/courses/${courseId}/lessons/${lessonContent.id}/complete`);
      alert("Materi pelajaran berhasil diselesaikan!");
      // Refresh course state
      loadCourseData();
    } catch (err: any) {
      alert("Gagal menyelesaikan pelajaran: " + (err.message || err));
    }
  };

  // Course Enrollment & Cart Checkout Trigger
  const handlePurchase = async () => {
    try {
      if (course.price === 0) {
        await api.post(`/api/courses/${courseId}/enroll`);
        alert("Pendaftaran kelas gratis berhasil!");
        setIsEnrolled(true);
        loadCourseData();
        return;
      }

      // Paid course flow: checkout via cart
      await api.post("/api/cart/add", { courseId });
      const checkoutRes = await api.post("/api/cart/checkout");
      const invoiceUrl = checkoutRes.data.invoiceUrl;
      if (invoiceUrl) {
        window.location.href = invoiceUrl;
      } else {
        alert("Gagal membuat tagihan pembayaran.");
      }
    } catch (err: any) {
      alert("Gagal memproses pendaftaran kelas: " + err.message);
    }
  };

  const handleAddToCart = async () => {
    try {
      await api.post("/api/cart/add", { courseId });
      alert("Kelas berhasil ditambahkan ke keranjang belanja!");
    } catch (err: any) {
      alert("Gagal menambahkan ke keranjang: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-955">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto dark:border-indigo-400"></div>
          <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Memuat Kelas...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] pl-20 dark:bg-slate-950 flex items-center justify-center text-xs font-bold text-slate-500">
        Kelas tidak ditemukan atau belum dipublikasi.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pl-20 dark:bg-slate-955 font-sans">
      <Sidebar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Link */}
        <div className="mb-4">
          <Link href="/all-courses" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Katalog
          </Link>
        </div>

        {isEnrolled ? (
          /* ========================================================================= */
          /* OWNED/ENROLLED VIEW: Figma Multi-View Study Player Workspace             */
          /* ========================================================================= */
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 mt-4">
            
            {/* 1. Left Sidebar Navigation inside Player (Playlist vs AI Chat) */}
            <div className="lg:col-span-4 xl:col-span-3 space-y-6">
              
              {/* Course Title and Global Progress */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950">
                    🎓
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{course.title}</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">{course.category} • {course.level}</p>
                  </div>
                </div>
              </div>

              {/* Tab Selector Buttons */}
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-850">
                <button
                  onClick={() => setActiveTab("playlist")}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                    activeTab === "playlist"
                      ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  Playlist
                </button>
                <button
                  onClick={() => setActiveTab("aichat")}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                    activeTab === "aichat"
                      ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                  }`}
                >
                  <Bot className="h-4 w-4" />
                  AI Chat
                </button>
              </div>

              {/* Tab Panel 1: Playlist view */}
              {activeTab === "playlist" && (
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4 max-h-[500px] overflow-y-auto">
                  {course.modules?.map((mod: any, mIdx: number) => (
                    <div key={mod.id} className={`border rounded-2xl p-3 ${
                      activeModuleIdx === mIdx 
                        ? "border-2 border-indigo-500/10 bg-indigo-50/15 dark:border-indigo-900/20 dark:bg-indigo-950/5"
                        : "border-slate-100 bg-slate-50/50 dark:border-slate-850 dark:bg-slate-950/20"
                    }`}>
                      <button
                        onClick={() => setActiveModuleIdx(mIdx)}
                        className="w-full flex items-center justify-between text-left text-xs font-bold text-slate-800 dark:text-slate-350"
                      >
                        <div>
                          <span className="line-clamp-1">{mod.title}</span>
                          <span className="block text-[9px] text-slate-400 font-semibold mt-0.5">
                            {mod.lessons?.length || 0} Materi
                          </span>
                        </div>
                      </button>

                      {/* Lesson Items inside active module */}
                      {activeModuleIdx === mIdx && mod.lessons && (
                        <div className="mt-4 space-y-2 pl-1.5 border-l-2 border-indigo-500/10">
                          {mod.lessons.map((lesson: any, lIdx: number) => (
                            <button
                              key={lesson.id}
                              onClick={() => {
                                setActiveLessonIdx(lIdx);
                                loadLessonContent(courseId, lesson.id);
                              }}
                              className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-[11px] font-bold transition-all ${
                                activeLessonIdx === lIdx
                                  ? "bg-indigo-600 text-white shadow-sm"
                                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
                              }`}
                            >
                              <span className="flex items-center gap-2 truncate">
                                <span>
                                  {lesson.type === "coding" ? "💻" : lesson.type === "quiz" ? "📝" : lesson.type === "text" ? "📄" : "📹"}
                                </span>
                                <span className="truncate">{lesson.title}</span>
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Tab Panel 2: AI Chat Panel */}
              {activeTab === "aichat" && (
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col h-[520px] justify-between">
                  {/* Messages logs */}
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className={`flex flex-col gap-1 max-w-[85%] ${msg.sender === "user" ? "ml-auto items-end" : "items-start"}`}>
                        <div className={`rounded-2xl px-3.5 py-2.5 text-xs leading-normal shadow-sm ${
                          msg.sender === "user"
                            ? "bg-indigo-600 text-white rounded-tr-none"
                            : "bg-slate-50 text-slate-850 border border-slate-100 dark:bg-slate-950/40 dark:text-slate-350 dark:border-slate-855 rounded-tl-none"
                        }`}>
                          {msg.text ? parseMarkdown(msg.text) : (sendingChat && <span className="animate-pulse">AIphy sedang mengetik...</span>)}
                          <span className="block text-[9px] text-slate-400 mt-1.5 text-right">{msg.time}</span>
                        </div>
                        {msg.sender === "ai" && msg.text && (
                          <div className="flex items-center gap-2 mt-1 pl-2 text-slate-400">
                            <button className="hover:text-indigo-500"><Volume2 className="h-3.5 w-3.5" /></button>
                            <button className="hover:text-indigo-500"><Copy className="h-3.5 w-3.5" /></button>
                            <button className="hover:text-indigo-500"><RotateCcw className="h-3.5 w-3.5" /></button>
                            <button className="hover:text-indigo-550"><ThumbsDown className="h-3.5 w-3.5" /></button>
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Message Input Panel */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-850">
                    <div className="relative">
                      <textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSendChat())}
                        placeholder="Tanya konsep AI kepada AIphy..."
                        rows={2}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-4 pr-12 text-[11px] text-slate-905 outline-none placeholder:text-slate-450 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      />
                      <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5">
                        <button
                          onClick={handleSendChat}
                          disabled={sendingChat}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition disabled:opacity-50 animate-pulse-slow"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Right Main Content Workspace (Video Player OR Coding Notebook OR Text Summary OR MCQ Quiz) */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-6">
              
              {/* Header Title Section */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {lessonContent?.title || "Memuat Materi..."}
                </h2>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                    onClick={handleMarkComplete}>
                    Selesai & Lanjut <Check className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {lessonLoading ? (
                <div className="py-24 text-center text-xs font-semibold text-slate-400">
                  Memuat detail materi...
                </div>
              ) : (
                <>
                  {/* VIEW: Video Lesson */}
                  {lessonContent?.type === "video" && (
                    <div className="space-y-6">
                      <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-slate-950 border border-slate-850 shadow-lg group">
                        <div className="absolute inset-0 flex items-center justify-center">
                          {lessonContent.mediaUrl ? (
                            <iframe
                              className="w-full h-full"
                              src={lessonContent.mediaUrl.replace("watch?v=", "embed/")}
                              title={lessonContent.title}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            ></iframe>
                          ) : (
                            <div className="text-xs text-slate-550 text-center font-bold">
                              Video url tidak valid atau kosong
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-xs text-slate-650 leading-relaxed dark:text-slate-350">
                        <h4 className="font-extrabold text-sm mb-3">Deskripsi Materi</h4>
                        <p>{lessonContent.contentBody || "Materi video pembelajaran mandiri untuk membantu Anda menguasai topik ini secara bertahap."}</p>
                      </div>
                    </div>
                  )}

                  {/* VIEW: Text/Documentation Lesson */}
                  {lessonContent?.type === "text" && (
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                      <div className="text-xs text-slate-650 leading-relaxed dark:text-slate-350 space-y-4 whitespace-pre-wrap">
                        {lessonContent.contentBody || "Materi bacaan teks."}
                      </div>
                    </div>
                  )}

                  {/* VIEW: Coding Notebook Panel */}
                  {lessonContent?.type === "coding" && (
                    <div className="space-y-4">
                      {/* Toolbar */}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50/40 rounded-2xl border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/40">
                        <div className="flex items-center gap-3 text-xs font-bold text-indigo-700 dark:text-indigo-400">
                          <Code2 className="h-4 w-4" />
                          <span>Python Sandbox</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500">⚡ Python 3 · {codeCells.length} sel</span>
                          <button
                            onClick={() => {
                              const newId = Date.now();
                              setCodeCells((prev) => [...prev, { id: newId, code: "# Sel baru\n", originalCode: "# Sel baru\n", output: "", error: undefined, running: false, plots: [], executionTime: null, timeoutCountdown: null }]);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-500 transition"
                          >
                            + Tambah Sel
                          </button>
                        </div>
                      </div>

                      {codeCells.map((cell, cellIdx) => (
                        <div key={cell.id} className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                          {/* Cell Header */}
                          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                            <span className="text-[10px] font-bold text-slate-400">In [{cellIdx + 1}]</span>
                            <div className="flex items-center gap-2">
                              {cell.executionTime != null && !cell.running && (
                                <span className="text-[10px] text-slate-400 font-mono">{cell.executionTime}ms</span>
                              )}
                              {cell.running && cell.countdown != null && (
                                <span className="text-[10px] text-amber-500 font-bold animate-pulse">
                                  ⏱ {cell.countdown}s
                                </span>
                              )}
                              <button
                                onClick={() => setCodeCells((prev) => prev.map((c) => c.id === cell.id ? { ...c, code: c.initialCode || c.originalCode || "" } : c))}
                                title="Reset ke kode awal"
                                className="text-[10px] px-2 py-0.5 rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition dark:border-slate-700"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </button>
                              {codeCells.length > 1 && (
                                <button
                                  onClick={() => setCodeCells((prev) => prev.filter((c) => c.id !== cell.id))}
                                  className="text-[10px] px-2 py-0.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-300 transition dark:border-slate-700"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>

                          {/* CodeMirror Editor */}
                          <div className="flex items-start gap-0">
                            <button
                              onClick={() => handleRunCell(cell.id)}
                              disabled={cell.running}
                              title="Jalankan sel (Shift+Enter)"
                              className="flex h-8 w-8 shrink-0 mt-2 ml-2 items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 transition dark:bg-slate-850 dark:hover:bg-indigo-950 text-[11px] disabled:opacity-50"
                            >
                              {cell.running ? <span className="animate-spin">⏳</span> : "▶"}
                            </button>
                            <div className="flex-1 min-w-0">
                              <CodeMirrorEditor
                                value={cell.code}
                                extensions={[python()]}
                                theme={oneDark}
                                onChange={(val) => setCodeCells((prev) => prev.map((c) => c.id === cell.id ? { ...c, code: val } : c))}
                                basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true }}
                                style={{ fontSize: 12 }}
                              />
                            </div>
                          </div>

                          {/* Output Section */}
                          {(cell.output || cell.error || (cell.plots && cell.plots.length > 0)) && (
                            <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-950 rounded-b-3xl p-4 space-y-3">
                              {cell.output && (
                                <pre className="font-mono text-[11px] text-emerald-400 whitespace-pre-wrap leading-relaxed">{cell.output}</pre>
                              )}
                              {cell.error && (
                                <pre className="font-mono text-[11px] text-red-400 whitespace-pre-wrap leading-relaxed">{cell.error}</pre>
                              )}
                              {cell.plots && cell.plots.map((plot: string, idx: number) => (
                                <div key={idx} className="flex justify-center pt-2">
                                  <div className="bg-white p-3 rounded-xl border border-slate-200 max-w-lg w-full">
                                    <img src={plot} alt={`Plot ${idx + 1}`} className="w-full h-auto object-contain rounded-lg" />
                                    <span className="block text-center text-[10px] font-bold text-slate-400 mt-2">Matplotlib Output</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* VIEW: Quiz Practice View */}
                  {lessonContent?.type === "quiz" && (
                    <div className="space-y-6">
                      {/* Quiz Attempt History */}
                      {quizAttempts.length > 0 && !quizResult && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                          <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-3">Riwayat Percobaan</h4>
                          <div className="space-y-2">
                            {quizAttempts.map((attempt: any, i: number) => (
                              <div key={attempt.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
                                <span className="text-slate-500 font-semibold">Percobaan #{quizAttempts.length - i}</span>
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-slate-700 dark:text-slate-300">{attempt.score}%</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${attempt.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                                    {attempt.passed ? "LULUS" : "TIDAK LULUS"}
                                  </span>
                                  <span className="text-slate-400">{new Date(attempt.completedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
                        {quizLoading ? (
                          <div className="py-12 text-center text-xs text-slate-400">Memuat soal kuis...</div>
                        ) : quizQuestions.length > 0 ? (
                          <>
                            {/* Quiz Header: Navigator + Timer */}
                            <div className="flex items-center justify-between pb-2 flex-wrap gap-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {quizQuestions.map((q: any, idx: number) => (
                                  <button
                                    key={idx}
                                    onClick={() => setQuizActiveQuestionIdx(idx)}
                                    className={`h-8 w-8 rounded-xl text-xs font-bold transition-all ${
                                      quizResult
                                        ? quizResult.questions?.[idx]?.isCorrect
                                          ? "bg-emerald-500 text-white"
                                          : "bg-red-400 text-white"
                                        : selectedAnswers[q.id]
                                        ? "bg-indigo-200 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
                                        : quizActiveQuestionIdx === idx
                                        ? "bg-indigo-600 text-white"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-850 dark:text-slate-400"
                                    }`}
                                  >
                                    {idx + 1}
                                  </button>
                                ))}
                              </div>
                              {/* Timer countdown */}
                              {quizTimeLeft !== null && !quizResult && (
                                <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl ${
                                  quizTimeLeft <= 30 ? "bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                }`}>
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>{Math.floor(quizTimeLeft / 60)}:{String(quizTimeLeft % 60).padStart(2, "0")}</span>
                                </div>
                              )}
                            </div>

                            {/* Question Area */}
                            <div className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800 space-y-4">
                              <div className="flex items-start justify-between gap-4">
                                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-relaxed flex-1">
                                  {quizQuestions[quizActiveQuestionIdx]?.text}
                                </h4>
                                <span className="text-[10px] font-bold text-slate-400 shrink-0">
                                  {quizActiveQuestionIdx + 1} / {quizQuestions.length}
                                </span>
                              </div>

                              <div className="space-y-3 pt-2">
                                {quizQuestions[quizActiveQuestionIdx]?.options.map((opt: string, oIdx: number) => {
                                  const qId = quizQuestions[quizActiveQuestionIdx].id;
                                  const isSelected = selectedAnswers[qId] === opt;
                                  const reviewData = quizResult?.questions?.find((rq: any) => rq.questionId === qId);
                                  const isReview = !!quizResult && !!reviewData;
                                  const isCorrectAnswer = isReview && reviewData.correctAnswer === opt;
                                  const isWrongSelected = isReview && isSelected && !reviewData.isCorrect;

                                  let optClass = "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800";
                                  if (isReview) {
                                    if (isCorrectAnswer) optClass = "border-emerald-500 bg-emerald-50/60 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-700";
                                    else if (isWrongSelected) optClass = "border-red-400 bg-red-50/60 text-red-700 dark:bg-red-950/20 dark:text-red-400 dark:border-red-700";
                                  } else if (isSelected) {
                                    optClass = "border-indigo-600 bg-indigo-50/50 text-indigo-800 dark:bg-indigo-950/20 dark:text-indigo-300";
                                  }

                                  return (
                                    <button
                                      key={oIdx}
                                      onClick={() => !quizResult && setSelectedAnswers({ ...selectedAnswers, [qId]: opt })}
                                      disabled={!!quizResult}
                                      className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-xs font-bold text-left transition-all disabled:cursor-default ${optClass}`}
                                    >
                                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                        isReview && isCorrectAnswer ? "border-emerald-500 bg-emerald-500" :
                                        isReview && isWrongSelected ? "border-red-400 bg-red-400" :
                                        isSelected ? "border-indigo-600 bg-indigo-600" : "border-slate-300"
                                      }`}>
                                        {(isSelected || (isReview && isCorrectAnswer)) && <span className="h-2 w-2 rounded-full bg-white" />}
                                      </span>
                                      <span className="flex-1">{opt}</span>
                                      {isReview && isCorrectAnswer && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Per-question explanation after review */}
                              {quizResult && (() => {
                                const qId = quizQuestions[quizActiveQuestionIdx].id;
                                const reviewData = quizResult.questions?.find((rq: any) => rq.questionId === qId);
                                return reviewData?.explanation ? (
                                  <div className="mt-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200/60 dark:bg-amber-950/20 dark:border-amber-800/40">
                                    <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                                      <span className="font-extrabold">Penjelasan: </span>{reviewData.explanation}
                                    </p>
                                  </div>
                                ) : null;
                              })()}
                            </div>

                            {/* Navigation + Submit */}
                            {!quizResult && (
                              <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setQuizActiveQuestionIdx((i) => Math.max(0, i - 1))}
                                    disabled={quizActiveQuestionIdx === 0}
                                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-400"
                                  >
                                    ← Sebelumnya
                                  </button>
                                  <button
                                    onClick={() => setQuizActiveQuestionIdx((i) => Math.min(quizQuestions.length - 1, i + 1))}
                                    disabled={quizActiveQuestionIdx === quizQuestions.length - 1}
                                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-400"
                                  >
                                    Berikutnya →
                                  </button>
                                </div>
                                <button
                                  onClick={handleQuizSubmit}
                                  disabled={quizLoading}
                                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition shadow-md shadow-indigo-600/10 disabled:opacity-50"
                                >
                                  {quizLoading ? "Mengirim..." : "Kirim Jawaban"}
                                </button>
                              </div>
                            )}

                            {/* Quiz Result Summary */}
                            {quizResult && (
                              <div className="space-y-4">
                                <div className="rounded-2xl border border-indigo-200/50 bg-gradient-to-br from-indigo-50/40 to-slate-50 p-5 dark:border-indigo-900/30 dark:from-indigo-950/25 dark:to-slate-900/30">
                                  <div className="flex items-center justify-between mb-3">
                                    <div>
                                      <span className="text-xl font-extrabold text-slate-900 dark:text-white">{quizResult.score}%</span>
                                      <span className="text-xs text-slate-500 ml-2">({quizResult.correctCount}/{quizResult.totalQuestions} benar)</span>
                                    </div>
                                    <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${
                                      quizResult.passed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                                    }`}>
                                      {quizResult.passed ? "✓ LULUS" : "✗ BELUM LULUS"}
                                    </span>
                                  </div>
                                  {/* Score bar */}
                                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mb-4">
                                    <div
                                      className={`h-1.5 rounded-full transition-all ${quizResult.passed ? "bg-emerald-500" : "bg-red-400"}`}
                                      style={{ width: `${quizResult.score}%` }}
                                    />
                                  </div>
                                  <p className="text-xs text-slate-600 leading-relaxed dark:text-slate-350 whitespace-pre-wrap">{quizResult.aiFeedback}</p>
                                </div>

                                <button
                                  onClick={() => {
                                    setQuizResult(null);
                                    setSelectedAnswers({});
                                    setQuizActiveQuestionIdx(0);
                                    if (quizTimerRef.current) clearInterval(quizTimerRef.current);
                                    setQuizTimeLeft(quizTimeLimitSeconds > 0 ? quizTimeLimitSeconds : null);
                                  }}
                                  className="w-full py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 transition"
                                >
                                  Coba Lagi
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="py-12 text-center text-xs text-slate-450">Tidak ada pertanyaan di modul ini.</div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
        ) : (
          /* ========================================================================= */
          /* UNOWNED VIEW: Course details description, syllabus list, and purchase widget */
          /* ========================================================================= */
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 mt-4">
            
            {/* Left Content Area (Syllabus, Overview) */}
            <div className="lg:col-span-2 space-y-8">
              {/* Header Info */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs font-extrabold text-amber-500">
                    <Star className="h-4.5 w-4.5 fill-amber-500" />
                    <span>4.8</span>
                  </div>
                  <span className="text-xs text-slate-400 font-semibold">(150+ siswa membeli)</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-4 dark:text-white">
                  {course.title}
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed mt-4 dark:text-slate-350">
                  {course.description}
                </p>

                {/* Micro Stats */}
                <div className="mt-8 flex flex-wrap gap-6 items-center border-t border-slate-100 pt-5 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-650 dark:text-slate-300">
                    <Users className="h-4.5 w-4.5 text-indigo-500" />
                    <span>Paket kelas terstruktur terakreditasi</span>
                  </div>
                </div>
              </div>

              {/* What You'll Learn Checkmarks */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-5">Apa yang akan Anda pelajari</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    "Memahami matematika dasar algoritma intelijen buatan",
                    "Melakukan visualisasi data dan grafik matplotlib secara mandiri",
                    "Membuat model klasifikasi prediktif berkualitas",
                    "Menggunakan asisten tutor virtual AI untuk memecahkan konsep sulit",
                  ].map((learn, idx) => (
                    <div key={idx} className="flex gap-3 text-xs text-slate-655 dark:text-slate-350 font-medium">
                      <Check className="h-4.5 w-4.5 text-indigo-650 shrink-0" />
                      <span>{learn}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Content Syllabus Outline */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Silabus Kelas</h3>
                    <div className="flex gap-4 text-[10px] font-bold text-slate-450 dark:text-slate-500 mt-1">
                      <span>{course.level}</span>
                      <span>•</span>
                      <span>{course.modules?.length || 0} Modul pembelajaran</span>
                    </div>
                  </div>
                </div>

                {/* Section Accordions */}
                <div className="space-y-4">
                  {course.modules?.map((mod: any, index: number) => (
                    <div key={mod.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-900/30">
                      <div className="p-4 flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white border-b border-slate-250/20">
                        <span>{mod.title}</span>
                        <span className="text-[10px] text-slate-400">{mod.lessons?.length || 0} pelajaran</span>
                      </div>
                      <div className="p-4 space-y-3.5">
                        {mod.lessons?.map((lesson: any, i: number) => (
                          <div key={lesson.id} className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 font-semibold">
                              <span>{lesson.type === "video" ? "📹" : lesson.type === "coding" ? "💻" : lesson.type === "quiz" ? "📝" : "📄"}</span>
                              <span>{lesson.title}</span>
                            </div>
                            <span className="text-[10px] text-slate-450 dark:text-slate-500 font-bold">{lesson.duration}m</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar Pricing & Actions Card */}
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 relative">
                <div className="aspect-video w-full rounded-2xl bg-indigo-50 flex items-center justify-center text-center dark:bg-slate-950/50 mb-6 border border-slate-100 dark:border-slate-800/80">
                  <span className="text-3xl">🐍</span>
                </div>

                {/* Price tag */}
                <div className="flex items-baseline gap-3 mb-6">
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    {course.price === 0 ? "Gratis" : `Rp ${course.price.toLocaleString()}`}
                  </span>
                  {course.originalPrice > 0 && (
                    <span className="text-xs font-semibold text-slate-400 line-through">
                      Rp {course.originalPrice.toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  {course.price > 0 && (
                    <button 
                      onClick={handleAddToCart}
                      className="w-full rounded-2xl border border-slate-200 py-3.5 text-xs font-bold hover:bg-slate-50 dark:border-slate-855 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Masukkan Keranjang
                    </button>
                  )}
                  <button 
                    onClick={handlePurchase}
                    className="w-full rounded-2xl bg-indigo-600 py-3.5 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/10 cursor-pointer text-center"
                  >
                    {course.price === 0 ? "Daftar Sekarang (Gratis)" : "Beli Sekarang"}
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
