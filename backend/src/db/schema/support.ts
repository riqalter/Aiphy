import { pgTable, uuid, text, integer, timestamp, boolean, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

// Enums
export const ticketStatusEnum = pgEnum('ticket_status', ['open', 'in_progress', 'resolved', 'closed']);

// Notifications Table
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  type: text('type').default('info').notNull(), // 'info', 'success', 'warning', 'streak', 'badge'
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// FAQs Table
export const faqs = pgTable('faqs', {
  id: uuid('id').defaultRandom().primaryKey(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  category: text('category').default('general').notNull(), // 'general', 'account', 'course', 'payment'
  order: integer('order').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Support Tickets Table
export const supportTickets = pgTable('support_tickets', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: ticketStatusEnum('status').default('open').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Partnership Inquiries Table (For Landing Page B2B Form)
export const partnershipInquiries = pgTable('partnership_inquiries', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  message: text('message').notNull(),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
});

// Content Audit Logs Table
export const contentAuditLogs = pgTable('content_audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  adminId: uuid('admin_id')
    .references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(), // 'create_course', 'delete_lesson', 'ban_user', etc.
  entityType: text('entity_type').notNull(), // 'course', 'lesson', 'user', etc.
  entityId: text('entity_id'),
  changes: jsonb('changes'), // Before/after state comparison
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one }) => ({
  user: one(users, {
    fields: [supportTickets.userId],
    references: [users.id],
  }),
}));

export const contentAuditLogsRelations = relations(contentAuditLogs, ({ one }) => ({
  admin: one(users, {
    fields: [contentAuditLogs.adminId],
    references: [users.id],
  }),
}));
