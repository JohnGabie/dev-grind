CREATE TABLE `roadmaps` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `roadmap_courses` (
	`roadmap_id` text NOT NULL,
	`course_id` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`roadmap_id`, `course_id`),
	FOREIGN KEY (`roadmap_id`) REFERENCES `roadmaps`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_roadmaps_user` ON `roadmaps` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_roadmap_courses_course` ON `roadmap_courses` (`course_id`);
