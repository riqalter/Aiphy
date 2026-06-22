import { db } from '../../config/database';
import { courses, modules, lessons, courseEnrollments } from '../../db/schema/courses';
import { eq, and, like, or } from 'drizzle-orm';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../lib/errors';

export class CourseService {
  // List all published courses with optional filters
  static async getCourses(filters: { category?: string; level?: any; search?: string }) {
    let whereClause = eq(courses.isPublished, true);

    const conditions = [eq(courses.isPublished, true)];

    if (filters.category) {
      conditions.push(eq(courses.category, filters.category));
    }
    if (filters.level) {
      conditions.push(eq(courses.level, filters.level));
    }
    if (filters.search) {
      conditions.push(
        or(
          like(courses.title, `%${filters.search}%`),
          like(courses.description, `%${filters.search}%`)
        )!
      );
    }

    const finalConditions = conditions.length > 1 ? and(...conditions) : conditions[0];

    return await db.select().from(courses).where(finalConditions);
  }

  // Get full course detail (syllabus)
  static async getCourseDetail(courseId: string) {
    const course = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
      with: {
        modules: {
          orderBy: (modules, { asc }) => [asc(modules.order)],
          with: {
            lessons: {
              columns: {
                id: true,
                title: true,
                type: true,
                duration: true,
                order: true,
              },
              orderBy: (lessons, { asc }) => [asc(lessons.order)],
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    return course;
  }

  // Get courses the user is enrolled in
  static async getEnrolledCourses(userId: string) {
    const enrollments = await db
      .select({
        id: courses.id,
        title: courses.title,
        category: courses.category,
        level: courses.level,
        thumbnailUrl: courses.thumbnailUrl,
        enrolledAt: courseEnrollments.enrolledAt,
        status: courseEnrollments.status,
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .where(eq(courseEnrollments.userId, userId));

    return enrollments;
  }

  // Enroll in a free course
  static async enrollFreeCourse(courseId: string, userId: string) {
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (course.price > 0) {
      throw new BadRequestError('This course is paid. Please purchase it via check out.');
    }

    // Check if already enrolled
    const [existingEnrollment] = await db
      .select()
      .from(courseEnrollments)
      .where(and(eq(courseEnrollments.userId, userId), eq(courseEnrollments.courseId, courseId)))
      .limit(1);

    if (existingEnrollment) {
      return existingEnrollment;
    }

    const [enrollment] = await db
      .insert(courseEnrollments)
      .values({
        userId,
        courseId,
        status: 'active',
      })
      .returning();

    return enrollment;
  }

  // Get details of a specific lesson, verifying access rights
  static async getLessonContent(courseId: string, lessonId: string, userId: string) {
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    // Verify user is enrolled (or course is free)
    if (course.price > 0) {
      const [enrollment] = await db
        .select()
        .from(courseEnrollments)
        .where(and(eq(courseEnrollments.userId, userId), eq(courseEnrollments.courseId, courseId)))
        .limit(1);

      if (!enrollment) {
        throw new ForbiddenError('You are not enrolled in this course.');
      }
    }

    // Fetch the lesson and join with modules to ensure it belongs to the course
    const results = await db
      .select({
        lesson: lessons,
        courseId: modules.courseId,
      })
      .from(lessons)
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .where(eq(lessons.id, lessonId))
      .limit(1);

    if (results.length === 0 || results[0].courseId !== courseId) {
      throw new NotFoundError('Lesson not found in this course');
    }

    return results[0].lesson;
  }
}
