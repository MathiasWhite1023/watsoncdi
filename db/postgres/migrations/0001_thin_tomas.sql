CREATE UNIQUE INDEX "account_actions_dedupe_idx" ON "account_actions" USING btree ("discovery_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "account_actions_queue_idx" ON "account_actions" USING btree ("discovery_id","status","priority_score");--> statement-breakpoint
CREATE INDEX "account_events_account_time_idx" ON "account_events" USING btree ("discovery_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_events_account_time_idx" ON "audit_events" USING btree ("discovery_id","created_at");--> statement-breakpoint
CREATE INDEX "discoveries_owner_scope_idx" ON "discoveries" USING btree ("owner_subject","visibility","updated_at");--> statement-breakpoint
CREATE INDEX "discoveries_visibility_idx" ON "discoveries" USING btree ("visibility","updated_at");--> statement-breakpoint
CREATE INDEX "meetings_account_time_idx" ON "meetings" USING btree ("discovery_id","created_at");--> statement-breakpoint
CREATE INDEX "meetings_schedule_idx" ON "meetings" USING btree ("discovery_id","meeting_status","scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunity_hypotheses_capability_idx" ON "opportunity_hypotheses" USING btree ("discovery_id","capability_key");--> statement-breakpoint
CREATE INDEX "opportunity_hypotheses_account_stage_idx" ON "opportunity_hypotheses" USING btree ("discovery_id","stage");--> statement-breakpoint
CREATE INDEX "stakeholders_account_hierarchy_idx" ON "stakeholders" USING btree ("discovery_id","reports_to_id");