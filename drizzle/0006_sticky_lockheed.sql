CREATE TABLE `ai_usage` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`surface` enum('chat','demo','other') NOT NULL DEFAULT 'other',
	`provider` varchar(24) NOT NULL,
	`model` varchar(120),
	`input_tokens` int NOT NULL DEFAULT 0,
	`output_tokens` int NOT NULL DEFAULT 0,
	CONSTRAINT `ai_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `ai_usage_created_idx` ON `ai_usage` (`created_at`);--> statement-breakpoint
CREATE INDEX `ai_usage_surface_idx` ON `ai_usage` (`surface`,`created_at`);