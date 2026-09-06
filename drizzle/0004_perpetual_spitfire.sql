CREATE TABLE `chat_sessions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`session_key` varchar(64) NOT NULL,
	`ip` varchar(64),
	`user_agent` varchar(256),
	`source_path` varchar(200),
	`messages` json,
	`turns` int NOT NULL DEFAULT 0,
	`lead_id` bigint unsigned,
	`intent` enum('none','callback','meeting') NOT NULL DEFAULT 'none',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chat_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `chat_sessions_key` UNIQUE(`session_key`)
);
--> statement-breakpoint
CREATE TABLE `kb_entries` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`question` varchar(300) NOT NULL,
	`answer` text NOT NULL,
	`category` varchar(80),
	`keywords` varchar(400),
	`sort_order` int NOT NULL DEFAULT 0,
	`published` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kb_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `chat_sessions_created_idx` ON `chat_sessions` (`created_at`);--> statement-breakpoint
CREATE INDEX `kb_pub_idx` ON `kb_entries` (`published`,`sort_order`);