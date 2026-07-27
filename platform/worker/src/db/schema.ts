import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ─── users ────────────────────────────────────────────────────────────────────
// id is the Google OAuth "sub" — a string like "1234567890"
export const users = sqliteTable('users', {
  id:           text('id').primaryKey(),
  email:        text('email').notNull().unique(),
  name:         text('name').notNull(),
  avatar_url:   text('avatar_url'),
  cover_url:    text('cover_url'),
  honor:        integer('honor').notNull().default(0),
  coins:        integer('coins').notNull().default(0),
  bio:          text('bio'),
  social_links: text('social_links').notNull().default('{}'),
  created_at:   text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  last_login:   text('last_login').notNull().default(sql`(CURRENT_TIMESTAMP)`),
})

// ─── exercises ────────────────────────────────────────────────────────────────
export const exercises = sqliteTable('exercises', {
  id:             text('id').primaryKey(),
  title:          text('title').notNull(),
  slug:           text('slug').notNull().unique(),
  difficulty:     text('difficulty').notNull(),
  phase:          integer('phase').notNull(),
  module:         text('module').notNull(),
  tags:           text('tags').notNull().default('[]'),
  description:    text('description').notNull(),
  rationale:      text('rationale').notNull(),
  stub:           text('stub').notNull(),
  solution:       text('solution').notNull(),
  hints:          text('hints').notNull().default('[]'),
  concepts:       text('concepts').notNull().default('[]'),
  created_at:     text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  generated_by:   text('generated_by').notNull().default('manual'),
  book_reference: text('book_reference'),
  user_id:        text('user_id').references(() => users.id),
}, (t) => [
  index('idx_exercises_slug').on(t.slug),
])

// ─── test_cases ───────────────────────────────────────────────────────────────
export const testCases = sqliteTable('test_cases', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  exercise_id: text('exercise_id').notNull().references(() => exercises.id),
  order:       integer('order').notNull(),
  description: text('description').notNull(),
  input:       text('input').notNull(),
  expected:    text('expected').notNull(),
  visible:     integer('visible', { mode: 'boolean' }).notNull().default(true),
})

// ─── submissions ──────────────────────────────────────────────────────────────
export const submissions = sqliteTable('submissions', {
  id:                 text('id').primaryKey(),
  user_id:            text('user_id').references(() => users.id),
  exercise_id:        text('exercise_id').notNull().references(() => exercises.id),
  code:               text('code').notNull(),
  status:             text('status').notNull(), // 'passed' | 'failed' | 'partial'
  test_results:       text('test_results').notNull().default('[]'),
  submitted_at:       text('submitted_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  time_spent_seconds: integer('time_spent_seconds'),
})

// ─── daily_progress ───────────────────────────────────────────────────────────
export const dailyProgress = sqliteTable('daily_progress', {
  id:                  integer('id').primaryKey({ autoIncrement: true }),
  user_id:             text('user_id'),
  date:                text('date').notNull(),
  exercises_completed: integer('exercises_completed').notNull().default(0),
  exercises_attempted: integer('exercises_attempted').notNull().default(0),
}, (t) => [
  uniqueIndex('uq_user_date').on(t.user_id, t.date),
])

// ─── books ────────────────────────────────────────────────────────────────────
export const books = sqliteTable('books', {
  id:           text('id').primaryKey(),
  user_id:      text('user_id').references(() => users.id),
  slug:         text('slug').notNull().unique(),
  title:        text('title').notNull(),
  author:       text('author').notNull(),
  year:         integer('year'),
  phase:        integer('phase'),
  content_type: text('content_type').notNull(), // 'markdown' | 'pdf'
  file_path:        text('file_path').notNull(),
  cover_path:       text('cover_path'),
  text_path:        text('text_path'),
  file_size_bytes:  integer('file_size_bytes').notNull().default(0),
  created_at:       text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
}, (t) => [
  index('idx_books_slug').on(t.slug),
])

// ─── book_prefs ───────────────────────────────────────────────────────────────
export const bookPrefs = sqliteTable('book_prefs', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  user_id:   text('user_id').notNull(),
  slug:      text('slug').notNull(),
  dark_mode: integer('dark_mode', { mode: 'boolean' }).notNull().default(false),
  view_mode: text('view_mode').notNull().default('single'),
  last_page: integer('last_page').notNull().default(1),
}, (t) => [
  uniqueIndex('uq_book_prefs_user_slug').on(t.user_id, t.slug),
])

// ─── courses ──────────────────────────────────────────────────────────────────
export const courses = sqliteTable('courses', {
  id:          text('id').primaryKey(),
  user_id:     text('user_id').notNull().references(() => users.id),
  title:       text('title').notNull(),
  book_slug:   text('book_slug'),
  description: text('description'),
  modules:     text('modules').notNull().default('[]'),
  is_complete: integer('is_complete', { mode: 'boolean' }).notNull().default(false),
  created_at:  text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
})

// ─── user_profiles ────────────────────────────────────────────────────────────
export const userProfiles = sqliteTable('user_profiles', {
  id:              text('id').primaryKey(),
  user_id:         text('user_id').notNull().unique().references(() => users.id),
  baseline_done:   integer('baseline_done', { mode: 'boolean' }).notNull().default(false),
  strengths:       text('strengths').notNull().default('[]'),
  gaps:            text('gaps').notNull().default('[]'),
  level:           text('level').notNull().default('{}'),
  style:           text('style').notNull().default('{}'),
  notes:           text('notes').notNull().default('[]'),
  recommendations: text('recommendations').notNull().default('[]'),
  created_at:      text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updated_at:      text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
})

// ─── store_items ──────────────────────────────────────────────────────────────
export const storeItems = sqliteTable('store_items', {
  id:          text('id').primaryKey(),
  name:        text('name').notNull(),
  description: text('description'),
  type:        text('type').notNull(),
  category:    text('category').notNull(),
  price_coins: integer('price_coins').notNull().default(0),
  rarity:      text('rarity').notNull().default('common'),
  item_data:   text('item_data').notNull().default('{}'),
  is_active:   integer('is_active', { mode: 'boolean' }).notNull().default(true),
})

// ─── user_inventory ───────────────────────────────────────────────────────────
export const userInventory = sqliteTable('user_inventory', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  user_id:       text('user_id').notNull(),
  item_id:       text('item_id').notNull().references(() => storeItems.id),
  purchased_at:  text('purchased_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  equipped_slot: text('equipped_slot'),
})

// ─── agent_insights ───────────────────────────────────────────────────────────
// Written by the daily agent through MCP, read by the dashboard.
export const agentInsights = sqliteTable('agent_insights', {
  id:           text('id').primaryKey(),
  user_id:      text('user_id').notNull().references(() => users.id),
  message:      text('message').notNull(),
  highlights:   text('highlights').notNull().default('[]'),
  gaps:         text('gaps').notNull().default('[]'),
  generated_at: text('generated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
})

// ─── personal_tokens ──────────────────────────────────────────────────────────
export const personalTokens = sqliteTable('personal_tokens', {
  id:           text('id').primaryKey(),
  user_id:      text('user_id').notNull(),
  token_hash:   text('token_hash').notNull().unique(),
  name:         text('name').notNull().default('Claude Code'),
  created_at:   text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  last_used_at: text('last_used_at'),
})
