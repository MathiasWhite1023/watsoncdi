CREATE TABLE `account_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_id` text NOT NULL,
	`stakeholder_id` text,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`rationale` text NOT NULL,
	`next_step` text NOT NULL,
	`impact` integer NOT NULL,
	`urgency` integer NOT NULL,
	`confidence` integer NOT NULL,
	`maturity` integer NOT NULL,
	`priority_score` integer NOT NULL,
	`status` text NOT NULL,
	`due_at` text,
	`evidence_json` text NOT NULL,
	`dedupe_key` text NOT NULL,
	`evidence_fingerprint` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `account_chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`citations_json` text NOT NULL,
	`ai_status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `account_entities` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`status` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text,
	`confidence` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `account_events` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text,
	`evidence_status` text NOT NULL,
	`confidence` integer NOT NULL,
	`occurred_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `account_memory` (
	`discovery_id` text PRIMARY KEY NOT NULL,
	`executive_summary` text NOT NULL,
	`known_json` text NOT NULL,
	`assumptions_json` text NOT NULL,
	`gaps_json` text NOT NULL,
	`changes_json` text NOT NULL,
	`ai_status` text NOT NULL,
	`version` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `account_plans` (
	`discovery_id` text PRIMARY KEY NOT NULL,
	`priorities_json` text NOT NULL,
	`initiatives_json` text NOT NULL,
	`objectives_json` text NOT NULL,
	`risks_json` text NOT NULL,
	`ecosystem_json` text NOT NULL,
	`relationship_json` text NOT NULL,
	`plan_30_json` text NOT NULL,
	`plan_60_json` text NOT NULL,
	`plan_90_json` text NOT NULL,
	`approval_status` text NOT NULL,
	`suggestion_json` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ai_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_id` text NOT NULL,
	`agent` text NOT NULL,
	`provider` text NOT NULL,
	`status` text NOT NULL,
	`confidence` integer NOT NULL,
	`source_ids_json` text NOT NULL,
	`validated` integer NOT NULL,
	`detail` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `document_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`discovery_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`content` text NOT NULL,
	`page` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_id` text NOT NULL,
	`name` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`r2_key` text NOT NULL,
	`status` text NOT NULL,
	`summary` text NOT NULL,
	`sha256` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `opportunity_hypotheses` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_id` text NOT NULL,
	`capability_key` text NOT NULL,
	`title` text NOT NULL,
	`problem` text NOT NULL,
	`products_json` text NOT NULL,
	`stakeholder_ids_json` text NOT NULL,
	`evidence_json` text NOT NULL,
	`gaps_json` text NOT NULL,
	`confidence` integer NOT NULL,
	`stage` text NOT NULL,
	`next_step` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `audit_events` ADD `scheduled_at` text;--> statement-breakpoint
ALTER TABLE `audit_events` ADD `attendees_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `audit_events` ADD `objective` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `audit_events` ADD `preparation_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `audit_events` ADD `meeting_status` text DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE `discoveries` ADD `owner_email` text;--> statement-breakpoint
ALTER TABLE `discoveries` ADD `visibility` text DEFAULT 'demo' NOT NULL;--> statement-breakpoint
ALTER TABLE `discoveries` ADD `last_analyzed_at` text;