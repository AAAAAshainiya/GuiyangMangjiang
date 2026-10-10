CREATE TABLE `mahjong_backup_jobs` (
	`key` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`data` text NOT NULL,
	`updated` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `mahjong_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `backup_user` ON `mahjong_backup_jobs` (`user_id`,`updated`);--> statement-breakpoint
ALTER TABLE `mahjong_sessions` ADD `created_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `mahjong_sessions` ADD `last_seen` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `mahjong_sessions` ADD `device` text DEFAULT '旧设备' NOT NULL;--> statement-breakpoint
ALTER TABLE `mahjong_users` ADD `recovery_hash` text;