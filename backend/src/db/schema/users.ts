import { pgTable, uuid, text, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const roleEnum = pgEnum('user_role', ['learner', 'instructor', 'content_admin', 'super_admin']);
export const statusEnum = pgEnum('user_status', ['active', 'inactive', 'suspended']);

// Users Table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'), // Nullable for OAuth-only users
  role: roleEnum('role').default('learner').notNull(),
  avatarUrl: text('avatar_url'),
  oauthProvider: text('oauth_provider'), // 'google', 'github', etc.
  oauthId: text('oauth_id'),
  status: statusEnum('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User Profiles Table
export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  bio: text('bio'),
  learningGoals: text('learning_goals'), // e.g. JSON string or comma-separated
  skillLevel: text('skill_level').default('beginner').notNull(), // beginner, intermediate, advanced
  notificationEnabled: boolean('notification_enabled').default(true).notNull(),
  darkMode: boolean('dark_mode').default(false).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Sessions Table (for refresh tokens)
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  refreshToken: text('refresh_token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  sessions: many(sessions),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));
