import { db } from '../../config/database';
import { courses, modules, lessons } from '../../db/schema/courses';
import { quizzes, quizQuestions } from '../../db/schema/progress';
import { eq, and, sql } from 'drizzle-orm';
import { NotFoundError, BadRequestError } from '../../lib/errors';

export class AdminCourseService {
  // --- COURSE CRUD ---

  static async createCourse(data: {
    title: string;
    category: string;
    level: 'beginner' | 'intermediate' | 'advanced';
    description: string;
    price?: number;
    originalPrice?: number;
    thumbnailUrl?: string;
    isPublished?: boolean;
    createdBy: string;
  }) {
    const [course] = await db
      .insert(courses)
      .values({
        title: data.title,
        category: data.category,
        level: data.level,
        description: data.description,
        price: data.price ?? 0,
        originalPrice: data.originalPrice ?? 0,
        thumbnailUrl: data.thumbnailUrl || null,
        isPublished: data.isPublished ?? false,
        createdBy: data.createdBy,
      })
      .returning();

    return course;
  }

  static async updateCourse(
    courseId: string,
    data: {
      title?: string;
      category?: string;
      level?: 'beginner' | 'intermediate' | 'advanced';
      description?: string;
      price?: number;
      originalPrice?: number;
      thumbnailUrl?: string;
      isPublished?: boolean;
    }
  ) {
    const [course] = await db
      .update(courses)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(courses.id, courseId))
      .returning();

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    return course;
  }

  static async deleteCourse(courseId: string) {
    const [course] = await db.delete(courses).where(eq(courses.id, courseId)).returning();
    if (!course) {
      throw new NotFoundError('Course not found');
    }
    return { success: true, message: 'Course deleted successfully' };
  }

  // --- MODULE CRUD ---

  static async createModule(
    courseId: string,
    data: { title: string; description?: string; order?: number }
  ) {
    // Check course exists
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    let moduleOrder = data.order;
    if (moduleOrder === undefined) {
      const result = await db
        .select({ maxOrder: sql<number>`COALESCE(MAX(${modules.order}), 0)` })
        .from(modules)
        .where(eq(modules.courseId, courseId));
      moduleOrder = result[0].maxOrder + 1;
    }

    const [newModule] = await db
      .insert(modules)
      .values({
        courseId,
        title: data.title,
        description: data.description || null,
        order: moduleOrder,
      })
      .returning();

    return newModule;
  }

  static async updateModule(
    moduleId: string,
    data: { title?: string; description?: string; order?: number }
  ) {
    const [updatedModule] = await db
      .update(modules)
      .set(data)
      .where(eq(modules.id, moduleId))
      .returning();

    if (!updatedModule) {
      throw new NotFoundError('Module not found');
    }

    return updatedModule;
  }

  static async deleteModule(moduleId: string) {
    const [deletedModule] = await db.delete(modules).where(eq(modules.id, moduleId)).returning();
    if (!deletedModule) {
      throw new NotFoundError('Module not found');
    }
    return { success: true, message: 'Module deleted successfully' };
  }

  // --- LESSON CRUD ---

  static async createLesson(
    moduleId: string,
    data: {
      title: string;
      type: 'video' | 'text' | 'coding' | 'quiz';
      duration?: number;
      contentBody?: string;
      mediaUrl?: string;
      order?: number;
    }
  ) {
    // Check module exists
    const [mod] = await db.select().from(modules).where(eq(modules.id, moduleId)).limit(1);
    if (!mod) {
      throw new NotFoundError('Module not found');
    }

    let lessonOrder = data.order;
    if (lessonOrder === undefined) {
      const result = await db
        .select({ maxOrder: sql<number>`COALESCE(MAX(${lessons.order}), 0)` })
        .from(lessons)
        .where(eq(lessons.moduleId, moduleId));
      lessonOrder = result[0].maxOrder + 1;
    }

    const [newLesson] = await db
      .insert(lessons)
      .values({
        moduleId,
        title: data.title,
        type: data.type,
        duration: data.duration ?? 0,
        contentBody: data.contentBody || null,
        mediaUrl: data.mediaUrl || null,
        order: lessonOrder,
      })
      .returning();

    return newLesson;
  }

  static async updateLesson(
    lessonId: string,
    data: {
      title?: string;
      type?: 'video' | 'text' | 'coding' | 'quiz';
      duration?: number;
      contentBody?: string;
      mediaUrl?: string;
      order?: number;
    }
  ) {
    const [updatedLesson] = await db
      .update(lessons)
      .set(data)
      .where(eq(lessons.id, lessonId))
      .returning();

    if (!updatedLesson) {
      throw new NotFoundError('Lesson not found');
    }

    return updatedLesson;
  }

  static async deleteLesson(lessonId: string) {
    const [deletedLesson] = await db.delete(lessons).where(eq(lessons.id, lessonId)).returning();
    if (!deletedLesson) {
      throw new NotFoundError('Lesson not found');
    }
    return { success: true, message: 'Lesson deleted successfully' };
  }

  // --- QUIZ CRUD ---

  static async getOrCreateQuiz(lessonId: string, data?: { title?: string; passingScore?: number; timeLimitSeconds?: number }) {
    // Check lesson exists and is type quiz
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
    if (!lesson) throw new NotFoundError('Lesson not found');
    if (lesson.type !== 'quiz') throw new BadRequestError('Lesson is not of type quiz');

    // Return existing quiz or create new one
    const existing = await db.query.quizzes.findFirst({
      where: eq(quizzes.lessonId, lessonId),
      with: { questions: true },
    });

    if (existing) {
      if (data) {
        const [updated] = await db
          .update(quizzes)
          .set({
            title: data.title !== undefined ? data.title : existing.title,
            passingScore: data.passingScore !== undefined ? data.passingScore : existing.passingScore,
            timeLimitSeconds: data.timeLimitSeconds !== undefined ? data.timeLimitSeconds : existing.timeLimitSeconds,
          })
          .where(eq(quizzes.id, existing.id))
          .returning();
        return { ...existing, ...updated };
      }
      return existing;
    }

    const [newQuiz] = await db
      .insert(quizzes)
      .values({
        lessonId,
        title: data?.title || lesson.title,
        passingScore: data?.passingScore ?? 60,
        timeLimitSeconds: data?.timeLimitSeconds ?? 0,
      })
      .returning();

    return { ...newQuiz, questions: [] };
  }

  static async updateQuiz(lessonId: string, data: { title?: string; passingScore?: number; timeLimitSeconds?: number }) {
    const quiz = await db.query.quizzes.findFirst({ where: eq(quizzes.lessonId, lessonId) });
    if (!quiz) throw new NotFoundError('Quiz not found for this lesson');

    const [updated] = await db
      .update(quizzes)
      .set(data)
      .where(eq(quizzes.id, quiz.id))
      .returning();

    return updated;
  }

  static async addQuestion(lessonId: string, data: {
    text: string;
    options: string[];
    correctAnswer: string;
    explanation?: string;
  }) {
    const quiz = await db.query.quizzes.findFirst({ where: eq(quizzes.lessonId, lessonId) });
    if (!quiz) throw new NotFoundError('Quiz not found — create quiz first');

    if (!data.options.includes(data.correctAnswer)) {
      throw new BadRequestError('correctAnswer must be one of the provided options');
    }

    const [question] = await db
      .insert(quizQuestions)
      .values({
        quizId: quiz.id,
        text: data.text,
        options: data.options,
        correctAnswer: data.correctAnswer,
        explanation: data.explanation || null,
      })
      .returning();

    return question;
  }

  static async updateQuestion(questionId: string, data: {
    text?: string;
    options?: string[];
    correctAnswer?: string;
    explanation?: string;
  }) {
    // Validate correctAnswer is in options if both provided
    if (data.options && data.correctAnswer && !data.options.includes(data.correctAnswer)) {
      throw new BadRequestError('correctAnswer must be one of the provided options');
    }

    const [updated] = await db
      .update(quizQuestions)
      .set(data)
      .where(eq(quizQuestions.id, questionId))
      .returning();

    if (!updated) throw new NotFoundError('Question not found');
    return updated;
  }

  static async deleteQuestion(questionId: string) {
    const [deleted] = await db.delete(quizQuestions).where(eq(quizQuestions.id, questionId)).returning();
    if (!deleted) throw new NotFoundError('Question not found');
    return { success: true, message: 'Question deleted successfully' };
  }

  static async getQuizWithQuestions(lessonId: string) {
    const quiz = await db.query.quizzes.findFirst({
      where: eq(quizzes.lessonId, lessonId),
      with: { questions: true },
    });
    if (!quiz) return null;
    return quiz;
  }
}
