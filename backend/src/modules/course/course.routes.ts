import { Elysia, t } from 'elysia';
import { requireAuth } from '../auth/auth.middleware';
import { CourseService } from './course.service';

export const courseRoutes = new Elysia({ prefix: '/api/courses' })
  // 1. Get Course Catalog (public)
  .get(
    '/',
    async ({ query }) => {
      const coursesList = await CourseService.getCourses(query);
      return {
        success: true,
        data: coursesList,
      };
    },
    {
      query: t.Object({
        category: t.Optional(t.String()),
        level: t.Optional(t.String()),
        search: t.Optional(t.String()),
      }),
    }
  )

  // 2. Get Course Detail (public)
  .get(
    '/:courseId',
    async ({ params }) => {
      const course = await CourseService.getCourseDetail(params.courseId);
      return {
        success: true,
        data: course,
      };
    },
    {
      params: t.Object({
        courseId: t.String(),
      }),
    }
  )

  // Auth Protected Routes
  .use(requireAuth)

  // 3. Get Enrolled Courses
  .get('/enrolled', async ({ user }) => {
    const enrolled = await CourseService.getEnrolledCourses(user!.id);
    return {
      success: true,
      data: enrolled,
    };
  })

  // 4. Get Recommended Courses
  .get('/recommended', async ({ user }) => {
    // Return all courses for recommendations (we can refine this later)
    const recommended = await CourseService.getCourses({});
    return {
      success: true,
      data: recommended,
    };
  })

  // 5. Enroll in Free Course
  .post(
    '/:courseId/enroll',
    async ({ user, params }) => {
      const enrollment = await CourseService.enrollFreeCourse(params.courseId, user!.id);
      return {
        success: true,
        message: 'Successfully enrolled in course',
        data: enrollment,
      };
    },
    {
      params: t.Object({
        courseId: t.String(),
      }),
    }
  )

  // 6. Get Lesson Content (verifying enrollment)
  .get(
    '/:courseId/lessons/:lessonId',
    async ({ user, params }) => {
      const lesson = await CourseService.getLessonContent(params.courseId, params.lessonId, user!.id);
      return {
        success: true,
        data: lesson,
      };
    },
    {
      params: t.Object({
        courseId: t.String(),
        lessonId: t.String(),
      }),
    }
  );
