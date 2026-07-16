import { sql } from "drizzle-orm";
import { AnySQLiteColumn, check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const discoveries = sqliteTable("discoveries", {
  id: text("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  industry: text("industry").notNull(),
  companySize: text("company_size").notNull(),
  owner: text("owner").notNull(),
  stage: text("stage").notNull(),
  progress: integer("progress").notNull(),
  priority: text("priority").notNull(),
  challengeSummary: text("challenge_summary").notNull(),
  answersJson: text("answers_json").notNull(),
  scoresJson: text("scores_json").notNull(),
  recommendationsJson: text("recommendations_json").notNull(),
  nextEngagement: text("next_engagement").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  ownerEmail: text("owner_email"),
  visibility: text("visibility").notNull().default("demo"),
  dataClassification: text("data_classification").notNull().default("test"),
  companyDomain: text("company_domain"),
  lastAnalyzedAt: text("last_analyzed_at"),
});

export const auditEvents = sqliteTable("audit_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  discoveryId: text("discovery_id").notNull(),
  type: text("type").notNull(),
  detail: text("detail").notNull(),
  createdAt: text("created_at").notNull(),
  scheduledAt: text("scheduled_at"),
  attendeesJson: text("attendees_json").notNull().default("[]"),
  objective: text("objective").notNull().default(""),
  preparationJson: text("preparation_json").notNull().default("{}"),
  meetingStatus: text("meeting_status").notNull().default("completed"),
});

export const meetings = sqliteTable("meetings", {
  id: text("id").primaryKey(),
  discoveryId: text("discovery_id").notNull(),
  title: text("title").notNull(),
  notes: text("notes").notNull(),
  summary: text("summary").notNull(),
  insightsJson: text("insights_json").notNull(),
  aiStatus: text("ai_status").notNull(),
  createdAt: text("created_at").notNull(),
  scheduledAt: text("scheduled_at"),
  attendeesJson: text("attendees_json").notNull().default("[]"),
  objective: text("objective").notNull().default(""),
  preparationJson: text("preparation_json").notNull().default("{}"),
  meetingStatus: text("meeting_status").notNull().default("completed"),
});

export const accountMaps = sqliteTable("account_maps", {
  discoveryId: text("discovery_id").primaryKey(),
  nodesJson: text("nodes_json").notNull(),
  edgesJson: text("edges_json").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const stakeholders = sqliteTable("stakeholders", {
  id: text("id").primaryKey(),
  discoveryId: text("discovery_id").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  area: text("area").notNull(),
  reportsToId: text("reports_to_id"),
  influence: text("influence").notNull(),
  stance: text("stance").notNull(),
  prioritiesJson: text("priorities_json").notNull(),
  notes: text("notes").notNull(),
  source: text("source").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const accountEvents = sqliteTable("account_events", {
  id: text("id").primaryKey(), discoveryId: text("discovery_id").notNull(),
  type: text("type").notNull(), title: text("title").notNull(), content: text("content").notNull(),
  sourceType: text("source_type").notNull(), sourceId: text("source_id"),
  evidenceStatus: text("evidence_status").notNull(), confidence: integer("confidence").notNull(),
  occurredAt: text("occurred_at").notNull(), createdAt: text("created_at").notNull(),
});

export const accountEntities = sqliteTable("account_entities", {
  id: text("id").primaryKey(), discoveryId: text("discovery_id").notNull(),
  type: text("type").notNull(), name: text("name").notNull(), description: text("description").notNull(),
  status: text("status").notNull(), sourceType: text("source_type").notNull(), sourceId: text("source_id"),
  confidence: integer("confidence").notNull(), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
});

export const accountMemory = sqliteTable("account_memory", {
  discoveryId: text("discovery_id").primaryKey(), executiveSummary: text("executive_summary").notNull(),
  knownJson: text("known_json").notNull(), assumptionsJson: text("assumptions_json").notNull(),
  gapsJson: text("gaps_json").notNull(), changesJson: text("changes_json").notNull(),
  aiStatus: text("ai_status").notNull(), version: integer("version").notNull(), updatedAt: text("updated_at").notNull(),
});

export const accountActions = sqliteTable("account_actions", {
  id: text("id").primaryKey(), discoveryId: text("discovery_id").notNull(), stakeholderId: text("stakeholder_id"),
  type: text("type").notNull(), title: text("title").notNull(), rationale: text("rationale").notNull(),
  nextStep: text("next_step").notNull(), impact: integer("impact").notNull(), urgency: integer("urgency").notNull(),
  confidence: integer("confidence").notNull(), maturity: integer("maturity").notNull(), priorityScore: integer("priority_score").notNull(),
  status: text("status").notNull(), dueAt: text("due_at"), evidenceJson: text("evidence_json").notNull(),
  whyNow: text("why_now").notNull().default(""), effort: integer("effort").notNull().default(50),
  expectedOutcome: text("expected_outcome").notNull().default(""), conversationJson: text("conversation_json").notNull().default("{}"),
  snoozedUntil: text("snoozed_until"), feedbackReason: text("feedback_reason"),
  rankAdjustment: integer("rank_adjustment").notNull().default(0),
  dedupeKey: text("dedupe_key").notNull(), evidenceFingerprint: text("evidence_fingerprint").notNull(),
  createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
});

export const opportunityHypotheses = sqliteTable("opportunity_hypotheses", {
  id: text("id").primaryKey(), discoveryId: text("discovery_id").notNull(), capabilityKey: text("capability_key").notNull(),
  title: text("title").notNull(), problem: text("problem").notNull(), productsJson: text("products_json").notNull(),
  stakeholderIdsJson: text("stakeholder_ids_json").notNull(), evidenceJson: text("evidence_json").notNull(), gapsJson: text("gaps_json").notNull(),
  confidence: integer("confidence").notNull(), stage: text("stage").notNull(), nextStep: text("next_step").notNull(),
  createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
});

export const accountPlans = sqliteTable("account_plans", {
  discoveryId: text("discovery_id").primaryKey(), prioritiesJson: text("priorities_json").notNull(),
  initiativesJson: text("initiatives_json").notNull(), objectivesJson: text("objectives_json").notNull(),
  risksJson: text("risks_json").notNull(), ecosystemJson: text("ecosystem_json").notNull(),
  relationshipJson: text("relationship_json").notNull(), plan30Json: text("plan_30_json").notNull(),
  plan60Json: text("plan_60_json").notNull(), plan90Json: text("plan_90_json").notNull(),
  approvalStatus: text("approval_status").notNull(), suggestionJson: text("suggestion_json").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(), discoveryId: text("discovery_id").notNull(), name: text("name").notNull(),
  contentType: text("content_type").notNull(), sizeBytes: integer("size_bytes").notNull(), r2Key: text("r2_key").notNull(),
  status: text("status").notNull(), summary: text("summary").notNull(), sha256: text("sha256").notNull(),
  createdAt: text("created_at").notNull(),
});

export const documentChunks = sqliteTable("document_chunks", {
  id: text("id").primaryKey(), documentId: text("document_id").notNull(), discoveryId: text("discovery_id").notNull(),
  ordinal: integer("ordinal").notNull(), content: text("content").notNull(), page: integer("page"), createdAt: text("created_at").notNull(),
});

export const accountChatMessages = sqliteTable("account_chat_messages", {
  id: text("id").primaryKey(), discoveryId: text("discovery_id").notNull(), role: text("role").notNull(),
  content: text("content").notNull(), citationsJson: text("citations_json").notNull(), aiStatus: text("ai_status").notNull(), createdAt: text("created_at").notNull(),
});

export const aiRuns = sqliteTable("ai_runs", {
  id: text("id").primaryKey(), discoveryId: text("discovery_id").notNull(), agent: text("agent").notNull(),
  provider: text("provider").notNull(), status: text("status").notNull(), confidence: integer("confidence").notNull(),
  sourceIdsJson: text("source_ids_json").notNull(), validated: integer("validated").notNull(), detail: text("detail").notNull(),
  model: text("model").notNull().default(""), promptTokens: integer("prompt_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0), latencyMs: integer("latency_ms").notNull().default(0),
  cacheHit: integer("cache_hit").notNull().default(0), errorCode: text("error_code"),
  locale: text("locale").notNull().default("en-US"),
  createdAt: text("created_at").notNull(),
});

export const accountEmbeddings = sqliteTable("account_embeddings", {
  id: text("id").primaryKey(),
  discoveryId: text("discovery_id").notNull().references(() => discoveries.id, { onDelete: "cascade" }),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id").notNull(),
  chunkOrdinal: integer("chunk_ordinal").notNull().default(0),
  contentHash: text("content_hash").notNull(),
  model: text("model").notNull(),
  dimensions: integer("dimensions").notNull().default(768),
  vectorJson: text("vector_json").notNull(),
  contentPreview: text("content_preview").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => ({
  accountIdx: index("account_embeddings_discovery_idx").on(table.discoveryId),
  sourceIdx: uniqueIndex("account_embeddings_source_idx").on(
    table.discoveryId,
    table.sourceType,
    table.sourceId,
    table.chunkOrdinal,
    table.model,
  ),
  contentHashIdx: index("account_embeddings_content_hash_idx").on(table.contentHash),
}));

export const aiCache = sqliteTable("ai_cache", {
  id: text("id").primaryKey(),
  cacheKey: text("cache_key").notNull(),
  discoveryId: text("discovery_id").references(() => discoveries.id, { onDelete: "cascade" }),
  task: text("task").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  evidenceFingerprint: text("evidence_fingerprint").notNull(),
  responseJson: text("response_json").notNull(),
  usageJson: text("usage_json").notNull().default("{}"),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => ({
  cacheKeyIdx: uniqueIndex("ai_cache_key_idx").on(table.cacheKey),
  accountTaskIdx: index("ai_cache_account_task_idx").on(table.discoveryId, table.task),
  expiresAtIdx: index("ai_cache_expires_at_idx").on(table.expiresAt),
}));

export const dailyBriefings = sqliteTable("daily_briefings", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  briefingDate: text("briefing_date").notNull(),
  accountIdsJson: text("account_ids_json").notNull().default("[]"),
  contentJson: text("content_json").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull().default(""),
  status: text("status").notNull(),
  evidenceFingerprint: text("evidence_fingerprint").notNull(),
  generatedAt: text("generated_at").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => ({
  ownerDateIdx: uniqueIndex("daily_briefings_owner_date_idx").on(table.ownerEmail, table.briefingDate),
  expiryIdx: index("daily_briefings_expires_at_idx").on(table.expiresAt),
}));

/**
 * Locale-aware briefing cache. The legacy daily_briefings table remains in
 * place so V5.1 can safely roll back and ignore this additive V5.2 surface.
 */
export const dailyBriefingVariants = sqliteTable("daily_briefing_variants", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  briefingDate: text("briefing_date").notNull(),
  locale: text("locale").notNull().default("en-US"),
  accountIdsJson: text("account_ids_json").notNull().default("[]"),
  contentJson: text("content_json").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull().default(""),
  status: text("status").notNull(),
  evidenceFingerprint: text("evidence_fingerprint").notNull(),
  generatedAt: text("generated_at").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => ({
  ownerDateLocaleIdx: uniqueIndex("daily_briefing_variants_owner_date_locale_idx").on(
    table.ownerEmail,
    table.briefingDate,
    table.locale,
  ),
  expiryIdx: index("daily_briefing_variants_expires_at_idx").on(table.expiresAt),
}));

/**
 * Translations are derived artifacts keyed to an authorized account source.
 * Original user-authored content is never overwritten.
 */
export const contentTranslations = sqliteTable("content_translations", {
  id: text("id").primaryKey(),
  discoveryId: text("discovery_id").notNull().references(() => discoveries.id, { onDelete: "cascade" }),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id").notNull(),
  sourceFingerprint: text("source_fingerprint").notNull(),
  sourceLocale: text("source_locale"),
  targetLocale: text("target_locale").notNull(),
  translatedText: text("translated_text").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull().default(""),
  status: text("status").notNull().default("completed"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => ({
  sourceLocaleIdx: uniqueIndex("content_translations_source_locale_idx").on(
    table.discoveryId,
    table.sourceType,
    table.sourceId,
    table.sourceFingerprint,
    table.targetLocale,
  ),
  accountIdx: index("content_translations_discovery_idx").on(table.discoveryId),
}));

export const accountSnapshots = sqliteTable("account_snapshots", {
  id: text("id").primaryKey(),
  discoveryId: text("discovery_id").notNull().references(() => discoveries.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  snapshotJson: text("snapshot_json").notNull(),
  confidence: integer("confidence").notNull().default(0),
  sourceFingerprint: text("source_fingerprint").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  accountTimeIdx: index("account_snapshots_account_time_idx").on(table.discoveryId, table.createdAt),
  fingerprintIdx: index("account_snapshots_fingerprint_idx").on(table.sourceFingerprint),
}));

export const accountRelationships = sqliteTable("account_relationships", {
  id: text("id").primaryKey(),
  discoveryId: text("discovery_id").notNull().references(() => discoveries.id, { onDelete: "cascade" }),
  sourceStakeholderId: text("source_stakeholder_id").notNull().references(() => stakeholders.id, { onDelete: "cascade" }),
  targetStakeholderId: text("target_stakeholder_id").notNull().references(() => stakeholders.id, { onDelete: "cascade" }),
  relationType: text("relation_type").notNull(),
  label: text("label").notNull().default(""),
  confidence: integer("confidence").notNull().default(50),
  evidenceJson: text("evidence_json").notNull().default("[]"),
  status: text("status").notNull().default("confirmed"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => ({
  accountIdx: index("account_relationships_discovery_idx").on(table.discoveryId),
  relationIdx: uniqueIndex("account_relationships_relation_idx").on(
    table.discoveryId,
    table.sourceStakeholderId,
    table.targetStakeholderId,
    table.relationType,
  ),
}));

export const accountGraphLayouts = sqliteTable("account_graph_layouts", {
  id: text("id").primaryKey(),
  discoveryId: text("discovery_id").notNull().references(() => discoveries.id, { onDelete: "cascade" }),
  mode: text("mode").notNull(),
  nodesJson: text("nodes_json").notNull().default("[]"),
  viewportJson: text("viewport_json").notNull().default("{}"),
  updatedAt: text("updated_at").notNull(),
}, (table) => ({
  accountModeIdx: uniqueIndex("account_graph_layouts_account_mode_idx").on(table.discoveryId, table.mode),
}));

export const externalSignals = sqliteTable("external_signals", {
  id: text("id").primaryKey(),
  discoveryId: text("discovery_id").notNull().references(() => discoveries.id, { onDelete: "cascade" }),
  queryFingerprint: text("query_fingerprint").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  sourceUrl: text("source_url").notNull(),
  publisher: text("publisher").notNull().default(""),
  publishedAt: text("published_at"),
  citationJson: text("citation_json").notNull().default("{}"),
  status: text("status").notNull().default("proposed"),
  confidence: integer("confidence").notNull().default(0),
  approvedAt: text("approved_at"),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => ({
  accountStatusIdx: index("external_signals_account_status_idx").on(table.discoveryId, table.status),
  queryIdx: index("external_signals_query_idx").on(table.discoveryId, table.queryFingerprint),
  expiryIdx: index("external_signals_expires_at_idx").on(table.expiresAt),
}));

export const actionFeedback = sqliteTable("action_feedback", {
  id: text("id").primaryKey(),
  actionId: text("action_id").notNull().references(() => accountActions.id, { onDelete: "cascade" }),
  discoveryId: text("discovery_id").notNull().references(() => discoveries.id, { onDelete: "cascade" }),
  feedbackType: text("feedback_type").notNull(),
  reason: text("reason").notNull().default(""),
  adjustment: integer("adjustment").notNull().default(0),
  previousStatus: text("previous_status").notNull().default(""),
  newStatus: text("new_status").notNull().default(""),
  metadataJson: text("metadata_json").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  actionTimeIdx: index("action_feedback_action_time_idx").on(table.actionId, table.createdAt),
  accountTimeIdx: index("action_feedback_account_time_idx").on(table.discoveryId, table.createdAt),
}));

export const guidedDiscoverySessions = sqliteTable("guided_discovery_sessions", {
  id: text("id").primaryKey(),
  discoveryId: text("discovery_id").notNull().references(() => discoveries.id, { onDelete: "cascade" }),
  ownerEmail: text("owner_email").notNull(),
  mode: text("mode").notNull().default("adaptive"),
  catalogVersion: text("catalog_version").notNull(),
  selectedPillarsJson: text("selected_pillars_json").notNull().default("[]"),
  status: text("status").notNull().default("in_progress"),
  progressPercent: integer("progress_percent").notNull().default(0),
  coveragePercent: integer("coverage_percent").notNull().default(0),
  currentQuestionId: text("current_question_id"),
  checkpointCount: integer("checkpoint_count").notNull().default(0),
  aiStatus: text("ai_status"),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => ({
  accountStatusIdx: index("guided_discovery_sessions_account_status_idx").on(table.discoveryId, table.status),
  ownerIdx: index("guided_discovery_sessions_owner_idx").on(table.ownerEmail),
  modeCheck: check("guided_discovery_sessions_mode_check", sql`${table.mode} in ('adaptive', 'direct')`),
  statusCheck: check("guided_discovery_sessions_status_check", sql`${table.status} in ('in_progress', 'paused', 'completed')`),
  progressCheck: check("guided_discovery_sessions_progress_check", sql`${table.progressPercent} between 0 and 100`),
  coverageCheck: check("guided_discovery_sessions_coverage_check", sql`${table.coveragePercent} between 0 and 100`),
  checkpointCheck: check("guided_discovery_sessions_checkpoint_check", sql`${table.checkpointCount} >= 0`),
}));

export const guidedDiscoveryQuestions = sqliteTable("guided_discovery_questions", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => guidedDiscoverySessions.id, { onDelete: "cascade" }),
  discoveryId: text("discovery_id").notNull().references(() => discoveries.id, { onDelete: "cascade" }),
  catalogQuestionId: text("catalog_question_id"),
  pillar: text("pillar").notNull(),
  prompt: text("prompt").notNull(),
  hint: text("hint"),
  inputSchemaJson: text("input_schema_json").notNull().default("{}"),
  source: text("source").notNull().default("catalog"),
  rationale: text("rationale"),
  citationsJson: text("citations_json").notNull().default("[]"),
  sequence: integer("sequence").notNull().default(0),
  status: text("status").notNull().default("proposed"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => ({
  catalogQuestionIdx: uniqueIndex("guided_discovery_questions_catalog_idx").on(table.sessionId, table.catalogQuestionId),
  sessionSequenceIdx: index("guided_discovery_questions_session_sequence_idx").on(table.sessionId, table.sequence),
  accountPillarIdx: index("guided_discovery_questions_account_pillar_idx").on(table.discoveryId, table.pillar),
  sessionStatusIdx: index("guided_discovery_questions_session_status_idx").on(table.sessionId, table.status),
  sourceCheck: check("guided_discovery_questions_source_check", sql`${table.source} in ('catalog', 'ai')`),
  statusCheck: check("guided_discovery_questions_status_check", sql`${table.status} in ('proposed', 'accepted', 'active', 'answered', 'dismissed')`),
  sequenceCheck: check("guided_discovery_questions_sequence_check", sql`${table.sequence} >= 0`),
}));

export const guidedDiscoveryAnswers = sqliteTable("guided_discovery_answers", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => guidedDiscoverySessions.id, { onDelete: "cascade" }),
  questionId: text("question_id").notNull().references(() => guidedDiscoveryQuestions.id, { onDelete: "cascade" }),
  discoveryId: text("discovery_id").notNull().references(() => discoveries.id, { onDelete: "cascade" }),
  structuredJson: text("structured_json").notNull().default("{}"),
  answerText: text("answer_text").notNull().default(""),
  evidenceStatus: text("evidence_status").notNull().default("reported"),
  stakeholderId: text("stakeholder_id").references(() => stakeholders.id, { onDelete: "set null" }),
  sourceType: text("source_type"),
  sourceId: text("source_id"),
  sourceDate: text("source_date"),
  confidence: integer("confidence").notNull().default(0),
  status: text("status").notNull().default("draft"),
  supersedesId: text("supersedes_id").references((): AnySQLiteColumn => guidedDiscoveryAnswers.id, { onDelete: "set null" }),
  isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(true),
  answeredAt: text("answered_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => ({
  sessionQuestionCurrentIdx: index("guided_discovery_answers_session_question_current_idx").on(
    table.sessionId,
    table.questionId,
    table.isCurrent,
  ),
  accountIdx: index("guided_discovery_answers_account_idx").on(table.discoveryId),
  evidenceStatusCheck: check("guided_discovery_answers_evidence_status_check", sql`${table.evidenceStatus} in ('confirmed', 'reported', 'hypothesis', 'unknown')`),
  statusCheck: check("guided_discovery_answers_status_check", sql`${table.status} in ('draft', 'confirmed', 'unknown')`),
  confidenceCheck: check("guided_discovery_answers_confidence_check", sql`${table.confidence} between 0 and 100`),
  currentCheck: check("guided_discovery_answers_current_check", sql`${table.isCurrent} in (0, 1)`),
}));
