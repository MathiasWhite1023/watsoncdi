CREATE TABLE `guided_discovery_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`question_id` text NOT NULL,
	`discovery_id` text NOT NULL,
	`structured_json` text DEFAULT '{}' NOT NULL,
	`answer_text` text DEFAULT '' NOT NULL,
	`evidence_status` text DEFAULT 'reported' NOT NULL,
	`stakeholder_id` text,
	`source_type` text,
	`source_id` text,
	`source_date` text,
	`confidence` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`supersedes_id` text,
	`is_current` integer DEFAULT true NOT NULL,
	`answered_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `guided_discovery_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `guided_discovery_questions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`discovery_id`) REFERENCES `discoveries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stakeholder_id`) REFERENCES `stakeholders`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`supersedes_id`) REFERENCES `guided_discovery_answers`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "guided_discovery_answers_evidence_status_check" CHECK("guided_discovery_answers"."evidence_status" in ('confirmed', 'reported', 'hypothesis', 'unknown')),
	CONSTRAINT "guided_discovery_answers_status_check" CHECK("guided_discovery_answers"."status" in ('draft', 'confirmed', 'unknown')),
	CONSTRAINT "guided_discovery_answers_confidence_check" CHECK("guided_discovery_answers"."confidence" between 0 and 100),
	CONSTRAINT "guided_discovery_answers_current_check" CHECK("guided_discovery_answers"."is_current" in (0, 1))
);
--> statement-breakpoint
CREATE INDEX `guided_discovery_answers_session_question_current_idx` ON `guided_discovery_answers` (`session_id`,`question_id`,`is_current`);--> statement-breakpoint
CREATE INDEX `guided_discovery_answers_account_idx` ON `guided_discovery_answers` (`discovery_id`);--> statement-breakpoint
CREATE TABLE `guided_discovery_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`discovery_id` text NOT NULL,
	`catalog_question_id` text,
	`pillar` text NOT NULL,
	`prompt` text NOT NULL,
	`hint` text,
	`input_schema_json` text DEFAULT '{}' NOT NULL,
	`source` text DEFAULT 'catalog' NOT NULL,
	`rationale` text,
	`citations_json` text DEFAULT '[]' NOT NULL,
	`sequence` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'proposed' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `guided_discovery_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`discovery_id`) REFERENCES `discoveries`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "guided_discovery_questions_source_check" CHECK("guided_discovery_questions"."source" in ('catalog', 'ai')),
	CONSTRAINT "guided_discovery_questions_status_check" CHECK("guided_discovery_questions"."status" in ('proposed', 'accepted', 'active', 'answered', 'dismissed')),
	CONSTRAINT "guided_discovery_questions_sequence_check" CHECK("guided_discovery_questions"."sequence" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guided_discovery_questions_catalog_idx` ON `guided_discovery_questions` (`session_id`,`catalog_question_id`);--> statement-breakpoint
CREATE INDEX `guided_discovery_questions_session_sequence_idx` ON `guided_discovery_questions` (`session_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `guided_discovery_questions_account_pillar_idx` ON `guided_discovery_questions` (`discovery_id`,`pillar`);--> statement-breakpoint
CREATE INDEX `guided_discovery_questions_session_status_idx` ON `guided_discovery_questions` (`session_id`,`status`);--> statement-breakpoint
CREATE TABLE `guided_discovery_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_id` text NOT NULL,
	`owner_email` text NOT NULL,
	`mode` text DEFAULT 'adaptive' NOT NULL,
	`catalog_version` text NOT NULL,
	`selected_pillars_json` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`progress_percent` integer DEFAULT 0 NOT NULL,
	`coverage_percent` integer DEFAULT 0 NOT NULL,
	`current_question_id` text,
	`checkpoint_count` integer DEFAULT 0 NOT NULL,
	`ai_status` text,
	`started_at` text NOT NULL,
	`completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`discovery_id`) REFERENCES `discoveries`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "guided_discovery_sessions_mode_check" CHECK("guided_discovery_sessions"."mode" in ('adaptive', 'direct')),
	CONSTRAINT "guided_discovery_sessions_status_check" CHECK("guided_discovery_sessions"."status" in ('in_progress', 'paused', 'completed')),
	CONSTRAINT "guided_discovery_sessions_progress_check" CHECK("guided_discovery_sessions"."progress_percent" between 0 and 100),
	CONSTRAINT "guided_discovery_sessions_coverage_check" CHECK("guided_discovery_sessions"."coverage_percent" between 0 and 100),
	CONSTRAINT "guided_discovery_sessions_checkpoint_check" CHECK("guided_discovery_sessions"."checkpoint_count" >= 0)
);
--> statement-breakpoint
CREATE INDEX `guided_discovery_sessions_account_status_idx` ON `guided_discovery_sessions` (`discovery_id`,`status`);--> statement-breakpoint
CREATE INDEX `guided_discovery_sessions_owner_idx` ON `guided_discovery_sessions` (`owner_email`);