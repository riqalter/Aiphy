import { db } from '../../config/database';
import { userProgress, quizzes, quizQuestions, quizAttempts, learningStreaks, badges, userBadges } from '../../db/schema/progress';
import { courses, lessons, modules, courseEnrollments } from '../../db/schema/courses';
import { eq, and, desc, sql } from 'drizzle-orm';
import { NotFoundError, BadRequestError } from '../../lib/errors';
import { llmClient, DEFAULT_MODEL } from '../ai/llm-client';

export class LearningService {
  // --- STREAK LOGIC ---

  static async updateStreak(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    return await db.transaction(async (tx) => {
      let [streak] = await tx.select().from(learningStreaks).where(eq(learningStreaks.userId, userId)).limit(1);

      if (!streak) {
        // First active day
        const [newStreak] = await tx
          .insert(learningStreaks)
          .values({
            userId,
            currentStreak: 1,
            longestStreak: 1,
            lastActiveDate: new Date(),
          })
          .returning();
        
        await this.checkAndAwardBadge(userId, 'streak', 1, tx);
        return newStreak;
      }

      const lastActive = new Date(streak.lastActiveDate!);
      lastActive.setHours(0, 0, 0, 0);

      if (lastActive.getTime() === today.getTime()) {
        // Already active today, do nothing
        return streak;
      }

      let current = streak.currentStreak;
      let longest = streak.longestStreak;

      if (lastActive.getTime() === yesterday.getTime()) {
        // Active consecutive day
        current += 1;
        if (current > longest) {
          longest = current;
        }
      } else {
        // Streak broken
        current = 1;
      }

      const [updatedStreak] = await tx
        .update(learningStreaks)
        .set({
          currentStreak: current,
          longestStreak: longest,
          lastActiveDate: new Date(),
        })
        .where(eq(learningStreaks.userId, userId))
        .returning();

      // Check for streak badges
      await this.checkAndAwardBadge(userId, 'streak', current, tx);

      return updatedStreak;
    });
  }

  // --- PROGRESS TRACKING ---

  static async completeLesson(userId: string, courseId: string, lessonId: string) {
    // 1. Check if lesson exists
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    // 2. Save progress
    const [existingProgress] = await db
      .select()
      .from(userProgress)
      .where(
        and(
          eq(userProgress.userId, userId),
          eq(userProgress.courseId, courseId),
          eq(userProgress.lessonId, lessonId)
        )
      )
      .limit(1);

    let progress = existingProgress;

    if (!existingProgress) {
      const [newProgress] = await db
        .insert(userProgress)
        .values({
          userId,
          courseId,
          lessonId,
          status: 'completed',
        })
        .returning();
      
      progress = newProgress;
    }

    // 3. Update User Streak
    await this.updateStreak(userId);

    // 4. Check and handle course completion
    await db.transaction(async (tx) => {
      await this.checkAndCompleteCourse(userId, courseId, tx);
    });

    return {
      success: true,
      message: 'Lesson marked as completed',
      data: progress,
    };
  }

  static async getCourseProgressPercent(userId: string, courseId: string) {
    // Total lessons
    const totalLessonsQuery = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(lessons)
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .where(eq(modules.courseId, courseId));
    
    const totalLessons = totalLessonsQuery[0].count;
    if (totalLessons === 0) return 0;

    // Completed lessons
    const completedQuery = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(userProgress)
      .where(
        and(
          eq(userProgress.userId, userId),
          eq(userProgress.courseId, courseId),
          eq(userProgress.status, 'completed')
        )
      );

    const completed = completedQuery[0].count;
    return Math.round((completed / totalLessons) * 100);
  }

  // --- QUIZ SYSTEM ---

