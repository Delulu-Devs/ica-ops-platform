// Database schema for ICA Operations Platform
// Using Drizzle ORM with PostgreSQL

import { relations } from 'drizzle-orm';
import {
  boolean,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// ============ ENUMS ============

export const roleEnum = pgEnum('role', ['ADMIN', 'COACH', 'CUSTOMER']);

export const studentTypeEnum = pgEnum('student_type', ['1-1', 'GROUP']);

export const studentStatusEnum = pgEnum('student_status', ['ACTIVE', 'PAUSED', 'CANCELLED']);

export const demoStatusEnum = pgEnum('demo_status', [
  'BOOKED',
  'ATTENDED',
  'NO_SHOW',
  'RESCHEDULED',
  'CANCELLED',
  'INTERESTED',
  'NOT_INTERESTED',
  'PAYMENT_PENDING',
  'CONVERTED',
  'DROPPED',
]);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'ACTIVE',
  'PAST_DUE',
  'SUSPENDED',
  'CANCELLED',
]);

// ============ TABLES ============

// Account (Authentication Only)
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash'),
  authProvider: varchar('auth_provider', { length: 50 }),
  role: roleEnum('role').notNull().default('CUSTOMER'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Coach Profile
export const coaches = pgTable('coaches', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .references(() => accounts.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  name: varchar('name', { length: 255 }).notNull(),
  bio: text('bio'),
  rating: integer('rating'),
  specializations: text('specializations').array(),
  availability: text('availability'), // JSON string for availability slots
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Batch
export const batches = pgTable(
  'batches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    coachId: uuid('coach_id')
      .references(() => coaches.id, { onDelete: 'set null' })
      .notNull(),
    level: varchar('level', { length: 50 }),
    timezone: varchar('timezone', { length: 50 }),
    schedule: text('schedule'), // JSON for recurring schedule
    maxStudents: integer('max_students').default(10),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('idx_batches_coach').on(table.coachId)]
);

// Student (Primary Business Object)
export const students = pgTable(
  'students',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .references(() => accounts.id, { onDelete: 'cascade' })
      .notNull(),
    studentName: varchar('student_name', { length: 255 }).notNull(),
    studentAge: integer('student_age'),
    parentName: varchar('parent_name', { length: 255 }).notNull(),
    parentEmail: varchar('parent_email', { length: 255 }).notNull(),
    timezone: varchar('timezone', { length: 50 }),
    country: varchar('country', { length: 100 }),
    studentType: studentTypeEnum('student_type').notNull(),
    level: varchar('level', { length: 50 }),
    chessUsernames: text('chess_usernames'), // JSON for platform usernames
    rating: integer('rating'),
    assignedCoachId: uuid('assigned_coach_id').references(() => coaches.id, {
      onDelete: 'set null',
    }),
    assignedBatchId: uuid('assigned_batch_id').references(() => batches.id, {
      onDelete: 'set null',
    }),
    status: studentStatusEnum('status').default('ACTIVE').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_students_coach').on(table.assignedCoachId),
    index('idx_students_batch').on(table.assignedBatchId),
    index('idx_students_status').on(table.status),
  ]
);

// Demo (Analytics Backbone)
export const demos = pgTable(
  'demos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentName: varchar('student_name', { length: 255 }).notNull(),
    parentName: varchar('parent_name', { length: 255 }).notNull(),
    parentEmail: varchar('parent_email', { length: 255 }).notNull(),
    timezone: varchar('timezone', { length: 50 }),
    scheduledStart: timestamp('scheduled_start').notNull(),
    scheduledEnd: timestamp('scheduled_end').notNull(),
    coachId: uuid('coach_id').references(() => coaches.id, {
      onDelete: 'set null',
    }),
    adminId: uuid('admin_id').references(() => accounts.id, {
      onDelete: 'set null',
    }),
    meetingLink: varchar('meeting_link', { length: 500 }),
    status: demoStatusEnum('status').default('BOOKED').notNull(),
    recommendedStudentType: studentTypeEnum('recommended_student_type'),
    recommendedLevel: varchar('recommended_level', { length: 50 }),
    adminNotes: text('admin_notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_demos_status').on(table.status),
    index('idx_demos_scheduled').on(table.scheduledStart),
    index('idx_demos_coach').on(table.coachId),
  ]
);

// Plans
export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('INR'),
  billingCycle: varchar('billing_cycle', { length: 20 }).notNull(), // monthly, quarterly, yearly
  studentType: studentTypeEnum('student_type').notNull(),
  features: text('features').array(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Subscriptions
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .references(() => accounts.id, { onDelete: 'cascade' })
      .notNull(),
    planId: uuid('plan_id')
      .references(() => plans.id, { onDelete: 'restrict' })
      .notNull(),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    billingCycle: varchar('billing_cycle', { length: 20 }).notNull(),
    status: subscriptionStatusEnum('status').default('ACTIVE').notNull(),
    startedAt: timestamp('started_at').notNull(),
    nextDueAt: timestamp('next_due_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_subscriptions_account').on(table.accountId),
    index('idx_subscriptions_status').on(table.status),
  ]
);

