ALTER TABLE `course_lesson_progress` ADD `parts_done` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `course_lesson_progress` ADD `finished` integer DEFAULT 1 NOT NULL;
