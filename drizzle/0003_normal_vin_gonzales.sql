CREATE TABLE `mahjong_auth_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mahjong_avatars` (
	`key` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `mahjong_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mahjong_account_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`game_id` text NOT NULL,
	`mode` text NOT NULL,
	`room_code` text NOT NULL,
	`round` integer NOT NULL,
	`at` integer NOT NULL,
	`delta` integer NOT NULL,
	`bill` text NOT NULL,
	`has_replay` integer DEFAULT 0 NOT NULL,
	`favorite` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `mahjong_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `records_user_game` ON `mahjong_account_records` (`user_id`,`game_id`);--> statement-breakpoint
CREATE INDEX `records_user_time` ON `mahjong_account_records` (`user_id`,`at`);--> statement-breakpoint
CREATE INDEX `records_replay_refs` ON `mahjong_account_records` (`game_id`,`has_replay`);--> statement-breakpoint
CREATE TABLE `mahjong_replays` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mahjong_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `mahjong_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sessions_user` ON `mahjong_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expiry` ON `mahjong_sessions` (`expires`);--> statement-breakpoint
CREATE TABLE `mahjong_users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`salt` text NOT NULL,
	`nickname` text NOT NULL,
	`avatar` text NOT NULL,
	`theme` text NOT NULL,
	`rules` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username` ON `mahjong_users` (`username`);