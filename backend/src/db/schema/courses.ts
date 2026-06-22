import { pgTable, uuid, text, integer, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

// Enums
export const courseLevelEnum = pgEnum('course_level', ['beginner', 'intermediate', 'advanced']);
export const lessonTypeEnum = pgEnum('lesson_type', ['video', 'text', 'coding', 'quiz']);
export const enrollmentStatusEnum = pgEnum('enrollment_status', ['active', 'completed', 'dropped']);

// Courses Table
export const courses = pgTable('courses', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull(), // 'python', 'machine_learning', 'generative_ai', etc.
  level: courseLevelEnum('level').default('beginner').notNull(),
  description: text('description').notNull(),
  price: integer('price').default(0).notNull(), // 0 for free
  originalPrice: integer('original_price').default(0).notNull(), // for showing discount
  thumbnailUrl: text('thumbnail_url'),
  isPublished: boolean('is_published').default(false).notNull(),
  createdBy: uuid('created_by')
    .references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Modules Table
export const modules = pgTable('modules', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id')
    .references(() => courses.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  description: text('description'),
  order: integer('order').notNull(), // Ordering of modules in course
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Lessons Table
export const lessons = pgTable('lessons', {
  id: uuid('id').defaultRandom().primaryKey(),
  moduleId: uuid('module_id')
    .references(() => modules.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  type: lessonTypeEnum('type').default('text').notNull(), // text, video, coding, quiz
  duration: integer('duration').default(0).notNull(), // in minutes
  contentBody: text('content_body'), // Markdown/HTML body for text lessons
  mediaUrl: text('media_url'), // Video URL or external media
  order: integer('order').notNull(), // Ordering of lessons in module
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Course Enrollments Table
export const courseEnrollments = pgTable('course_enrollments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  courseId: uuid('course_id')
    .references(() => courses.id, { onDelete: 'cascade' })
    .notNull(),
  status: enrollmentStatusEnum('status').default('active').notNull(),
  enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
});

// Cart Items Table
export const cartItems = pgTable('cart_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  courseId: uuid('course_id')
    .references(() => courses.id, { onDelete: 'cascade' })
    .notNull(),
  addedAt: timestamp('added_at').defaultNow().notNull(),
});

// Relations
export const coursesRelations = relations(courses, ({ one, many }) => ({
  creator: one(users, {
    fields: [courses.createdBy],
    references: [users.id],
  }),
  modules: many(modules),
  enrollments: many(courseEnrollments),
  cartItems: many(cartItems),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  course: one(courses, {
    fields: [modules.courseId],
    references: [courses.id],
  }),
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one }) => ({
  module: one(modules, {
    fields: [lessons.moduleId],
    references: [modules.id],
  }),
}));

export const courseEnrollmentsRelations = relations(courseEnrollments, ({ one }) => ({
  user: one(users, {
    fields: [courseEnrollments.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [courseEnrollments.courseId],
    references: [courses.id],
  }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [cartItems.courseId],
    references: [courses.id],
  }),
}));
