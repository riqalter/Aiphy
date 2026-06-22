import { pgTable, uuid, text, integer, timestamp, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'canceled', 'expired', 'past_due']);

export const subscriptionPlans = pgTable('subscription_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(), // e.g. 'Basic Learner', 'Pro Learner'
  price: integer('price').notNull(), // price in IDR
  features: jsonb('features').$type<string[]>().default([]).notNull(),
  aiLimit: integer('ai_limit').default(50).notNull(), // number of messages per day
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userSubscriptions = pgTable('user_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  planId: uuid('plan_id')
    .references(() => subscriptionPlans.id)
    .notNull(),
  status: subscriptionStatusEnum('status').default('active').notNull(),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  userSubscriptions: many(userSubscriptions),
}));

export const userSubscriptionsRelations = relations(userSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [userSubscriptions.userId],
    references: [users.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [userSubscriptions.planId],
    references: [subscriptionPlans.id],
  }),
}));
