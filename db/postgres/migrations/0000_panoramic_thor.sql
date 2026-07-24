CREATE TABLE "account_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"discovery_id" text NOT NULL,
	"stakeholder_id" text,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"rationale" text NOT NULL,
	"next_step" text NOT NULL,
	"impact" integer NOT NULL,
	"urgency" integer NOT NULL,
	"confidence" integer NOT NULL,
	"maturity" integer NOT NULL,
	"priority_score" integer NOT NULL,
	"status" text NOT NULL,
	"due_at" text,
	"evidence_json" text NOT NULL,
	"why_now" text DEFAULT '' NOT NULL,
	"effort" integer DEFAULT 50 NOT NULL,
	"expected_outcome" text DEFAULT '' NOT NULL,
	"conversation_json" text DEFAULT '{}' NOT NULL,
	"snoozed_until" text,
	"feedback_reason" text,
	"rank_adjustment" integer DEFAULT 0 NOT NULL,
	"dedupe_key" text NOT NULL,
	"evidence_fingerprint" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_change_sets" (
	"id" text PRIMARY KEY NOT NULL,
	"discovery_id" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"trigger_type" text NOT NULL,
	"before_json" text DEFAULT '{}' NOT NULL,
	"after_json" text DEFAULT '{}' NOT NULL,
	"delta_json" text DEFAULT '{}' NOT NULL,
	"suggestions_json" text DEFAULT '{}' NOT NULL,
	"provider" text DEFAULT 'deterministic-rules' NOT NULL,
	"engine_kind" text DEFAULT 'deterministic' NOT NULL,
	"status" text DEFAULT 'pending_review' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "account_change_sets_status_check" CHECK ("account_change_sets"."status" in ('pending_review', 'approved', 'rejected')),
	CONSTRAINT "account_change_sets_engine_check" CHECK ("account_change_sets"."engine_kind" in ('deterministic', 'model'))
);
--> statement-breakpoint
CREATE TABLE "account_chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"discovery_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"citations_json" text NOT NULL,
	"ai_status" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_embeddings" (
	"id" text PRIMARY KEY NOT NULL,
	"discovery_id" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"chunk_ordinal" integer DEFAULT 0 NOT NULL,
	"content_hash" text NOT NULL,
	"model" text NOT NULL,
	"dimensions" integer DEFAULT 768 NOT NULL,
	"vector_json" text NOT NULL,
	"content_preview" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_entities" (
	"id" text PRIMARY KEY NOT NULL,
	"discovery_id" text NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"status" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text,
	"confidence" integer NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_events" (
	"id" text PRIMARY KEY NOT NULL,
	"discovery_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text,
	"evidence_status" text NOT NULL,
	"confidence" integer NOT NULL,
	"occurred_at" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_graph_layouts" (
	"id" text PRIMARY KEY NOT NULL,
	"discovery_id" text NOT NULL,
	"mode" text NOT NULL,
	"nodes_json" text DEFAULT '[]' NOT NULL,
	"viewport_json" text DEFAULT '{}' NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_impact_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"discovery_id" text NOT NULL,
	"discovery_started_at" text NOT NULL,
	"qualified_at" text,
	"elapsed_minutes" integer DEFAULT 0 NOT NULL,
	"questions_addressed" integer DEFAULT 0 NOT NULL,
	"questions_confirmed" integer DEFAULT 0 NOT NULL,
	"discovery_coverage" integer DEFAULT 0 NOT NULL,
	"open_gaps" integer DEFAULT 0 NOT NULL,
	"evidence_count" integer DEFAULT 0 NOT NULL,
	"confirmed_evidence_count" integer DEFAULT 0 NOT NULL,
	"meeting_count" integer DEFAULT 0 NOT NULL,
	"qualified_hypothesis_count" integer DEFAULT 0 NOT NULL,
	"methodology_json" text DEFAULT '{}' NOT NULL,
	"computed_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_maps" (
	"discovery_id" text PRIMARY KEY NOT NULL,
	"nodes_json" text NOT NULL,
	"edges_json" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_memory" (
	"discovery_id" text PRIMARY KEY NOT NULL,
	"executive_summary" text NOT NULL,
	"known_json" text NOT NULL,
	"assumptions_json" text NOT NULL,
	"gaps_json" text NOT NULL,
	"changes_json" text NOT NULL,
	"ai_status" text NOT NULL,
	"version" integer NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_plans" (
	"discovery_id" text PRIMARY KEY NOT NULL,
	"priorities_json" text NOT NULL,
	"initiatives_json" text NOT NULL,
	"objectives_json" text NOT NULL,
	"risks_json" text NOT NULL,
	"ecosystem_json" text NOT NULL,
	"relationship_json" text NOT NULL,
	"plan_30_json" text NOT NULL,
	"plan_60_json" text NOT NULL,
	"plan_90_json" text NOT NULL,
	"approval_status" text NOT NULL,
	"suggestion_json" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_relationships" (
	"id" text PRIMARY KEY NOT NULL,
	"discovery_id" text NOT NULL,
	"source_stakeholder_id" text NOT NULL,
	"target_stakeholder_id" text NOT NULL,
	"relation_type" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"confidence" integer DEFAULT 50 NOT NULL,
	"evidence_json" text DEFAULT '[]' NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"discovery_id" text NOT NULL,
	"reason" text NOT NULL,
	"snapshot_json" text NOT NULL,
	"confidence" integer DEFAULT 0 NOT NULL,
	"source_fingerprint" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "action_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"action_id" text NOT NULL,
	"discovery_id" text NOT NULL,
	"feedback_type" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"adjustment" integer DEFAULT 0 NOT NULL,
	"previous_status" text DEFAULT '' NOT NULL,
	"new_status" text DEFAULT '' NOT NULL,
	"metadata_json" text DEFAULT '{}' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_cache" (
	"id" text PRIMARY KEY NOT NULL,
	"cache_key" text NOT NULL,
	"discovery_id" text,
	"task" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"evidence_fingerprint" text NOT NULL,
	"response_json" text NOT NULL,
	"usage_json" text DEFAULT '{}' NOT NULL,
	"expires_at" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"discovery_id" text NOT NULL,
	"agent" text NOT NULL,
	"provider" text NOT NULL,
	"status" text NOT NULL,
	"confidence" integer NOT NULL,
	"source_ids_json" text NOT NULL,
	"validated" integer NOT NULL,
	"detail" text NOT NULL,
	"model" text DEFAULT '' NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"cache_hit" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"locale" text DEFAULT 'en-US' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"discovery_id" text NOT NULL,
	"type" text NOT NULL,
	"detail" text NOT NULL,
	"created_at" text NOT NULL,
	"scheduled_at" text,
	"attendees_json" text DEFAULT '[]' NOT NULL,
	"objective" text DEFAULT '' NOT NULL,
	"preparation_json" text DEFAULT '{}' NOT NULL,
	"meeting_status" text DEFAULT 'completed' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"subject" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" text NOT NULL,
	"last_seen_at" text NOT NULL,
	"revoked_at" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commercial_agent_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"discovery_id" text NOT NULL,
	"workflow_id" text NOT NULL,
	"change_set_id" text,
	"agent" text NOT NULL,
	"engine_kind" text DEFAULT 'deterministic' NOT NULL,
	"provider" text DEFAULT 'deterministic-rules' NOT NULL,
	"model" text DEFAULT '' NOT NULL,
	"status" text NOT NULL,
	"conclusion" text NOT NULL,
	"confidence" integer DEFAULT 0 NOT NULL,
	"source_ids_json" text DEFAULT '[]' NOT NULL,
	"output_json" text DEFAULT '{}' NOT NULL,
	"human_validation_status" text DEFAULT 'pending' NOT NULL,
	"started_at" text NOT NULL,
	"completed_at" text,
	"created_at" text NOT NULL,
	CONSTRAINT "commercial_agent_runs_engine_check" CHECK ("commercial_agent_runs"."engine_kind" in ('deterministic', 'model'))
);
--> statement-breakpoint
CREATE TABLE "content_translations" (
	"id" text PRIMARY KEY NOT NULL,
	"discovery_id" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"source_fingerprint" text NOT NULL,
	"source_locale" text,
	"target_locale" text NOT NULL,
	"translated_text" text NOT NULL,
	"provider" text NOT NULL,
	"model" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_handoffs" (
	"id" text PRIMARY KEY NOT NULL,
	"discovery_id" text NOT NULL,
	"hypothesis_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'preview' NOT NULL,
	"payload_json" text DEFAULT '{}' NOT NULL,
	"qualification_json" text DEFAULT '{}' NOT NULL,
	"copy_text" text DEFAULT '' NOT NULL,
	"export_json" text DEFAULT '{}' NOT NULL,
	"source_ids_json" text DEFAULT '[]' NOT NULL,
	"approved_by" text,
	"approved_at" text,
	"handed_off_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "crm_handoffs_status_check" CHECK ("crm_handoffs"."status" in ('preview', 'approved', 'handed_off', 'returned'))
);
--> statement-breakpoint
CREATE TABLE "daily_briefing_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_email" text NOT NULL,
	"owner_subject" text NOT NULL,
	"briefing_date" text NOT NULL,
	"locale" text DEFAULT 'en-US' NOT NULL,
	"account_ids_json" text DEFAULT '[]' NOT NULL,
	"content_json" text NOT NULL,
	"provider" text NOT NULL,
	"model" text DEFAULT '' NOT NULL,
	"status" text NOT NULL,
	"evidence_fingerprint" text NOT NULL,
	"generated_at" text NOT NULL,
	"expires_at" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_briefings" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_email" text NOT NULL,
	"owner_subject" text NOT NULL,
	"briefing_date" text NOT NULL,
	"account_ids_json" text DEFAULT '[]' NOT NULL,
	"content_json" text NOT NULL,
	"provider" text NOT NULL,
	"model" text DEFAULT '' NOT NULL,
	"status" text NOT NULL,
	"evidence_fingerprint" text NOT NULL,
	"generated_at" text NOT NULL,
	"expires_at" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discoveries" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_name" text NOT NULL,
	"industry" text NOT NULL,
	"company_size" text NOT NULL,
	"owner" text NOT NULL,
	"stage" text NOT NULL,
	"progress" integer NOT NULL,
	"priority" text NOT NULL,
	"challenge_summary" text NOT NULL,
	"answers_json" text NOT NULL,
	"scores_json" text NOT NULL,
	"recommendations_json" text NOT NULL,
	"next_engagement" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"owner_email" text,
	"owner_subject" text,
	"visibility" text DEFAULT 'demo' NOT NULL,
	"data_classification" text DEFAULT 'test' NOT NULL,
	"company_domain" text,
	"last_analyzed_at" text
);
--> statement-breakpoint
CREATE TABLE "document_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"discovery_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"content" text NOT NULL,
	"page" integer,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"discovery_id" text NOT NULL,
	"name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"r2_key" text NOT NULL,
	"status" text NOT NULL,
	"summary" text NOT NULL,
	"sha256" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_signals" (
	"id" text PRIMARY KEY NOT NULL,
	"discovery_id" text NOT NULL,
	"query_fingerprint" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"source_url" text NOT NULL,
	"publisher" text DEFAULT '' NOT NULL,
	"published_at" text,
	"citation_json" text DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"confidence" integer DEFAULT 0 NOT NULL,
	"approved_at" text,
	"expires_at" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guided_discovery_answers" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"question_id" text NOT NULL,
	"discovery_id" text NOT NULL,
	"structured_json" text DEFAULT '{}' NOT NULL,
	"answer_text" text DEFAULT '' NOT NULL,
	"evidence_status" text DEFAULT 'reported' NOT NULL,
	"stakeholder_id" text,
	"source_type" text,
	"source_id" text,
	"source_date" text,
	"confidence" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"supersedes_id" text,
	"is_current" integer DEFAULT 1 NOT NULL,
	"answered_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "guided_discovery_answers_evidence_status_check" CHECK ("guided_discovery_answers"."evidence_status" in ('confirmed', 'reported', 'hypothesis', 'unknown')),
	CONSTRAINT "guided_discovery_answers_status_check" CHECK ("guided_discovery_answers"."status" in ('draft', 'confirmed', 'unknown')),
	CONSTRAINT "guided_discovery_answers_confidence_check" CHECK ("guided_discovery_answers"."confidence" between 0 and 100),
	CONSTRAINT "guided_discovery_answers_current_check" CHECK ("guided_discovery_answers"."is_current" in (0, 1))
);
--> statement-breakpoint
CREATE TABLE "guided_discovery_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"discovery_id" text NOT NULL,
	"catalog_question_id" text,
	"pillar" text NOT NULL,
	"prompt" text NOT NULL,
	"hint" text,
	"input_schema_json" text DEFAULT '{}' NOT NULL,
	"source" text DEFAULT 'catalog' NOT NULL,
	"rationale" text,
	"citations_json" text DEFAULT '[]' NOT NULL,
	"sequence" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "guided_discovery_questions_source_check" CHECK ("guided_discovery_questions"."source" in ('catalog', 'ai')),
	CONSTRAINT "guided_discovery_questions_status_check" CHECK ("guided_discovery_questions"."status" in ('proposed', 'accepted', 'active', 'answered', 'dismissed')),
	CONSTRAINT "guided_discovery_questions_sequence_check" CHECK ("guided_discovery_questions"."sequence" >= 0)
);
--> statement-breakpoint
CREATE TABLE "guided_discovery_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"discovery_id" text NOT NULL,
	"owner_email" text NOT NULL,
	"owner_subject" text NOT NULL,
	"mode" text DEFAULT 'adaptive' NOT NULL,
	"catalog_version" text NOT NULL,
	"selected_pillars_json" text DEFAULT '[]' NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"coverage_percent" integer DEFAULT 0 NOT NULL,
	"current_question_id" text,
	"checkpoint_count" integer DEFAULT 0 NOT NULL,
	"ai_status" text,
	"started_at" text NOT NULL,
	"completed_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "guided_discovery_sessions_mode_check" CHECK ("guided_discovery_sessions"."mode" in ('adaptive', 'direct')),
	CONSTRAINT "guided_discovery_sessions_status_check" CHECK ("guided_discovery_sessions"."status" in ('in_progress', 'paused', 'completed')),
	CONSTRAINT "guided_discovery_sessions_progress_check" CHECK ("guided_discovery_sessions"."progress_percent" between 0 and 100),
	CONSTRAINT "guided_discovery_sessions_coverage_check" CHECK ("guided_discovery_sessions"."coverage_percent" between 0 and 100),
	CONSTRAINT "guided_discovery_sessions_checkpoint_check" CHECK ("guided_discovery_sessions"."checkpoint_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" text PRIMARY KEY NOT NULL,
	"discovery_id" text NOT NULL,
	"title" text NOT NULL,
	"notes" text NOT NULL,
	"summary" text NOT NULL,
	"insights_json" text NOT NULL,
	"ai_status" text NOT NULL,
	"created_at" text NOT NULL,
	"scheduled_at" text,
	"attendees_json" text DEFAULT '[]' NOT NULL,
	"objective" text DEFAULT '' NOT NULL,
	"preparation_json" text DEFAULT '{}' NOT NULL,
	"meeting_status" text DEFAULT 'completed' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_hypotheses" (
	"id" text PRIMARY KEY NOT NULL,
	"discovery_id" text NOT NULL,
	"capability_key" text NOT NULL,
	"title" text NOT NULL,
	"problem" text NOT NULL,
	"products_json" text NOT NULL,
	"stakeholder_ids_json" text NOT NULL,
	"evidence_json" text NOT NULL,
	"gaps_json" text NOT NULL,
	"confidence" integer NOT NULL,
	"stage" text NOT NULL,
	"next_step" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stakeholders" (
	"id" text PRIMARY KEY NOT NULL,
	"discovery_id" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"area" text NOT NULL,
	"reports_to_id" text,
	"influence" text NOT NULL,
	"stance" text NOT NULL,
	"priorities_json" text NOT NULL,
	"notes" text NOT NULL,
	"source" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_identities" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"subject" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_change_sets" ADD CONSTRAINT "account_change_sets_discovery_id_discoveries_id_fk" FOREIGN KEY ("discovery_id") REFERENCES "public"."discoveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_embeddings" ADD CONSTRAINT "account_embeddings_discovery_id_discoveries_id_fk" FOREIGN KEY ("discovery_id") REFERENCES "public"."discoveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_graph_layouts" ADD CONSTRAINT "account_graph_layouts_discovery_id_discoveries_id_fk" FOREIGN KEY ("discovery_id") REFERENCES "public"."discoveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_impact_metrics" ADD CONSTRAINT "account_impact_metrics_discovery_id_discoveries_id_fk" FOREIGN KEY ("discovery_id") REFERENCES "public"."discoveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_relationships" ADD CONSTRAINT "account_relationships_discovery_id_discoveries_id_fk" FOREIGN KEY ("discovery_id") REFERENCES "public"."discoveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_relationships" ADD CONSTRAINT "account_relationships_source_stakeholder_id_stakeholders_id_fk" FOREIGN KEY ("source_stakeholder_id") REFERENCES "public"."stakeholders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_relationships" ADD CONSTRAINT "account_relationships_target_stakeholder_id_stakeholders_id_fk" FOREIGN KEY ("target_stakeholder_id") REFERENCES "public"."stakeholders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_snapshots" ADD CONSTRAINT "account_snapshots_discovery_id_discoveries_id_fk" FOREIGN KEY ("discovery_id") REFERENCES "public"."discoveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_feedback" ADD CONSTRAINT "action_feedback_action_id_account_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."account_actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_feedback" ADD CONSTRAINT "action_feedback_discovery_id_discoveries_id_fk" FOREIGN KEY ("discovery_id") REFERENCES "public"."discoveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_cache" ADD CONSTRAINT "ai_cache_discovery_id_discoveries_id_fk" FOREIGN KEY ("discovery_id") REFERENCES "public"."discoveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_agent_runs" ADD CONSTRAINT "commercial_agent_runs_discovery_id_discoveries_id_fk" FOREIGN KEY ("discovery_id") REFERENCES "public"."discoveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_agent_runs" ADD CONSTRAINT "commercial_agent_runs_change_set_id_account_change_sets_id_fk" FOREIGN KEY ("change_set_id") REFERENCES "public"."account_change_sets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_translations" ADD CONSTRAINT "content_translations_discovery_id_discoveries_id_fk" FOREIGN KEY ("discovery_id") REFERENCES "public"."discoveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_handoffs" ADD CONSTRAINT "crm_handoffs_discovery_id_discoveries_id_fk" FOREIGN KEY ("discovery_id") REFERENCES "public"."discoveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_handoffs" ADD CONSTRAINT "crm_handoffs_hypothesis_id_opportunity_hypotheses_id_fk" FOREIGN KEY ("hypothesis_id") REFERENCES "public"."opportunity_hypotheses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_signals" ADD CONSTRAINT "external_signals_discovery_id_discoveries_id_fk" FOREIGN KEY ("discovery_id") REFERENCES "public"."discoveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guided_discovery_answers" ADD CONSTRAINT "guided_discovery_answers_session_id_guided_discovery_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."guided_discovery_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guided_discovery_answers" ADD CONSTRAINT "guided_discovery_answers_question_id_guided_discovery_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."guided_discovery_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guided_discovery_answers" ADD CONSTRAINT "guided_discovery_answers_discovery_id_discoveries_id_fk" FOREIGN KEY ("discovery_id") REFERENCES "public"."discoveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guided_discovery_answers" ADD CONSTRAINT "guided_discovery_answers_stakeholder_id_stakeholders_id_fk" FOREIGN KEY ("stakeholder_id") REFERENCES "public"."stakeholders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guided_discovery_answers" ADD CONSTRAINT "guided_discovery_answers_supersedes_id_guided_discovery_answers_id_fk" FOREIGN KEY ("supersedes_id") REFERENCES "public"."guided_discovery_answers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guided_discovery_questions" ADD CONSTRAINT "guided_discovery_questions_session_id_guided_discovery_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."guided_discovery_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guided_discovery_questions" ADD CONSTRAINT "guided_discovery_questions_discovery_id_discoveries_id_fk" FOREIGN KEY ("discovery_id") REFERENCES "public"."discoveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guided_discovery_sessions" ADD CONSTRAINT "guided_discovery_sessions_discovery_id_discoveries_id_fk" FOREIGN KEY ("discovery_id") REFERENCES "public"."discoveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_change_sets_account_time_idx" ON "account_change_sets" USING btree ("discovery_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "account_change_sets_source_idx" ON "account_change_sets" USING btree ("discovery_id","source_type","source_id");--> statement-breakpoint
CREATE INDEX "account_embeddings_discovery_idx" ON "account_embeddings" USING btree ("discovery_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_embeddings_source_idx" ON "account_embeddings" USING btree ("discovery_id","source_type","source_id","chunk_ordinal","model");--> statement-breakpoint
CREATE INDEX "account_embeddings_content_hash_idx" ON "account_embeddings" USING btree ("content_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "account_graph_layouts_account_mode_idx" ON "account_graph_layouts" USING btree ("discovery_id","mode");--> statement-breakpoint
CREATE INDEX "account_impact_metrics_account_time_idx" ON "account_impact_metrics" USING btree ("discovery_id","computed_at");--> statement-breakpoint
CREATE INDEX "account_relationships_discovery_idx" ON "account_relationships" USING btree ("discovery_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_relationships_relation_idx" ON "account_relationships" USING btree ("discovery_id","source_stakeholder_id","target_stakeholder_id","relation_type");--> statement-breakpoint
CREATE INDEX "account_snapshots_account_time_idx" ON "account_snapshots" USING btree ("discovery_id","created_at");--> statement-breakpoint
CREATE INDEX "account_snapshots_fingerprint_idx" ON "account_snapshots" USING btree ("source_fingerprint");--> statement-breakpoint
CREATE INDEX "action_feedback_action_time_idx" ON "action_feedback" USING btree ("action_id","created_at");--> statement-breakpoint
CREATE INDEX "action_feedback_account_time_idx" ON "action_feedback" USING btree ("discovery_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_cache_key_idx" ON "ai_cache" USING btree ("cache_key");--> statement-breakpoint
CREATE INDEX "ai_cache_account_task_idx" ON "ai_cache" USING btree ("discovery_id","task");--> statement-breakpoint
CREATE INDEX "ai_cache_expires_at_idx" ON "ai_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_sessions_token_hash_idx" ON "auth_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_expiry_idx" ON "auth_sessions" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX "commercial_agent_runs_account_time_idx" ON "commercial_agent_runs" USING btree ("discovery_id","created_at");--> statement-breakpoint
CREATE INDEX "commercial_agent_runs_workflow_idx" ON "commercial_agent_runs" USING btree ("workflow_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_translations_source_locale_idx" ON "content_translations" USING btree ("discovery_id","source_type","source_id","source_fingerprint","target_locale");--> statement-breakpoint
CREATE INDEX "content_translations_discovery_idx" ON "content_translations" USING btree ("discovery_id");--> statement-breakpoint
CREATE INDEX "crm_handoffs_account_time_idx" ON "crm_handoffs" USING btree ("discovery_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_briefing_variants_subject_date_locale_idx" ON "daily_briefing_variants" USING btree ("owner_subject","briefing_date","locale");--> statement-breakpoint
CREATE INDEX "daily_briefing_variants_expires_at_idx" ON "daily_briefing_variants" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_briefings_owner_subject_date_idx" ON "daily_briefings" USING btree ("owner_subject","briefing_date");--> statement-breakpoint
CREATE INDEX "daily_briefings_expires_at_idx" ON "daily_briefings" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "external_signals_account_status_idx" ON "external_signals" USING btree ("discovery_id","status");--> statement-breakpoint
CREATE INDEX "external_signals_query_idx" ON "external_signals" USING btree ("discovery_id","query_fingerprint");--> statement-breakpoint
CREATE INDEX "external_signals_expires_at_idx" ON "external_signals" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "guided_discovery_answers_session_question_current_idx" ON "guided_discovery_answers" USING btree ("session_id","question_id","is_current");--> statement-breakpoint
CREATE INDEX "guided_discovery_answers_account_idx" ON "guided_discovery_answers" USING btree ("discovery_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guided_discovery_questions_catalog_idx" ON "guided_discovery_questions" USING btree ("session_id","catalog_question_id");--> statement-breakpoint
CREATE INDEX "guided_discovery_questions_session_sequence_idx" ON "guided_discovery_questions" USING btree ("session_id","sequence");--> statement-breakpoint
CREATE INDEX "guided_discovery_questions_account_pillar_idx" ON "guided_discovery_questions" USING btree ("discovery_id","pillar");--> statement-breakpoint
CREATE INDEX "guided_discovery_questions_session_status_idx" ON "guided_discovery_questions" USING btree ("session_id","status");--> statement-breakpoint
CREATE INDEX "guided_discovery_sessions_account_status_idx" ON "guided_discovery_sessions" USING btree ("discovery_id","status");--> statement-breakpoint
CREATE INDEX "guided_discovery_sessions_owner_subject_idx" ON "guided_discovery_sessions" USING btree ("owner_subject");--> statement-breakpoint
CREATE UNIQUE INDEX "user_identities_provider_subject_idx" ON "user_identities" USING btree ("provider","subject");--> statement-breakpoint
CREATE INDEX "user_identities_user_idx" ON "user_identities" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");