CREATE TABLE `cdi_capability_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_id` text NOT NULL,
	`catalog_version` text NOT NULL,
	`capability_key` text NOT NULL,
	`maturity_json` text DEFAULT '{}' NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'not_started' NOT NULL,
	`evidence_fingerprint` text DEFAULT '' NOT NULL,
	`computed_at` text NOT NULL,
	FOREIGN KEY (`discovery_id`) REFERENCES `discoveries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cdi_capability_snapshots_account_idx` ON `cdi_capability_snapshots` (`discovery_id`,`capability_key`,`computed_at`);
--> statement-breakpoint
CREATE TABLE `cdi_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_id` text NOT NULL,
	`answer_id` text,
	`question_id` text NOT NULL,
	`capability_key` text NOT NULL,
	`dimension` text NOT NULL,
	`response` text NOT NULL,
	`polarity` text,
	`strength` integer DEFAULT 0 NOT NULL,
	`source_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`discovery_id`) REFERENCES `discoveries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cdi_evidence_account_capability_idx` ON `cdi_evidence` (`discovery_id`,`capability_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `cdi_evidence_answer_idx` ON `cdi_evidence` (`discovery_id`,`answer_id`);
--> statement-breakpoint
CREATE TABLE `cdi_conflicts` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_id` text NOT NULL,
	`capability_key` text NOT NULL,
	`dimension` text NOT NULL,
	`evidence_ids_json` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`resolution_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`discovery_id`) REFERENCES `discoveries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cdi_conflicts_account_status_idx` ON `cdi_conflicts` (`discovery_id`,`status`);
--> statement-breakpoint
CREATE TABLE `cdi_technology_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_id` text NOT NULL,
	`technology_id` text NOT NULL,
	`catalog_version` text NOT NULL,
	`fit_score` integer DEFAULT 0 NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	`decision_band` text NOT NULL,
	`gate_status` text NOT NULL,
	`components_json` text DEFAULT '{}' NOT NULL,
	`trace_json` text DEFAULT '[]' NOT NULL,
	`human_decision` text,
	`reviewed_at` text,
	`computed_at` text NOT NULL,
	FOREIGN KEY (`discovery_id`) REFERENCES `discoveries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cdi_technology_reviews_account_idx` ON `cdi_technology_reviews` (`discovery_id`,`technology_id`,`catalog_version`);
--> statement-breakpoint
PRAGMA optimize;
