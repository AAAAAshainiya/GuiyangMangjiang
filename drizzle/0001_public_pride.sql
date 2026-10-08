CREATE TABLE `mahjong_chat` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`sender` text NOT NULL,
	`client_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`content` text NOT NULL,
	`at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `chat_room_time` ON `mahjong_chat` (`code`,`at`);--> statement-breakpoint
CREATE INDEX `chat_sender_time` ON `mahjong_chat` (`code`,`sender`,`at`);--> statement-breakpoint
CREATE UNIQUE INDEX `chat_retry` ON `mahjong_chat` (`code`,`sender`,`client_id`);