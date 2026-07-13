CREATE TABLE `stakeholders` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`area` text NOT NULL,
	`reports_to_id` text,
	`influence` text NOT NULL,
	`stance` text NOT NULL,
	`priorities_json` text NOT NULL,
	`notes` text NOT NULL,
	`source` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