// Chat Messages
export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roomId: varchar('room_id', { length: 255 }).notNull(),
    senderId: uuid('sender_id')
      .references(() => accounts.id, { onDelete: 'cascade' })
      .notNull(),
    content: text('content').notNull(),
    messageType: varchar('message_type', { length: 20 }).default('text'), // text, file, system
    fileUrl: varchar('file_url', { length: 500 }),
    isRead: boolean('is_read').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('idx_chat_room').on(table.roomId, table.createdAt)]
);

// Chat Room Members
export const chatRoomMembers = pgTable(
  'chat_room_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roomId: varchar('room_id', { length: 255 }).notNull(),
    accountId: uuid('account_id')
      .references(() => accounts.id, { onDelete: 'cascade' })
      .notNull(),
    role: varchar('role', { length: 20 }), // admin, coach, parent
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => [index('idx_chat_room_members_room').on(table.roomId)]
);

// Refresh Tokens for JWT
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .references(() => accounts.id, { onDelete: 'cascade' })
      .notNull(),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('idx_refresh_tokens_account').on(table.accountId)]
);

// Resources / Lesson Materials
export const resources = pgTable('resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  fileUrl: varchar('file_url', { length: 500 }).notNull(),
  fileType: varchar('file_type', { length: 50 }).notNull(), // pdf, pgn, image
  coachId: uuid('coach_id')
    .references(() => coaches.id, { onDelete: 'cascade' })
    .notNull(),
  batchId: uuid('batch_id').references(() => batches.id, {
    onDelete: 'set null',
  }), // Optional: assign to specific batch
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============ RELATIONS ============

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  coach: one(coaches, {
    fields: [accounts.id],
    references: [coaches.accountId],
  }),
  students: many(students),
  subscriptions: many(subscriptions),
  chatMessages: many(chatMessages),
  chatRoomMemberships: many(chatRoomMembers),
  refreshTokens: many(refreshTokens),
}));

export const coachesRelations = relations(coaches, ({ one, many }) => ({
  account: one(accounts, {
    fields: [coaches.accountId],
    references: [accounts.id],
  }),
  batches: many(batches),
  students: many(students),
  demos: many(demos),
  resources: many(resources),
}));

export const batchesRelations = relations(batches, ({ one, many }) => ({
  coach: one(coaches, {
    fields: [batches.coachId],
    references: [coaches.id],
  }),
  students: many(students),
  resources: many(resources),
}));

export const studentsRelations = relations(students, ({ one }) => ({
  account: one(accounts, {
    fields: [students.accountId],
    references: [accounts.id],
  }),
  coach: one(coaches, {
    fields: [students.assignedCoachId],
    references: [coaches.id],
  }),
  batch: one(batches, {
    fields: [students.assignedBatchId],
    references: [batches.id],
  }),
}));

export const demosRelations = relations(demos, ({ one }) => ({
  coach: one(coaches, {
    fields: [demos.coachId],
    references: [coaches.id],
  }),
  admin: one(accounts, {
    fields: [demos.adminId],
    references: [accounts.id],
  }),
}));

export const plansRelations = relations(plans, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  account: one(accounts, {
    fields: [subscriptions.accountId],
    references: [accounts.id],
  }),
  plan: one(plans, {
    fields: [subscriptions.planId],
    references: [plans.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  sender: one(accounts, {
    fields: [chatMessages.senderId],
    references: [accounts.id],
  }),
}));

export const chatRoomMembersRelations = relations(chatRoomMembers, ({ one }) => ({
  account: one(accounts, {
    fields: [chatRoomMembers.accountId],
    references: [accounts.id],
  }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  account: one(accounts, {
    fields: [refreshTokens.accountId],
    references: [accounts.id],
  }),
}));

export const resourcesRelations = relations(resources, ({ one }) => ({
  coach: one(coaches, {
    fields: [resources.coachId],
    references: [coaches.id],
  }),
  batch: one(batches, {
    fields: [resources.batchId],
    references: [batches.id],
  }),
}));

// ============ TYPE EXPORTS ============

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Coach = typeof coaches.$inferSelect;
export type NewCoach = typeof coaches.$inferInsert;

export type Batch = typeof batches.$inferSelect;
export type NewBatch = typeof batches.$inferInsert;

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;

export type Demo = typeof demos.$inferSelect;
export type NewDemo = typeof demos.$inferInsert;

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

export type ChatRoomMember = typeof chatRoomMembers.$inferSelect;
export type NewChatRoomMember = typeof chatRoomMembers.$inferInsert;

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;

export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;

// Role type for use in the app
export type Role = 'ADMIN' | 'COACH' | 'CUSTOMER';
export type StudentType = '1-1' | 'GROUP';
export type StudentStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';
export type DemoStatus =
  | 'BOOKED'
  | 'ATTENDED'
  | 'NO_SHOW'
  | 'RESCHEDULED'
  | 'CANCELLED'
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'PAYMENT_PENDING'
  | 'CONVERTED'
  | 'DROPPED';
export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED';
