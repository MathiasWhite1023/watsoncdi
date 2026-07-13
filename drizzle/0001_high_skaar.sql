CREATE TABLE `account_maps` (
	`discovery_id` text PRIMARY KEY NOT NULL,
	`nodes_json` text NOT NULL,
	`edges_json` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `meetings` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_id` text NOT NULL,
	`title` text NOT NULL,
	`notes` text NOT NULL,
	`summary` text NOT NULL,
	`insights_json` text NOT NULL,
	`ai_status` text NOT NULL,
	`created_at` text NOT NULL
);
