import { db } from '../../config/database';
import { courses, lessons, modules } from '../../db/schema/courses';
import { eq, or, like, and } from 'drizzle-orm';

export class SearchService {
  // Search courses and lessons matching a query string
  static async searchCatalog(query: string) {
    if (!query || query.trim().length === 0) {
      return { courses: [], lessons: [] };
    }

    const searchTerm = `%${query}%`;

    // 1. Search published courses
    const foundCourses = await db
      .select()
      .from(courses)
      .where(
        and(
          eq(courses.isPublished, true),
          or(
            like(courses.title, searchTerm),
            like(courses.description, searchTerm),
            like(courses.category, searchTerm)
          )
        )
      );

    // 2. Search lessons inside published courses
    const foundLessons = await db
      .select({
        id: lessons.id,
        title: lessons.title,
        type: lessons.type,
        duration: lessons.duration,
        courseId: modules.courseId,
        courseTitle: courses.title,
      })
      .from(lessons)
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .innerJoin(courses, eq(modules.courseId, courses.id))
      .where(
        and(
          eq(courses.isPublished, true),
          or(
            like(lessons.title, searchTerm),
            like(lessons.contentBody, searchTerm)
          )
        )
      );

    return {
      courses: foundCourses,
      lessons: foundLessons,
    };
  }
}
