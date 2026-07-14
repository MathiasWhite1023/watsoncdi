ALTER TABLE `meetings` ADD `scheduled_at` text;--> statement-breakpoint
ALTER TABLE `meetings` ADD `attendees_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `meetings` ADD `objective` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `meetings` ADD `preparation_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `meetings` ADD `meeting_status` text DEFAULT 'completed' NOT NULL;