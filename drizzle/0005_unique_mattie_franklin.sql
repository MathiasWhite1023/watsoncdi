CREATE TABLE `account_embeddings` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_id` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`chunk_ordinal` integer DEFAULT 0 NOT NULL,
	`content_hash` text NOT NULL,
	`model` text NOT NULL,
	`dimensions` integer DEFAULT 768 NOT NULL,
	`vector_json` text NOT NULL,
	`content_preview` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`discovery_id`) REFERENCES `discoveries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_embeddings_discovery_idx` ON `account_embeddings` (`discovery_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `account_embeddings_source_idx` ON `account_embeddings` (`discovery_id`,`source_type`,`source_id`,`chunk_ordinal`,`model`);--> statement-breakpoint
CREATE INDEX `account_embeddings_content_hash_idx` ON `account_embeddings` (`content_hash`);--> statement-breakpoint
CREATE TABLE `account_graph_layouts` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_id` text NOT NULL,
	`mode` text NOT NULL,
	`nodes_json` text DEFAULT '[]' NOT NULL,
	`viewport_json` text DEFAULT '{}' NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`discovery_id`) REFERENCES `discoveries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_graph_layouts_account_mode_idx` ON `account_graph_layouts` (`discovery_id`,`mode`);--> statement-breakpoint
CREATE TABLE `account_relationships` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_id` text NOT NULL,
	`source_stakeholder_id` text NOT NULL,
	`target_stakeholder_id` text NOT NULL,
	`relation_type` text NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`confidence` integer DEFAULT 50 NOT NULL,
	`evidence_json` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`discovery_id`) REFERENCES `discoveries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_stakeholder_id`) REFERENCES `stakeholders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_stakeholder_id`) REFERENCES `stakeholders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_relationships_discovery_idx` ON `account_relationships` (`discovery_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `account_relationships_relation_idx` ON `account_relationships` (`discovery_id`,`source_stakeholder_id`,`target_stakeholder_id`,`relation_type`);--> statement-breakpoint
CREATE TABLE `account_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_id` text NOT NULL,
	`reason` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	`source_fingerprint` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`discovery_id`) REFERENCES `discoveries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_snapshots_account_time_idx` ON `account_snapshots` (`discovery_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `account_snapshots_fingerprint_idx` ON `account_snapshots` (`source_fingerprint`);--> statement-breakpoint
CREATE TABLE `action_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`action_id` text NOT NULL,
	`discovery_id` text NOT NULL,
	`feedback_type` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`adjustment` integer DEFAULT 0 NOT NULL,
	`previous_status` text DEFAULT '' NOT NULL,
	`new_status` text DEFAULT '' NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`action_id`) REFERENCES `account_actions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`discovery_id`) REFERENCES `discoveries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `action_feedback_action_time_idx` ON `action_feedback` (`action_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `action_feedback_account_time_idx` ON `action_feedback` (`discovery_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `ai_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`cache_key` text NOT NULL,
	`discovery_id` text,
	`task` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`evidence_fingerprint` text NOT NULL,
	`response_json` text NOT NULL,
	`usage_json` text DEFAULT '{}' NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`discovery_id`) REFERENCES `discoveries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_cache_key_idx` ON `ai_cache` (`cache_key`);--> statement-breakpoint
CREATE INDEX `ai_cache_account_task_idx` ON `ai_cache` (`discovery_id`,`task`);--> statement-breakpoint
CREATE INDEX `ai_cache_expires_at_idx` ON `ai_cache` (`expires_at`);--> statement-breakpoint
CREATE TABLE `daily_briefings` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`briefing_date` text NOT NULL,
	`account_ids_json` text DEFAULT '[]' NOT NULL,
	`content_json` text NOT NULL,
	`provider` text NOT NULL,
	`model` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`evidence_fingerprint` text NOT NULL,
	`generated_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_briefings_owner_date_idx` ON `daily_briefings` (`owner_email`,`briefing_date`);--> statement-breakpoint
CREATE INDEX `daily_briefings_expires_at_idx` ON `daily_briefings` (`expires_at`);--> statement-breakpoint
CREATE TABLE `external_signals` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_id` text NOT NULL,
	`query_fingerprint` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`source_url` text NOT NULL,
	`publisher` text DEFAULT '' NOT NULL,
	`published_at` text,
	`citation_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'proposed' NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	`approved_at` text,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`discovery_id`) REFERENCES `discoveries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `external_signals_account_status_idx` ON `external_signals` (`discovery_id`,`status`);--> statement-breakpoint
CREATE INDEX `external_signals_query_idx` ON `external_signals` (`discovery_id`,`query_fingerprint`);--> statement-breakpoint
CREATE INDEX `external_signals_expires_at_idx` ON `external_signals` (`expires_at`);--> statement-breakpoint
ALTER TABLE `account_actions` ADD `why_now` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `account_actions` ADD `effort` integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `account_actions` ADD `expected_outcome` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `account_actions` ADD `conversation_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `account_actions` ADD `snoozed_until` text;--> statement-breakpoint
ALTER TABLE `account_actions` ADD `feedback_reason` text;--> statement-breakpoint
ALTER TABLE `account_actions` ADD `rank_adjustment` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_runs` ADD `model` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_runs` ADD `prompt_tokens` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_runs` ADD `output_tokens` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_runs` ADD `latency_ms` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_runs` ADD `cache_hit` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_runs` ADD `error_code` text;--> statement-breakpoint
ALTER TABLE `discoveries` ADD `data_classification` text DEFAULT 'test' NOT NULL;--> statement-breakpoint
ALTER TABLE `discoveries` ADD `company_domain` text;