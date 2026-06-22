"use client";

import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Play, FileText, Code2, CheckCircle2, ChevronRight, HelpCircle, 
  Star, Users, Clock, BookOpen, Check, Award, Heart, MessageSquare,
  Bot, Send, Smile, Mic, Volume2, Copy, RotateCcw, ThumbsDown, Lock
} from "lucide-react";
import { api } from "../../lib/api";

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

  // Python Code Sandbox cells
  const [codeCells, setCodeCells] = useState<any[]>([]);

  // Quiz evaluation states
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<any>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizActiveQuestionIdx, setQuizActiveQuestionIdx] = useState(0);

  // Fake video player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(20);

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
    try {
      const res = await api.get(`/api/courses/${cId}/lessons/${lId}`);
      const lesson = res.data;
      setLessonContent(lesson);

      if (lesson.type === "coding") {
        setCodeCells([
          {
            id: 1,
            code: lesson.contentBody || `# Tulis kode Python Anda di sini\nimport pandas as pd\nprint("Selamat datang di AIphy Sandbox!")`,
            output: "",
            error: undefined,
            running: false,
            plots: [],
          },
        ]);
      } else if (lesson.type === "quiz") {
        setQuizLoading(true);
        try {
          // Attempt to load from backend
          const quizRes = await api.get(`/api/quiz/${lId}`);
          setQuizQuestions(quizRes.data.questions || []);
        } catch {
          // Mock Questions Fallback
          setQuizQuestions([
            {
              id: "q1",
              text: "Dalam klasifikasi penyakit diabetes, apa yang biasanya diwakili oleh label target?",
              options: [
                "Usia pasien",
                "Jumlah pengukuran glukosa darah",
                "Apakah pasien menderita diabetes atau tidak (0 atau 1)",
                "Akurasi model pelatihan",
              ],
            },
            {
              id: "q2",
              text: "Algoritma mana yang merupakan classifier probabilistik berdasarkan teorema Bayes?",
              options: [
                "Regresi Linear",
                "K-Means Clustering",
                "Naive Bayes Classifier",
                "Decision Tree",
              ],
            },
          ]);
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
    setCodeCells((prev) =>
      prev.map((c) => (c.id === cellId ? { ...c, running: true, output: "", error: undefined, plots: [] } : c))
    );
    const targetCell = codeCells.find((c) => c.id === cellId);
    if (!targetCell) return;

    try {
      const res = await api.post("/api/code/run", { code: targetCell.code });
      const runResult = res.data;
      setCodeCells((prev) =>
        prev.map((c) =>
          c.id === cellId
            ? {
                ...c,
                running: false,
                output: runResult.output || (runResult.error ? "" : "Program dieksekusi dengan sukses tanpa output konsol."),
                error: runResult.error,
                plots: runResult.plots || [],
              }
            : c
        )
      );
    } catch (err: any) {
      console.error("Gagal eksekusi kode:", err);
      const isForbidden = err.statusCode === 403;
      setCodeCells((prev) =>
        prev.map((c) =>
          c.id === cellId
            ? {
                ...c,
                running: false,
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
    setQuizLoading(true);
    try {
      const answers: Record<string, string> = {};
      quizQuestions.forEach((q) => {
        answers[q.id] = selectedAnswers[q.id] || "";
      });

      const res = await api.post(`/api/quiz/${lessonContent.id}/submit`, { answers });
      setQuizResult(res.data);

      if (res.data.score >= 60) {
        await api.put(`/api/courses/${courseId}/lessons/${lessonContent.id}/complete`);
      }
    } catch (err) {
      // Local scoring fallback
      let correctCount = 0;
      quizQuestions.forEach((q, idx) => {
        const selectedVal = selectedAnswers[q.id];
        const isCorrect = (idx === 0 && selectedVal === q.options[2]) || (idx === 1 && selectedVal === q.options[2]);
        if (isCorrect) correctCount++;
      });
      const score = Math.round((correctCount / quizQuestions.length) * 100);
      setQuizResult({
        score,
        aiFeedback: `[Simulasi Sukses] Evaluasi Mandiri: Nilai Anda ${score}%. ${
          score >= 60
            ? "Bagus sekali! Anda telah memahami logika dasar klasifikasi."
            : "Silakan ulangi kembali materi klasifikasi untuk hasil yang lebih baik."
        }`,
      });

      if (score >= 60) {
        await api.put(`/api/courses/${courseId}/lessons/${lessonContent.id}/complete`);
      }
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
                          {msg.text || (sendingChat && "AIphy sedang mengetik...")}
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
                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-4 py-2 bg-indigo-50/40 rounded-2xl border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/40">
                        <div className="flex items-center gap-3 text-xs font-bold text-indigo-700 dark:text-indigo-400">
                          <span>Eksekusi Python Sandbox</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-550">Connected ⚡ Python 3</span>
                      </div>

                      {codeCells.map((cell) => (
                        <div key={cell.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => handleRunCell(cell.id)}
                              disabled={cell.running}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 transition dark:bg-slate-850 dark:hover:bg-slate-800 text-[10px]"
                            >
                              {cell.running ? "⏳" : "▶"}
                            </button>
                            <div className="flex-1 font-mono text-[11px] leading-relaxed">
                              <textarea
                                value={cell.code}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCodeCells((prev) => prev.map((c) => (c.id === cell.id ? { ...c, code: val } : c)));
                                }}
                                rows={8}
                                className="w-full bg-slate-50 p-4 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-indigo-200 font-mono"
                              />
                            </div>
                          </div>

                          {/* Code Output */}
                          {cell.output && (
                            <div className="pl-10 font-mono text-[10px] text-emerald-600 dark:text-emerald-450">
                              <pre className="bg-slate-150 p-3 rounded-xl dark:bg-slate-950/50 whitespace-pre-wrap">{cell.output}</pre>
                            </div>
                          )}

                          {/* Code Execution Error */}
                          {cell.error && (
                            <div className="pl-10 font-mono text-[10px] text-red-500 dark:text-red-400">
                              <pre className="bg-red-50 p-3 border border-red-200/50 rounded-xl dark:bg-red-950/20 whitespace-pre-wrap">{cell.error}</pre>
                            </div>
                          )}

                          {/* Plot Graph Render */}
                          {cell.plots && cell.plots.map((plot: string, idx: number) => (
                            <div key={idx} className="pl-10 pt-2 flex justify-center">
                              <div className="w-full max-w-md bg-white p-4 border border-slate-150 rounded-2xl dark:bg-slate-900/10">
                                <img src={plot} alt={`Visualization ${idx + 1}`} className="w-full h-auto object-contain rounded-lg" />
                                <span className="block text-center text-[10px] font-bold text-slate-500 mt-2">Grafik Output Python Sandbox Matplotlib</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* VIEW: Quiz Practice View */}
                  {lessonContent?.type === "quiz" && (
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
                      {quizQuestions.length > 0 ? (
                        <>
                          <div className="flex items-center justify-between pb-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {quizQuestions.map((_, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setQuizActiveQuestionIdx(idx)}
                                  className={`h-8 w-8 rounded-xl text-xs font-bold transition-all ${
                                    quizActiveQuestionIdx === idx
                                      ? "bg-indigo-600 text-white"
                                      : "bg-slate-100 text-slate-650 hover:bg-slate-200 dark:bg-slate-850 dark:text-slate-400"
                                  }`}
                                >
                                  {idx + 1}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Question Area */}
                          <div className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800 space-y-4">
                            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-relaxed">
                              {quizQuestions[quizActiveQuestionIdx]?.text}
                            </h4>

                            <div className="space-y-3 pt-2">
                              {quizQuestions[quizActiveQuestionIdx]?.options.map((opt: string, oIdx: number) => {
                                const qId = quizQuestions[quizActiveQuestionIdx].id;
                                const isSelected = selectedAnswers[qId] === opt;
                                return (
                                  <button
                                    key={oIdx}
                                    onClick={() => setSelectedAnswers({ ...selectedAnswers, [qId]: opt })}
                                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-xs font-bold text-left transition-all ${
                                      isSelected
                                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-750 dark:bg-indigo-950/20 dark:text-indigo-450"
                                        : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                                    }`}
                                  >
                                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                      isSelected ? "border-indigo-650 bg-indigo-600" : "border-slate-300"
                                    }`}>
                                      {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
                                    </span>
                                    <span>{opt}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Submit Quiz Trigger */}
                          <div className="flex justify-end pt-4">
                            <button
                              onClick={handleQuizSubmit}
                              disabled={quizLoading}
                              className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition shadow-md shadow-indigo-600/10 disabled:opacity-50"
                            >
                              {quizLoading ? "Mengirim Jawaban..." : "Kirim Jawaban & Dapatkan Feedback AI"}
                            </button>
                          </div>

                          {/* Quiz grading result output */}
                          {quizResult && (
                            <div className="rounded-2xl border border-indigo-200/50 bg-indigo-50/30 p-5 dark:border-indigo-900/30 dark:bg-indigo-950/25 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-slate-800 dark:text-white">Skor Ujian: {quizResult.score}%</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  quizResult.score >= 60 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                }`}>
                                  {quizResult.score >= 60 ? "LULUS" : "TIDAK LULUS"}
                                </span>
                              </div>
                              <p className="text-xs text-slate-650 leading-relaxed dark:text-slate-350 whitespace-pre-wrap">{quizResult.aiFeedback}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="py-12 text-center text-xs text-slate-450">Tidak ada pertanyaan di modul ini.</div>
                      )}
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
