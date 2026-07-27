CREATE TABLE `agent_insights` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`message` text NOT NULL,
	`highlights` text DEFAULT '[]' NOT NULL,
	`gaps` text DEFAULT '[]' NOT NULL,
	`generated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_agent_insights_user` ON `agent_insights` (`user_id`,`generated_at`);
