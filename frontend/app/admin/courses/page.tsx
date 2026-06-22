"use client";

import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  BookOpen, Plus, Trash2, Edit3, Eye, Save, Sparkles, Check
} from "lucide-react";
import { api } from "../../lib/api";

export default function AdminCoursesCMSPage() {
  const router = useRouter();
  
  // CMS States
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // WYSIWYG Content States
  const [wysiwygTitle, setWysiwygTitle] = useState("");
  const [wysiwygContent, setWysiwygContent] = useState("");
  const [wysiwygMediaUrl, setWysiwygMediaUrl] = useState("");
  const [editorMode, setEditorMode] = useState<"edit" | "preview">("edit");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states (Course)
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseCategory, setNewCourseCategory] = useState("Machine Learning");
  const [newCourseLevel, setNewCourseLevel] = useState("beginner");
  const [newCourseDesc, setNewCourseDesc] = useState("Belajar mandiri mengenai topik kurikulum ini secara mendalam.");

  // Form states (Lesson)
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonType, setNewLessonType] = useState("video");
  const [newLessonDuration, setNewLessonDuration] = useState("15");
  const [newLessonMediaUrl, setNewLessonMediaUrl] = useState("");

  // Load Admin profile and all courses
  const loadCMSData = async () => {
    try {
      const [profileRes, coursesRes] = await Promise.all([
        api.get("/api/user/profile").catch(() => null),
        api.get("/api/courses"),
      ]);

      if (profileRes) {
        const userRole = profileRes.data.role;
        if (userRole !== "super_admin" && userRole !== "content_admin") {
          alert("Akses ditolak: Anda tidak memiliki hak akses administrator.");
          router.push("/dashboard");
          return;
        }
        setProfile(profileRes.data);
      } else {
        router.push("/login");
        return;
      }

      const coursesList = coursesRes.data || [];
      setCourses(coursesList);

      if (coursesList.length > 0) {
        // Load detail of first course
        const detailRes = await api.get(`/api/courses/${coursesList[0].id}`);
        setSelectedCourse(detailRes.data);
        if (detailRes.data.modules?.length > 0 && detailRes.data.modules[0].lessons?.length > 0) {
          const firstL = detailRes.data.modules[0].lessons[0];
          // Get full content lesson detail
          const fullLRes = await api.get(`/api/courses/${detailRes.data.id}/lessons/${firstL.id}`);
          setSelectedLesson(fullLRes.data);
          setWysiwygTitle(fullLRes.data.title);
          setWysiwygContent(fullLRes.data.contentBody || "");
          setWysiwygMediaUrl(fullLRes.data.mediaUrl || "");
        }
      }
    } catch (err) {
      console.error("Gagal memuat CMS:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCMSData();
  }, []);

  // Reload selected course details
  const reloadSelectedCourse = async (courseId: string, selectNewLessonId?: string) => {
    try {
      const res = await api.get(`/api/courses/${courseId}`);
      setSelectedCourse(res.data);
      if (selectNewLessonId) {
        const fullLRes = await api.get(`/api/courses/${courseId}/lessons/${selectNewLessonId}`);
        setSelectedLesson(fullLRes.data);
        setWysiwygTitle(fullLRes.data.title);
        setWysiwygContent(fullLRes.data.contentBody || "");
        setWysiwygMediaUrl(fullLRes.data.mediaUrl || "");
      } else if (res.data.modules?.length > 0 && res.data.modules[0].lessons?.length > 0) {
        const firstL = res.data.modules[0].lessons[0];
        const fullLRes = await api.get(`/api/courses/${courseId}/lessons/${firstL.id}`);
        setSelectedLesson(fullLRes.data);
        setWysiwygTitle(fullLRes.data.title);
        setWysiwygContent(fullLRes.data.contentBody || "");
        setWysiwygMediaUrl(fullLRes.data.mediaUrl || "");
      } else {
        setSelectedLesson(null);
        setWysiwygTitle("");
        setWysiwygContent("");
        setWysiwygMediaUrl("");
      }
    } catch (err) {
      console.error("Gagal memperbarui data modul:", err);
    }
  };

  // Add course
  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle.trim()) return;

    try {
      const res = await api.post("/api/admin/courses", {
        title: newCourseTitle,
        category: newCourseCategory,
        level: newCourseLevel,
        description: newCourseDesc,
        isPublished: true,
      });

      alert("Kelas baru berhasil dibuat!");
      setNewCourseTitle("");
      setNewCourseDesc("Belajar mandiri mengenai topik kurikulum ini secara mendalam.");
      
      // Reload courses
      const listRes = await api.get("/api/courses");
      setCourses(listRes.data || []);
      reloadSelectedCourse(res.data.id);
    } catch (err: any) {
      alert("Gagal membuat kelas: " + err.message);
    }
  };

  // Delete course
  const handleDeleteCourse = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus kelas ini secara permanen beserta seluruh modul dan pelajarannya?")) return;

    try {
      await api.delete(`/api/admin/courses/${id}`);
      alert("Kelas berhasil dihapus!");
      
      const listRes = await api.get("/api/courses");
      const remaining = listRes.data || [];
      setCourses(remaining);
      if (remaining.length > 0) {
        reloadSelectedCourse(remaining[0].id);
      } else {
        setSelectedCourse(null);
        setSelectedLesson(null);
        setWysiwygTitle("");
        setWysiwygContent("");
      }
    } catch (err: any) {
      alert("Gagal menghapus kelas: " + err.message);
    }
  };

  // Add lesson under first module of selected course (or auto-create module if empty)
  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonTitle.trim() || !selectedCourse) return;

    try {
      let targetModuleId = "";
      if (!selectedCourse.modules || selectedCourse.modules.length === 0) {
        // Auto create first module
        const modRes = await api.post(`/api/admin/courses/${selectedCourse.id}/modules`, {
          title: "Modul Utama: Dasar & Logika",
          order: 1,
        });
        targetModuleId = modRes.data.id;
      } else {
        targetModuleId = selectedCourse.modules[0].id;
      }

      const durMin = parseInt(newLessonDuration) || 15;
      const res = await api.post(`/api/admin/modules/${targetModuleId}/lessons`, {
        title: newLessonTitle,
        type: newLessonType,
        duration: durMin,
        contentBody: `# ${newLessonTitle}\nSelamat belajar! Mulai isi penjelasan materi di sini.`,
        mediaUrl: newLessonType === "video" ? newLessonMediaUrl : undefined,
      });

      alert("Materi baru berhasil ditambahkan!");
      setNewLessonTitle("");
      setNewLessonMediaUrl("");
      reloadSelectedCourse(selectedCourse.id, res.data.id);
    } catch (err: any) {
      alert("Gagal menambahkan materi: " + err.message);
    }
  };

  // Delete lesson
  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus materi ini?")) return;

    try {
      await api.delete(`/api/admin/lessons/${lessonId}`);
      alert("Materi berhasil dihapus!");
      reloadSelectedCourse(selectedCourse.id);
    } catch (err: any) {
      alert("Gagal menghapus materi: " + err.message);
    }
  };

  // Select lesson to edit
  const selectLesson = async (lessonId: string) => {
    try {
      const fullLRes = await api.get(`/api/courses/${selectedCourse.id}/lessons/${lessonId}`);
      setSelectedLesson(fullLRes.data);
      setWysiwygTitle(fullLRes.data.title);
      setWysiwygContent(fullLRes.data.contentBody || "");
      setWysiwygMediaUrl(fullLRes.data.mediaUrl || "");
      setSaveSuccess(false);
    } catch (err) {
      console.error("Gagal mengambil detail materi:", err);
    }
  };

  // Save changes
  const handleSaveLessonContent = async () => {
    if (!selectedLesson || !selectedCourse) return;

    try {
      await api.put(`/api/admin/lessons/${selectedLesson.id}`, {
        title: wysiwygTitle,
        contentBody: wysiwygContent,
        mediaUrl: selectedLesson.type === "video" ? wysiwygMediaUrl : undefined,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      reloadSelectedCourse(selectedCourse.id, selectedLesson.id);
    } catch (err: any) {
      alert("Gagal menyimpan materi: " + err.message);
    }
  };

  // AI Outline course generator auto builder!
  const handleAiOutlineGenerate = async () => {
    const topic = prompt("Masukkan topik kurikulum AI yang ingin digenerate secara otomatis (e.g. Artificial Neural Network):");
    if (!topic || topic.trim().length < 2) return;

    setLoading(true);
    try {
      // 1. Generate outline from AI tutor
      const genRes = await api.post("/api/admin/ai/generate-outline", { topic });
      const outline = genRes.data; // JSON Array of modules with lessons

      if (!outline || outline.length === 0) {
        throw new Error("Respon generator AI kosong.");
      }

      // 2. Create the course
      const courseRes = await api.post("/api/admin/courses", {
        title: `Pelajaran Pintar: ${topic}`,
        category: "Generative AI",
        level: "beginner",
        description: `Kelas belajar komprehensif mengenai ${topic} yang dirancang otomatis menggunakan AIphy Adaptif Kurikulum.`,
        isPublished: true,
      });
      const newCourseId = courseRes.data.id;

      // 3. Loop through modules and create them along with lessons
      for (let mIdx = 0; mIdx < outline.length; mIdx++) {
        const modInfo = outline[mIdx];
        const modRes = await api.post(`/api/admin/courses/${newCourseId}/modules`, {
          title: modInfo.moduleTitle,
          description: modInfo.moduleDescription,
          order: mIdx + 1,
        });
        const newModId = modRes.data.id;

        if (modInfo.lessons) {
          for (let lIdx = 0; lIdx < modInfo.lessons.length; lIdx++) {
            const lesInfo = modInfo.lessons[lIdx];
            await api.post(`/api/admin/modules/${newModId}/lessons`, {
              title: lesInfo.title,
              type: lesInfo.type,
              duration: lesInfo.duration || 10,
              contentBody: lesInfo.contentBody || `# ${lesInfo.title}\nMateri pembelajaran otomatis oleh AIphy.`,
              order: lIdx + 1,
            });
          }
        }
      }

      alert(`Sukses! Kelas pembelajaran "${topic}" berhasil digenerate otomatis beserta seluruh modul dan kuis latihan.`);
      
      // Reload everything
      const listRes = await api.get("/api/courses");
      setCourses(listRes.data || []);
      reloadSelectedCourse(newCourseId);
    } catch (err: any) {
      alert("Gagal generate silabus AI: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-955">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto dark:border-indigo-400"></div>
          <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Memuat Modul CMS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pl-20 dark:bg-slate-950">
      <Sidebar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Header userName={profile?.name || "Kurikulum CMS"} userTitle="Kelola struktur modul pembelajaran, tambah materi, kuis, koding lab, dan video." />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 mt-8">
          
          {/* Col 1: Modules List & Add Form */}
          <div className="lg:col-span-4 space-y-6">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="p-5 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between bg-slate-50/40 dark:bg-slate-950/20">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Modul Kurikulum</h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-850 max-h-[300px] overflow-y-auto">
                {courses.map((c) => (
                  <div 
                    key={c.id} 
                    onClick={() => {
                      reloadSelectedCourse(c.id);
                    }}
                    className={`p-4 cursor-pointer transition-all ${
                      selectedCourse?.id === c.id 
                        ? "bg-indigo-50/30 border-l-4 border-indigo-600 dark:bg-slate-800" 
                        : "hover:bg-slate-50/50 dark:hover:bg-slate-850/10"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">{c.category}</span>
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5 truncate">{c.title}</h4>
                        <span className="inline-block text-[9px] font-semibold text-slate-450 dark:text-slate-500 mt-1">{c.level}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCourse(c.id);
                        }}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Module Form */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-xs font-extrabold text-slate-900 mb-4 dark:text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-indigo-600" />
                Tambah Modul Baru
              </h3>
              <form onSubmit={handleAddCourse} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Judul Modul</label>
                  <input
                    type="text"
                    required
                    value={newCourseTitle}
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                    placeholder="Contoh: Supervised Learning Techniques"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Kategori</label>
                    <select
                      value={newCourseCategory}
                      onChange={(e) => setNewCourseCategory(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-indigo-200"
                    >
                      <option value="Machine Learning">Machine Learning</option>
                      <option value="Deep Learning">Deep Learning</option>
                      <option value="Generative AI">Generative AI</option>
                      <option value="Mathematics for AI">Mathematics for AI</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Kesulitan</label>
                    <select
                      value={newCourseLevel}
                      onChange={(e) => setNewCourseLevel(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-indigo-200"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-indigo-650 py-2.5 text-xs font-bold text-white hover:bg-indigo-600 transition shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  Buat Modul Baru
                </button>
              </form>
            </div>
          </div>

          {/* Col 2 & 3: Selected Module Content, Lessons List & WYSIWYG Content Editor */}
          <div className="lg:col-span-8 space-y-6">
            {selectedCourse ? (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                
                {/* Left inside: Lessons List inside Module */}
                <div className="xl:col-span-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-850 bg-slate-50/40 dark:bg-slate-950/20">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Materi Modul</h4>
                  </div>
                  
                  <div className="divide-y divide-slate-100 dark:divide-slate-850 max-h-[220px] overflow-y-auto">
                    {selectedCourse.modules?.flatMap((m: any) => m.lessons || []).map((lesson: any) => (
                      <div 
                        key={lesson.id} 
                        onClick={() => selectLesson(lesson.id)}
                        className={`flex items-center justify-between p-3.5 cursor-pointer transition-all ${
                          selectedLesson?.id === lesson.id 
                            ? "bg-slate-100 dark:bg-slate-850" 
                            : "hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs shrink-0 font-bold">
                            {lesson.type === "video" ? "📹" : lesson.type === "coding" ? "💻" : lesson.type === "quiz" ? "📝" : "📄"}
                          </span>
                          <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-350 truncate">{lesson.title}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLesson(lesson.id);
                          }}
                          className="flex h-5 w-5 items-center justify-center text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Lesson Form */}
                  <div className="p-4 border-t border-slate-100 dark:border-slate-855 bg-slate-50/20">
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Tambah Materi</h5>
                    <form onSubmit={handleAddLesson} className="space-y-2.5">
                      <input
                        type="text"
                        required
                        value={newLessonTitle}
                        onChange={(e) => setNewLessonTitle(e.target.value)}
                        placeholder="Judul Materi..."
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-bold"
                      />
                      <div className="grid grid-cols-2 gap-1.5">
                        <select
                          value={newLessonType}
                          onChange={(e) => setNewLessonType(e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-bold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-indigo-200"
                        >
                          <option value="video">Video</option>
                          <option value="text">Ringkasan</option>
                          <option value="coding">Lab Code</option>
                          <option value="quiz">Kuis</option>
                        </select>
                        <input
                          type="text"
                          required
                          value={newLessonDuration}
                          onChange={(e) => setNewLessonDuration(e.target.value)}
                          placeholder="Durasi (m)"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-bold"
                        />
                      </div>
                      {newLessonType === "video" && (
                        <input
                          type="text"
                          required
                          value={newLessonMediaUrl}
                          onChange={(e) => setNewLessonMediaUrl(e.target.value)}
                          placeholder="URL Video (e.g. https://www.youtube.com/watch?v=...)"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-semibold"
                        />
                      )}
                      <button
                        type="submit"
                        className="w-full rounded-lg bg-indigo-600 py-1.5 text-[10px] font-bold text-white hover:bg-indigo-500 transition"
                      >
                        + Tambah Materi
                      </button>
                    </form>
                  </div>
                </div>

                {/* Right inside: WYSIWYG Content Editor */}
                <div className="xl:col-span-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
                  {selectedLesson ? (
                    <div className="space-y-4">
                      
                      {/* Editor Header Title */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex-1 min-w-0">
                          <input 
                            type="text"
                            value={wysiwygTitle}
                            onChange={(e) => setWysiwygTitle(e.target.value)}
                            className="text-sm font-extrabold text-slate-900 bg-transparent border-b border-transparent focus:border-slate-350 outline-none w-full dark:text-white"
                          />
                          <p className="text-[10px] text-slate-450 font-bold mt-0.5 uppercase tracking-wide">Tipe: {selectedLesson.type} • Edit Mode</p>
                          {selectedLesson.type === "video" && (
                            <div className="mt-2 max-w-lg">
                              <label className="block text-[9px] font-bold text-slate-450 uppercase tracking-widest">URL Video Pembelajaran</label>
                              <input 
                                type="text"
                                value={wysiwygMediaUrl}
                                onChange={(e) => setWysiwygMediaUrl(e.target.value)}
                                placeholder="Masukkan URL Video (e.g., https://www.youtube.com/watch?v=...)"
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-semibold"
                              />
                            </div>
                          )}
                        </div>
                        
                        {/* Editor / Preview Selector */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl dark:bg-slate-850 shrink-0">
                          <button 
                            onClick={() => setEditorMode("edit")}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              editorMode === "edit" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white" : "text-slate-500"
                            }`}
                          >
                            Editor
                          </button>
                          <button 
                            onClick={() => setEditorMode("preview")}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              editorMode === "preview" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white" : "text-slate-500"
                            }`}
                          >
                            <Eye className="h-3 w-3 inline mr-1" /> Preview
                          </button>
                        </div>
                      </div>

                      {/* WYSIWYG Toolbar Panel */}
                      {editorMode === "edit" && (
                        <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 rounded-2xl border border-slate-200/60 dark:bg-slate-950 dark:border-slate-800">
                          <button 
                            onClick={handleAiOutlineGenerate}
                            type="button" 
                            className="text-[10px] font-bold text-indigo-600 bg-indigo-50/50 px-2.5 py-1 rounded-lg flex items-center gap-1 hover:bg-indigo-50"
                          >
                            <Sparkles className="h-3 w-3 fill-indigo-500 animate-pulse" /> Auto-Generate Outline via AI
                          </button>
                        </div>
                      )}

                      {/* Content Workspace Area */}
                      {editorMode === "edit" ? (
                        <textarea
                          value={wysiwygContent}
                          onChange={(e) => setWysiwygContent(e.target.value)}
                          placeholder="Mulai ketik deskripsi, kode program, kuis, atau instruksi materi Anda disini..."
                          rows={10}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50/30 p-4 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-350 font-mono"
                        />
                      ) : (
                        <div className="w-full min-h-[220px] p-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/10 text-xs dark:border-slate-850 dark:bg-slate-950 whitespace-pre-wrap font-mono">
                          {selectedLesson.type === "video" && (
                            <div className="mb-4 aspect-video w-full rounded-xl bg-slate-950 overflow-hidden flex items-center justify-center text-slate-500 text-[10px] font-bold border border-slate-800">
                              {wysiwygMediaUrl ? (
                                <iframe
                                  className="w-full h-full"
                                  src={wysiwygMediaUrl.replace("watch?v=", "embed/")}
                                  title={wysiwygTitle}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                ></iframe>
                              ) : (
                                <span>📹 Pemutar Video Pembelajaran (Belum ada URL video)</span>
                              )}
                            </div>
                          )}
                          <div className="prose prose-sm dark:prose-invert">
                            <h4 className="text-sm font-extrabold mb-2">{wysiwygTitle}</h4>
                            <p className="whitespace-pre-wrap leading-relaxed text-slate-650 dark:text-slate-400">{wysiwygContent}</p>
                          </div>
                        </div>
                      )}

                      {/* Save Footer Bar */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2">
                          {saveSuccess && (
                            <span className="text-[10px] font-bold text-emerald-650 bg-emerald-50 px-3 py-1 rounded-lg flex items-center gap-1">
                              <Check className="h-3.5 w-3.5" /> Perubahan disimpan!
                            </span>
                          )}
                        </div>
                        <button
                          onClick={handleSaveLessonContent}
                          className="rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-550 transition flex items-center gap-2"
                        >
                          <Save className="h-4 w-4" /> Simpan Materi
                        </button>
                      </div>

                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-xs font-bold text-slate-450 dark:text-slate-500">
                      <span>📄 Pilih materi di playlist sebelah kiri untuk mengedit konten menggunakan WYSIWYG editor atau klik Generate AI untuk membuat materi baru.</span>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-xs font-semibold text-slate-455 dark:border-slate-800 dark:bg-slate-900">
                Silakan buat kelas baru di panel kiri terlebih dahulu.
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
