CREATE TABLE `stakeholder_capability_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_id` text NOT NULL,
	`stakeholder_id` text NOT NULL,
	`capability_key` text NOT NULL,
	`assignment_role` text NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`confidence` integer DEFAULT 100 NOT NULL,
	`source_type` text DEFAULT 'manual' NOT NULL,
	`source_id` text,
	`evidence_json` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`discovery_id`) REFERENCES `discoveries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stakeholder_id`) REFERENCES `stakeholders`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "stakeholder_capability_assignments_role_check" CHECK("stakeholder_capability_assignments"."assignment_role" in ('owner','decision_maker','influencer','technical_contact')),
	CONSTRAINT "stakeholder_capability_assignments_status_check" CHECK("stakeholder_capability_assignments"."status" in ('confirmed','suggested','dismissed')),
	CONSTRAINT "stakeholder_capability_assignments_confidence_check" CHECK("stakeholder_capability_assignments"."confidence" between 0 and 100)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stakeholder_capability_assignments_unique_idx` ON `stakeholder_capability_assignments` (`discovery_id`,`stakeholder_id`,`capability_key`,`assignment_role`);
--> statement-breakpoint
CREATE INDEX `stakeholder_capability_assignments_account_capability_idx` ON `stakeholder_capability_assignments` (`discovery_id`,`capability_key`,`status`);
--> statement-breakpoint
CREATE INDEX `stakeholder_capability_assignments_stakeholder_idx` ON `stakeholder_capability_assignments` (`stakeholder_id`,`status`);
--> statement-breakpoint
CREATE TABLE `cdi_answer_impacts` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_id` text NOT NULL,
	`answer_id` text NOT NULL,
	`question_id` text NOT NULL,
	`catalog_version` text NOT NULL,
	`capability_key` text NOT NULL,
	`dimension` text NOT NULL,
	`response` text NOT NULL,
	`evidence_id` text,
	`before_json` text DEFAULT '{}' NOT NULL,
	`after_json` text DEFAULT '{}' NOT NULL,
	`delta_json` text DEFAULT '{}' NOT NULL,
	`journey_ids_json` text DEFAULT '[]' NOT NULL,
	`technology_ids_json` text DEFAULT '[]' NOT NULL,
	`gate_changes_json` text DEFAULT '[]' NOT NULL,
	`recommendation_changes_json` text DEFAULT '[]' NOT NULL,
	`rule_trace_json` text DEFAULT '{}' NOT NULL,
	`source_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`discovery_id`) REFERENCES `discoveries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`answer_id`) REFERENCES `guided_discovery_answers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cdi_answer_impacts_answer_idx` ON `cdi_answer_impacts` (`discovery_id`,`answer_id`);
--> statement-breakpoint
CREATE INDEX `cdi_answer_impacts_account_time_idx` ON `cdi_answer_impacts` (`discovery_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `cdi_answer_impacts_capability_idx` ON `cdi_answer_impacts` (`discovery_id`,`capability_key`,`created_at`);
--> statement-breakpoint
PRAGMA optimize;
