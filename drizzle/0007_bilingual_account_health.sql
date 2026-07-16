CREATE TABLE `content_translations` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_id` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`source_fingerprint` text NOT NULL,
	`source_locale` text,
	`target_locale` text NOT NULL,
	`translated_text` text NOT NULL,
	`provider` text NOT NULL,
	`model` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`discovery_id`) REFERENCES `discoveries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_translations_source_locale_idx` ON `content_translations` (`discovery_id`,`source_type`,`source_id`,`source_fingerprint`,`target_locale`);--> statement-breakpoint
CREATE INDEX `content_translations_discovery_idx` ON `content_translations` (`discovery_id`);--> statement-breakpoint
CREATE TABLE `daily_briefing_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`briefing_date` text NOT NULL,
	`locale` text DEFAULT 'en-US' NOT NULL,
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
CREATE UNIQUE INDEX `daily_briefing_variants_owner_date_locale_idx` ON `daily_briefing_variants` (`owner_email`,`briefing_date`,`locale`);--> statement-breakpoint
CREATE INDEX `daily_briefing_variants_expires_at_idx` ON `daily_briefing_variants` (`expires_at`);--> statement-breakpoint
ALTER TABLE `ai_runs` ADD `locale` text DEFAULT 'en-US' NOT NULL;