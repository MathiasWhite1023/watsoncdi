import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
  sourceIdsJson: text("source_ids_json").notNull(), validated: integer("validated").notNull(), detail: text("detail").notNull(), createdAt: text("created_at").notNull(),
});
