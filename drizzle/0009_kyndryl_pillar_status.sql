CREATE TABLE `guided_discovery_pillar_status` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_id` text NOT NULL,
	`owner_email` text NOT NULL,
	`pillar_key` text NOT NULL,
	`catalog_version` text NOT NULL,
	`status` text DEFAULT 'not_started' NOT NULL,
	`current_session_id` text,
	`progress_percent` integer DEFAULT 0 NOT NULL,
	`coverage_percent` integer DEFAULT 0 NOT NULL,
	`confidence_percent` integer DEFAULT 0 NOT NULL,
	`answered_count` integer DEFAULT 0 NOT NULL,
	`required_count` integer DEFAULT 6 NOT NULL,
	`not_relevant_reason` text,
	`reviewed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`discovery_id`) REFERENCES `discoveries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`current_session_id`) REFERENCES `guided_discovery_sessions`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "guided_discovery_pillar_status_check" CHECK("guided_discovery_pillar_status"."status" in ('not_started','in_progress','reviewed_sufficient','reviewed_gaps','not_relevant')),
	CONSTRAINT "guided_discovery_pillar_progress_check" CHECK("guided_discovery_pillar_status"."progress_percent" between 0 and 100),
	CONSTRAINT "guided_discovery_pillar_coverage_check" CHECK("guided_discovery_pillar_status"."coverage_percent" between 0 and 100),
	CONSTRAINT "guided_discovery_pillar_confidence_check" CHECK("guided_discovery_pillar_status"."confidence_percent" between 0 and 100)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guided_discovery_pillar_status_account_pillar_idx` ON `guided_discovery_pillar_status` (`discovery_id`,`owner_email`,`pillar_key`,`catalog_version`);
--> statement-breakpoint
CREATE INDEX `guided_discovery_pillar_status_account_idx` ON `guided_discovery_pillar_status` (`discovery_id`,`updated_at`);
