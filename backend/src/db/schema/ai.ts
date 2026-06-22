import { pgTable, uuid, text, integer, timestamp, numeric, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { courses } from './courses';

// Enums
export const chatRoleEnum = pgEnum('chat_role', ['user', 'assistant']);

// Chat Conversations Table
export const chatConversations = pgTable('chat_conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  courseId: uuid('course_id')
    .references(() => courses.id, { onDelete: 'set null' }), // Optional context
  title: text('title').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Chat Messages Table
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id')
    .references(() => chatConversations.id, { onDelete: 'cascade' })
    .notNull(),
  role: chatRoleEnum('role').notNull(),
  content: text('content').notNull(),
  tokensUsed: integer('tokens_used').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// AI Prompt Templates Table (for system prompts configurations)
export const aiPromptTemplates = pgTable('ai_prompt_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(), // e.g. 'tutor_simplifier', 'quiz_generator'
  systemPrompt: text('system_prompt').notNull(),
  contextTemplate: text('context_template'), // e.g. "Berikut adalah materi kursus: {context}"
  createdBy: uuid('created_by')
    .references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// AI Token Usage Log Table
export const aiTokenUsage = pgTable('ai_token_usage', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  model: text('model').notNull(),
  promptTokens: integer('prompt_tokens').default(0).notNull(),
  completionTokens: integer('completion_tokens').default(0).notNull(),
  estimatedCost: numeric('estimated_cost', { precision: 10, scale: 6 }).default('0.0').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const chatConversationsRelations = relations(chatConversations, ({ one, many }) => ({
  user: one(users, {
    fields: [chatConversations.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [chatConversations.courseId],
    references: [courses.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(chatConversations, {
    fields: [chatMessages.conversationId],
    references: [chatConversations.id],
  }),
}));

export const aiPromptTemplatesRelations = relations(aiPromptTemplates, ({ one }) => ({
  creator: one(users, {
    fields: [aiPromptTemplates.createdBy],
    references: [users.id],
  }),
}));

export const aiTokenUsageRelations = relations(aiTokenUsage, ({ one }) => ({
  user: one(users, {
    fields: [aiTokenUsage.userId],
    references: [users.id],
  }),
}));