  // Lookup quiz by lessonId (frontend always passes lessonId as the quiz identifier)
  static async getQuiz(lessonId: string) {
    const quiz = await db.query.quizzes.findFirst({
      where: eq(quizzes.lessonId, lessonId),
      with: {
        questions: {
          columns: {
            id: true,
            text: true,
            options: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundError('Quiz tidak ditemukan untuk pelajaran ini');
    }

    return quiz;
  }

  static async submitQuiz(userId: string, lessonId: string, userAnswers: Record<string, string>) {
    // Lookup quiz by lessonId (consistent with getQuiz)
    const quiz = await db.query.quizzes.findFirst({
      where: eq(quizzes.lessonId, lessonId),
      with: {
        questions: true,
        lesson: {
          with: {
            module: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundError('Quiz not found');
    }

    const questionsList = quiz.questions;
    let correctCount = 0;
    const questionsFeedback: any[] = [];

    for (const q of questionsList) {
      const userAnswer = userAnswers[q.id] || '';
      const isCorrect = userAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
      
      if (isCorrect) {
        correctCount++;
      }

      questionsFeedback.push({
        questionId: q.id,
        text: q.text,
        userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation,
      });
    }

    const totalQuestions = questionsList.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passed = score >= quiz.passingScore;

    // Generate AI feedback using LLM
    let aiFeedback = '';
    try {
      // Build per-question summary for LLM context
      const questionsSummary = questionsFeedback
        .map((q, i) =>
          `Soal ${i + 1}: ${q.text}\nJawaban pengguna: ${q.userAnswer || '(tidak dijawab)'}\nJawaban benar: ${q.correctAnswer}\nStatus: ${q.isCorrect ? 'Benar' : 'Salah'}${q.explanation ? `\nPenjelasan: ${q.explanation}` : ''}`
        )
        .join('\n\n');

      const systemPrompt = `Anda adalah tutor AI untuk platform pendidikan kecerdasan artifisial AIphy. 
Berikan feedback yang memotivasi, spesifik, dan edukatif dalam Bahasa Indonesia untuk hasil kuis seorang pelajar.
Feedback harus mencakup: apresiasi atas usaha, analisis singkat soal yang salah (jika ada), dan saran konkret untuk perbaikan.
Gunakan bahasa yang ramah, tidak lebih dari 150 kata.`;

      const userPrompt = `Pelajar baru saja menyelesaikan kuis "${quiz.title}".
Skor: ${score}% (${correctCount} dari ${totalQuestions} benar)
Status: ${passed ? 'LULUS' : 'TIDAK LULUS'} (batas lulus: ${quiz.passingScore}%)

Detail per soal:
${questionsSummary}

Berikan feedback yang memotivasi dan edukatif.`;

      const completion = await llmClient.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      aiFeedback = completion.choices[0]?.message?.content?.trim() || '';
    } catch (err) {
      console.error('[LearningService] LLM feedback generation failed, using fallback:', err);
    }

    // Fallback jika LLM gagal
    if (!aiFeedback) {
      aiFeedback = `Anda menjawab ${correctCount} dari ${totalQuestions} pertanyaan dengan benar (${score}%). `;
      if (score === 100) {
        aiFeedback += 'Sempurna! Anda memahami materi ini dengan sangat baik. Pertahankan prestasinya!';
      } else if (passed) {
        aiFeedback += 'Anda lulus kuis ini! Tinjau kembali soal yang salah untuk memperdalam pemahaman.';
      } else {
        aiFeedback += 'Anda belum mencapai batas kelulusan. Baca ulang materi pada modul ini sebelum mencoba kembali.';
      }
    }

    return await db.transaction(async (tx) => {
      // Save attempt (use quiz.id — the actual DB primary key of the quiz row)
      const [attempt] = await tx
        .insert(quizAttempts)
        .values({
          userId,
          quizId: quiz.id,
          score,
          answers: userAnswers,
          aiFeedback,
        })
        .returning();

      // Update streak
      await this.updateStreak(userId);

      // If passed, mark the lesson of this quiz as completed!
      if (passed && quiz.lessonId) {
        const courseId = quiz.lesson.module.courseId;
        
        const [existingProgress] = await tx
          .select()
          .from(userProgress)
          .where(
            and(
              eq(userProgress.userId, userId),
              eq(userProgress.courseId, courseId),
              eq(userProgress.lessonId, quiz.lessonId)
            )
          )
          .limit(1);

        if (!existingProgress) {
          await tx.insert(userProgress).values({
            userId,
            courseId,
            lessonId: quiz.lessonId,
            status: 'completed',
          });
          await this.checkAndCompleteCourse(userId, courseId, tx);
        }
      }

      // Check perfect score badge
      if (score === 100) {
        await this.checkAndAwardBadge(userId, 'quiz_perfect', 1, tx);
      }

      return {
        score,
        passed,
        passingScore: quiz.passingScore,
        correctCount,
        totalQuestions,
        aiFeedback,
        questions: questionsFeedback,
        attemptId: attempt.id,
      };
    });
  }

  // --- GAMIFICATION / BADGES ---

  static async getActiveStudy(userId: string) {
    const lastActive = await db
      .select({
        courseId: userProgress.courseId,
        courseTitle: courses.title,
        lessonId: userProgress.lessonId,
        lessonTitle: lessons.title,
        completedAt: userProgress.completedAt,
      })
      .from(userProgress)
      .innerJoin(courses, eq(userProgress.courseId, courses.id))
      .innerJoin(lessons, eq(userProgress.lessonId, lessons.id))
      .where(eq(userProgress.userId, userId))
      .orderBy(desc(userProgress.completedAt))
      .limit(1);

    if (lastActive.length > 0) {
      return lastActive[0];
    }

    // Fallback: If no completed lessons, find the most recently enrolled active course
    const latestEnrollments = await db
      .select({
        courseId: courseEnrollments.courseId,
        courseTitle: courses.title,
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .where(and(eq(courseEnrollments.userId, userId), eq(courseEnrollments.status, 'active')))
      .orderBy(desc(courseEnrollments.enrolledAt))
      .limit(1);

    if (latestEnrollments.length === 0) {
      return null;
    }

    const latestEnrollment = latestEnrollments[0];

    // Find the first lesson of this course (modules ordered by order, lessons ordered by order)
    const firstLesson = await db
      .select({
        lessonId: lessons.id,
        lessonTitle: lessons.title,
      })
      .from(lessons)
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .where(eq(modules.courseId, latestEnrollment.courseId))
      .orderBy(modules.order, lessons.order)
      .limit(1);

    if (firstLesson.length === 0) {
      return {
        courseId: latestEnrollment.courseId,
        courseTitle: latestEnrollment.courseTitle,
        lessonId: null,
        lessonTitle: 'Belum ada materi pelajaran',
        completedAt: null,
      };
    }

    return {
      courseId: latestEnrollment.courseId,
      courseTitle: latestEnrollment.courseTitle,
      lessonId: firstLesson[0].lessonId,
      lessonTitle: firstLesson[0].lessonTitle,
      completedAt: null,
    };
  }

  static async getUserBadges(userId: string) {
    return await db
      .select({
        id: badges.id,
        name: badges.name,
        description: badges.description,
        iconUrl: badges.iconUrl,
        earnedAt: userBadges.earnedAt,
      })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, userId));
  }

  static async getUserStreak(userId: string) {
    const [streak] = await db
      .select()
      .from(learningStreaks)
      .where(eq(learningStreaks.userId, userId))
      .limit(1);

    if (!streak) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
        weeklyActive: [false, false, false, false, false, false, false],
      };
    }

    // Weekly activity tracker (checks if user has progress for each day of current week)
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
    
    // Start of week (Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Fetch user progress dates from this week
    const weeklyProgress = await db
      .select({ date: userProgress.completedAt })
      .from(userProgress)
      .where(
        and(
          eq(userProgress.userId, userId),
          sql`${userProgress.completedAt} >= ${startOfWeek.toISOString()}`,
          sql`${userProgress.completedAt} <= ${endOfWeek.toISOString()}`
        )
      );

    const activeDays = new Array(7).fill(false);
    for (const prog of weeklyProgress) {
      const day = new Date(prog.date).getDay();
      activeDays[day] = true;
    }

    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastActiveDate: streak.lastActiveDate,
      weeklyActive: activeDays,
    };
  }

  // Helper function to check and handle course completion
  public static async checkAndCompleteCourse(userId: string, courseId: string, tx: any) {
    // Count total lessons in course
    const totalLessonsQuery = await tx
      .select({ count: sql<number>`COUNT(*)` })
      .from(lessons)
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .where(eq(modules.courseId, courseId));
    
    const totalLessons = totalLessonsQuery[0].count;

    // Count completed lessons
    const completedQuery = await tx
      .select({ count: sql<number>`COUNT(*)` })
      .from(userProgress)
      .where(
        and(
          eq(userProgress.userId, userId),
          eq(userProgress.courseId, courseId),
          eq(userProgress.status, 'completed')
        )
      );

    const completedLessons = completedQuery[0].count;

    if (totalLessons > 0 && completedLessons === totalLessons) {
      // 1. Update course enrollment status to 'completed'
      await tx
        .update(courseEnrollments)
        .set({ status: 'completed' })
        .where(
          and(
            eq(courseEnrollments.userId, userId),
            eq(courseEnrollments.courseId, courseId)
          )
        );

      // 2. Award course completion badge
      await this.checkAndAwardBadge(userId, 'course_complete', 1, tx);
    }
  }

  // --- QUIZ ATTEMPTS HISTORY ---

  static async getQuizAttempts(userId: string, lessonId: string) {
    // Lookup quiz by lessonId first
    const quiz = await db.query.quizzes.findFirst({
      where: eq(quizzes.lessonId, lessonId),
      columns: { id: true, title: true, passingScore: true },
    });

    if (!quiz) {
      throw new NotFoundError('Quiz tidak ditemukan untuk pelajaran ini');
    }

    const attempts = await db
      .select({
        id: quizAttempts.id,
        score: quizAttempts.score,
        aiFeedback: quizAttempts.aiFeedback,
        answers: quizAttempts.answers,
        startedAt: quizAttempts.startedAt,
        completedAt: quizAttempts.completedAt,
      })
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.userId, userId),
          eq(quizAttempts.quizId, quiz.id)
        )
      )
      .orderBy(desc(quizAttempts.completedAt))
      .limit(10);

    return {
      quizTitle: quiz.title,
      passingScore: quiz.passingScore,
      attempts: attempts.map((a) => ({
        ...a,
        passed: a.score >= quiz.passingScore,
      })),
    };
  }

  // Helper function to check eligibility and award a badge
  private static async checkAndAwardBadge(userId: string, criteriaType: string, value: number, tx: any) {
    // Find badge matching criteria
    const qualifyingBadges = await tx
      .select()
      .from(badges)
      .where(
        and(
          eq(badges.criteriaType, criteriaType),
          sql`${badges.criteriaValue} <= ${value}`
        )
      );

    for (const badge of qualifyingBadges) {
      // Check if user already has this badge
      const [existing] = await tx
        .select()
        .from(userBadges)
        .where(
          and(
            eq(userBadges.userId, userId),
            eq(userBadges.badgeId, badge.id)
          )
        )
        .limit(1);

      if (!existing) {
        // Award badge!
        await tx.insert(userBadges).values({
          userId,
          badgeId: badge.id,
        });
      }
    }
  }
}
