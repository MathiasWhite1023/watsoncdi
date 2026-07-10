CREATE TABLE `audit_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`discovery_id` text NOT NULL,
	`type` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `discoveries` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_name` text NOT NULL,
	`industry` text NOT NULL,
	`company_size` text NOT NULL,
	`owner` text NOT NULL,
	`stage` text NOT NULL,
	`progress` integer NOT NULL,
	`priority` text NOT NULL,
	`challenge_summary` text NOT NULL,
	`answers_json` text NOT NULL,
	`scores_json` text NOT NULL,
	`recommendations_json` text NOT NULL,
	`next_engagement` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
