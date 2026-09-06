CREATE TABLE `chat_settings` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`name` varchar(60) NOT NULL DEFAULT 'Jessica',
	`tagline` varchar(140),
	`opening_message` text,
	`greeting_title` varchar(80),
	`greeting_text` varchar(200),
	`greeting_mode` enum('first_visit','every_session','off') NOT NULL DEFAULT 'first_visit',
	`greeting_delay` int NOT NULL DEFAULT 4,
	`suggestions` json,
	`persona` text,
	`max_turns` int NOT NULL DEFAULT 12,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chat_settings_id` PRIMARY KEY(`id`)
);
