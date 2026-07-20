CREATE TABLE `account_change_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_id` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`trigger_type` text NOT NULL,
	`before_json` text DEFAULT '{}' NOT NULL,
	`after_json` text DEFAULT '{}' NOT NULL,
	`delta_json` text DEFAULT '{}' NOT NULL,
	`suggestions_json` text DEFAULT '{}' NOT NULL,
	`provider` text DEFAULT 'deterministic-rules' NOT NULL,
	`engine_kind` text DEFAULT 'deterministic' NOT NULL,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`reviewed_by` text,
	`reviewed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`discovery_id`) REFERENCES `discoveries`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "account_change_sets_status_check" CHECK("account_change_sets"."status" in ('pending_review', 'approved', 'rejected')),
	CONSTRAINT "account_change_sets_engine_check" CHECK("account_change_sets"."engine_kind" in ('deterministic', 'model'))
);
--> statement-breakpoint
CREATE INDEX `account_change_sets_account_time_idx` ON `account_change_sets` (`discovery_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `account_change_sets_source_idx` ON `account_change_sets` (`discovery_id`,`source_type`,`source_id`);--> statement-breakpoint
CREATE TABLE `account_impact_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_id` text NOT NULL,
	`discovery_started_at` text NOT NULL,
	`qualified_at` text,
	`elapsed_minutes` integer DEFAULT 0 NOT NULL,
	`questions_addressed` integer DEFAULT 0 NOT NULL,
	`questions_confirmed` integer DEFAULT 0 NOT NULL,
	`discovery_coverage` integer DEFAULT 0 NOT NULL,
	`open_gaps` integer DEFAULT 0 NOT NULL,
	`evidence_count` integer DEFAULT 0 NOT NULL,
	`confirmed_evidence_count` integer DEFAULT 0 NOT NULL,
	`meeting_count` integer DEFAULT 0 NOT NULL,
	`qualified_hypothesis_count` integer DEFAULT 0 NOT NULL,
	`methodology_json` text DEFAULT '{}' NOT NULL,
	`computed_at` text NOT NULL,
	FOREIGN KEY (`discovery_id`) REFERENCES `discoveries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_impact_metrics_account_time_idx` ON `account_impact_metrics` (`discovery_id`,`computed_at`);--> statement-breakpoint
CREATE TABLE `commercial_agent_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_id` text NOT NULL,
	`workflow_id` text NOT NULL,
	`change_set_id` text,
	`agent` text NOT NULL,
	`engine_kind` text DEFAULT 'deterministic' NOT NULL,
	`provider` text DEFAULT 'deterministic-rules' NOT NULL,
	`model` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`conclusion` text NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	`source_ids_json` text DEFAULT '[]' NOT NULL,
	`output_json` text DEFAULT '{}' NOT NULL,
	`human_validation_status` text DEFAULT 'pending' NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`discovery_id`) REFERENCES `discoveries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`change_set_id`) REFERENCES `account_change_sets`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "commercial_agent_runs_engine_check" CHECK("commercial_agent_runs"."engine_kind" in ('deterministic', 'model'))
);
--> statement-breakpoint
CREATE INDEX `commercial_agent_runs_account_time_idx` ON `commercial_agent_runs` (`discovery_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `commercial_agent_runs_workflow_idx` ON `commercial_agent_runs` (`workflow_id`);--> statement-breakpoint
CREATE TABLE `crm_handoffs` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_id` text NOT NULL,
	`hypothesis_id` text,
	`version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'preview' NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`qualification_json` text DEFAULT '{}' NOT NULL,
	`copy_text` text DEFAULT '' NOT NULL,
	`export_json` text DEFAULT '{}' NOT NULL,
	`source_ids_json` text DEFAULT '[]' NOT NULL,
	`approved_by` text,
	`approved_at` text,
	`handed_off_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`discovery_id`) REFERENCES `discoveries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`hypothesis_id`) REFERENCES `opportunity_hypotheses`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "crm_handoffs_status_check" CHECK("crm_handoffs"."status" in ('preview', 'approved', 'handed_off', 'returned'))
);
--> statement-breakpoint
CREATE INDEX `crm_handoffs_account_time_idx` ON `crm_handoffs` (`discovery_id`,`updated_at`);