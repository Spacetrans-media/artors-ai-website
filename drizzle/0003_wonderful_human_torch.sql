CREATE TABLE `demo_crawls` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`domain` varchar(255) NOT NULL,
	`url` varchar(500) NOT NULL,
	`title` varchar(300),
	`content` text,
	`pages` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `demo_crawls_id` PRIMARY KEY(`id`),
	CONSTRAINT `demo_crawls_domain_key` UNIQUE(`domain`)
);
--> statement-breakpoint
CREATE TABLE `demo_sessions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`domain` varchar(255) NOT NULL,
	`ip` varchar(64) NOT NULL,
	`messages` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `demo_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `demo_sessions_ip_idx` ON `demo_sessions` (`ip`,`created_at`);