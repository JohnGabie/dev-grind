CREATE TABLE `book_prefs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`slug` text NOT NULL,
	`dark_mode` integer DEFAULT false NOT NULL,
	`view_mode` text DEFAULT 'single' NOT NULL,
	`last_page` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_book_prefs_user_slug` ON `book_prefs` (`user_id`,`slug`);--> statement-breakpoint
CREATE TABLE `books` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`author` text NOT NULL,
	`year` integer,
	`phase` integer,
	`content_type` text NOT NULL,
	`file_path` text NOT NULL,
	`cover_path` text,
	`text_path` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `books_slug_unique` ON `books` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_books_slug` ON `books` (`slug`);--> statement-breakpoint
CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`book_slug` text,
	`description` text,
	`modules` text DEFAULT '[]' NOT NULL,
	`is_complete` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `daily_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`date` text NOT NULL,
	`exercises_completed` integer DEFAULT 0 NOT NULL,
	`exercises_attempted` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_user_date` ON `daily_progress` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`difficulty` text NOT NULL,
	`phase` integer NOT NULL,
	`module` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`description` text NOT NULL,
	`rationale` text NOT NULL,
	`stub` text NOT NULL,
	`solution` text NOT NULL,
	`hints` text DEFAULT '[]' NOT NULL,
	`concepts` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`generated_by` text DEFAULT 'manual' NOT NULL,
	`book_reference` text,
	`user_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercises_slug_unique` ON `exercises` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_exercises_slug` ON `exercises` (`slug`);--> statement-breakpoint
CREATE TABLE `personal_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`name` text DEFAULT 'Claude Code' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`last_used_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `personal_tokens_token_hash_unique` ON `personal_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `store_items` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text NOT NULL,
	`category` text NOT NULL,
	`price_coins` integer DEFAULT 0 NOT NULL,
	`rarity` text DEFAULT 'common' NOT NULL,
	`item_data` text DEFAULT '{}' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`exercise_id` text NOT NULL,
	`code` text NOT NULL,
	`status` text NOT NULL,
	`test_results` text DEFAULT '[]' NOT NULL,
	`submitted_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`time_spent_seconds` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `test_cases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`exercise_id` text NOT NULL,
	`order` integer NOT NULL,
	`description` text NOT NULL,
	`input` text NOT NULL,
	`expected` text NOT NULL,
	`visible` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_inventory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`item_id` text NOT NULL,
	`purchased_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`equipped_slot` text,
	FOREIGN KEY (`item_id`) REFERENCES `store_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`baseline_done` integer DEFAULT false NOT NULL,
	`strengths` text DEFAULT '[]' NOT NULL,
	`gaps` text DEFAULT '[]' NOT NULL,
	`level` text DEFAULT '{}' NOT NULL,
	`style` text DEFAULT '{}' NOT NULL,
	`notes` text DEFAULT '[]' NOT NULL,
	`recommendations` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_profiles_user_id_unique` ON `user_profiles` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`avatar_url` text,
	`cover_url` text,
	`honor` integer DEFAULT 0 NOT NULL,
	`coins` integer DEFAULT 0 NOT NULL,
	`bio` text,
	`social_links` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`last_login` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);