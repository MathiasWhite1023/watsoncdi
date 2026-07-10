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
});

export const auditEvents = sqliteTable("audit_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  discoveryId: text("discovery_id").notNull(),
  type: text("type").notNull(),
  detail: text("detail").notNull(),
  createdAt: text("created_at").notNull(),
});
