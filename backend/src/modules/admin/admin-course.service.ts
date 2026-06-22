import { db } from '../../config/database';
import { courses, modules, lessons } from '../../db/schema/courses';
import { eq, and, sql } from 'drizzle-orm';
import { NotFoundError } from '../../lib/errors';

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
}
