CREATE TABLE `mahjong_releases` (
	`version` integer PRIMARY KEY NOT NULL,
	`deployed_at` text NOT NULL,
	`activity` text NOT NULL,
	`commit_sha` text NOT NULL
);
