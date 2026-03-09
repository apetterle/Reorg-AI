import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  jsonb,
  real,
  index,
  numeric,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const memberships = pgTable(
  "memberships",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role").notNull().default("analyst"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("memberships_tenant_idx").on(t.tenantId)]
);

export const invites = pgTable(
  "invites",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id),
    email: text("email").notNull(),
    role: text("role").notNull().default("analyst"),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    createdById: varchar("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("invites_tenant_idx").on(t.tenantId)]
);

export const companies = pgTable(
  "companies",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: text("name").notNull(),
    industry: text("industry"),
    region: text("region"),
    sizeBand: text("size_band"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("companies_tenant_idx").on(t.tenantId)]
);

export const projects = pgTable(
  "projects",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id),
    companyId: varchar("company_id").references(() => companies.id),
    name: text("name").notNull(),
    description: text("description"),
    clientName: text("client_name"),
    outputLanguage: text("output_language").notNull().default("pt-BR"),
    currentPhase: integer("current_phase").notNull().default(0),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("projects_tenant_idx").on(t.tenantId),
    index("projects_company_idx").on(t.companyId),
  ]
);

export const documents = pgTable(
  "documents",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    projectId: varchar("project_id")
      .notNull()
      .references(() => projects.id),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id),
    companyId: varchar("company_id").references(() => companies.id),
    filename: text("filename").notNull(),
    kind: text("kind"),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    storageKey: text("storage_key").notNull(),
    storageProvider: text("storage_provider").notNull().default("local"),
    sha256: text("sha256"),
    status: text("status").notNull().default("uploaded"),
    piiRisk: text("pii_risk").default("unknown"),
    containsPii: boolean("contains_pii"),
    piiScanJson: jsonb("pii_scan_json"),
    piiScannedAt: timestamp("pii_scanned_at"),
    classificationJson: jsonb("classification_json"),
    extractionPlanJson: jsonb("extraction_plan_json"),
    originalStorageKey: text("original_storage_key"),
    originalDeletedAt: timestamp("original_deleted_at"),
    sanitizedAt: timestamp("sanitized_at"),
    sanitizedById: varchar("sanitized_by_id").references(() => users.id),
    sanitizationJobId: varchar("sanitization_job_id"),
    tagsJson: jsonb("tags_json"),
    bundleVersion: integer("bundle_version").notNull().default(0),
    bundleStoragePrefix: text("bundle_storage_prefix"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("documents_project_idx").on(t.projectId),
    index("documents_tenant_idx").on(t.tenantId),
    index("documents_status_idx").on(t.status),
  ]
);

export const jobs = pgTable(
  "jobs",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    projectId: varchar("project_id")
      .notNull()
      .references(() => projects.id),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id),
    type: text("type").notNull(),
    status: text("status").notNull().default("queued"),
    progress: numeric("progress", { precision: 5, scale: 2 }),
    inputJson: jsonb("input_json"),
    budgetJson: jsonb("budget_json"),
    attempt: integer("attempt").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    lockedUntil: timestamp("locked_until"),
    lockedBy: text("locked_by"),
    heartbeatAt: timestamp("heartbeat_at"),
    runAfter: timestamp("run_after"),
    resultJson: jsonb("result_json"),
    errorMessage: text("error_message"),
    errorJson: jsonb("error_json"),
    idempotencyKey: varchar("idempotency_key", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("jobs_project_idx").on(t.projectId),
    index("jobs_status_idx").on(t.status),
    index("jobs_run_after_idx").on(t.runAfter),
    index("jobs_idempotency_idx").on(t.idempotencyKey),
  ]
);

export const jobSteps = pgTable(
  "job_steps",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    jobId: varchar("job_id")
      .notNull()
      .references(() => jobs.id),
    step: text("step").notNull(),
    status: text("status").notNull().default("pending"),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
    errorMessage: text("error_message"),
    outputJson: jsonb("output_json"),
    errorJson: jsonb("error_json"),
    timeoutMs: integer("timeout_ms"),
  },
  (t) => [index("job_steps_job_idx").on(t.jobId)]
);

export const facts = pgTable(
  "facts",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    projectId: varchar("project_id")
      .notNull()
      .references(() => projects.id),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id),
    factType: text("fact_type").notNull(),
    key: text("key").notNull(),
    valueJson: jsonb("value_json").notNull(),
    unit: text("unit"),
    confidence: real("confidence").default(0.5),
    status: text("status").notNull().default("proposed"),
    derivedFromJobId: varchar("derived_from_job_id").references(() => jobs.id),
    phaseId: integer("phase_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("facts_project_idx").on(t.projectId),
    index("facts_status_idx").on(t.status),
    index("facts_type_idx").on(t.factType),
    index("facts_key_idx").on(t.key),
  ]
);

export const evidence = pgTable(
  "evidence",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    factId: varchar("fact_id")
      .notNull()
      .references(() => facts.id),
    tenantId: varchar("tenant_id").references(() => tenants.id),
    projectId: varchar("project_id").references(() => projects.id),
    documentId: varchar("document_id").references(() => documents.id),
    kind: text("kind").notNull(),
    refJson: jsonb("ref_json"),
    snippetRedacted: boolean("snippet_redacted").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("evidence_fact_idx").on(t.factId)]
);

export const artifacts = pgTable(
  "artifacts",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    projectId: varchar("project_id")
      .notNull()
      .references(() => projects.id),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id),
    type: text("type").notNull(),
    phaseId: integer("phase_id"),
    version: integer("version").notNull().default(1),
    parentArtifactId: varchar("parent_artifact_id"),
    schemaVersion: text("schema_version").notNull().default("1.0"),
    language: text("language").notNull().default("pt-BR"),
    dataJson: jsonb("data_json").notNull(),
    storageKey: text("storage_key"),
    locked: boolean("locked").notNull().default(false),
    lockedAt: timestamp("locked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("artifacts_project_idx").on(t.projectId),
    index("artifacts_phase_idx").on(t.phaseId),
    index("artifacts_parent_idx").on(t.parentArtifactId),
  ]
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id").references(() => tenants.id),
    userId: varchar("user_id").references(() => users.id),
    projectId: varchar("project_id").references(() => projects.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: varchar("entity_id"),
    beforeJson: jsonb("before_json"),
    afterJson: jsonb("after_json"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("audit_events_tenant_idx").on(t.tenantId),
    index("audit_events_project_idx").on(t.projectId),
    index("audit_events_entity_idx").on(t.entityId),
    index("audit_events_created_idx").on(t.createdAt),
  ]
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    lastSeenAt: timestamp("last_seen_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("auth_sessions_user_idx").on(t.userId)]
);

export const metricsTimeseries = pgTable(
  "metrics_timeseries",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id),
    companyId: varchar("company_id").references(() => companies.id),
    projectId: varchar("project_id")
      .notNull()
      .references(() => projects.id),
    metricKey: text("metric_key").notNull(),
    periodStart: date("period_start").notNull(),
    periodGranularity: text("period_granularity").notNull().default("month"),
    value: numeric("value", { precision: 18, scale: 4 }).notNull(),
    unit: text("unit").notNull(),
    sampleSize: integer("sample_size"),
    sourceLineageJson: jsonb("source_lineage_json"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("metrics_project_idx").on(t.projectId),
    index("metrics_key_idx").on(t.metricKey),
    index("metrics_period_idx").on(t.periodStart),
  ]
);

export const phaseRuns = pgTable(
  "phase_runs",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    projectId: varchar("project_id")
      .notNull()
      .references(() => projects.id),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id),
    phaseId: integer("phase_id").notNull(),
    status: text("status").notNull().default("pending"),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
    inputsJson: jsonb("inputs_json"),
    outputsSummaryJson: jsonb("outputs_summary_json"),
    errorJson: jsonb("error_json"),
    jobId: varchar("job_id").references(() => jobs.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("phase_runs_project_idx").on(t.projectId),
    index("phase_runs_phase_idx").on(t.phaseId),
  ]
);

export const phaseGates = pgTable(
  "phase_gates",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    projectId: varchar("project_id")
      .notNull()
      .references(() => projects.id),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id),
    phaseId: integer("phase_id").notNull(),
    phaseRunId: varchar("phase_run_id").references(() => phaseRuns.id),
    decision: text("decision").notNull().default("pending"),
    decidedBy: varchar("decided_by").references(() => users.id),
    decidedAt: timestamp("decided_at"),
    checklistJson: jsonb("checklist_json"),
    evidenceCoverage: numeric("evidence_coverage", { precision: 5, scale: 2 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("phase_gates_project_idx").on(t.projectId),
    index("phase_gates_phase_idx").on(t.phaseId),
  ]
);

export const reports = pgTable(
  "reports",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    projectId: varchar("project_id")
      .notNull()
      .references(() => projects.id),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id),
    title: text("title").notNull(),
    templateId: text("template_id").notNull(),
    selectedArtifactVersionsJson: jsonb("selected_artifact_versions_json"),
    outputFormat: text("output_format").notNull().default("html"),
    storageKey: text("storage_key"),
    status: text("status").notNull().default("draft"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("reports_project_idx").on(t.projectId)]
);

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
});
export const insertMetricSchema = createInsertSchema(metricsTimeseries).omit({
  id: true,
  createdAt: true,
});
export const insertPhaseRunSchema = createInsertSchema(phaseRuns).omit({
  id: true,
  createdAt: true,
});
export const insertPhaseGateSchema = createInsertSchema(phaseGates).omit({
  id: true,
  createdAt: true,
});
export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
});
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});
export const insertMembershipSchema = createInsertSchema(memberships).omit({
  id: true,
  createdAt: true,
});
export const insertInviteSchema = createInsertSchema(invites).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
});
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});
export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertJobStepSchema = createInsertSchema(jobSteps).omit({
  id: true,
});
export const insertFactSchema = createInsertSchema(facts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertEvidenceSchema = createInsertSchema(evidence).omit({
  id: true,
  createdAt: true,
});
export const insertArtifactSchema = createInsertSchema(artifacts).omit({
  id: true,
  createdAt: true,
});
export const insertAuthSessionSchema = createInsertSchema(authSessions).omit({
  id: true,
  createdAt: true,
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Membership = typeof memberships.$inferSelect;
export type InsertMembership = z.infer<typeof insertMembershipSchema>;
export type Invite = typeof invites.$inferSelect;
export type InsertInvite = z.infer<typeof insertInviteSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type JobStep = typeof jobSteps.$inferSelect;
export type InsertJobStep = z.infer<typeof insertJobStepSchema>;
export type Fact = typeof facts.$inferSelect;
export type InsertFact = z.infer<typeof insertFactSchema>;
export type Evidence = typeof evidence.$inferSelect;
export type InsertEvidence = z.infer<typeof insertEvidenceSchema>;
export type Artifact = typeof artifacts.$inferSelect;
export type InsertArtifact = z.infer<typeof insertArtifactSchema>;
export type AuthSession = typeof authSessions.$inferSelect;
export type InsertAuthSession = z.infer<typeof insertAuthSessionSchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type MetricTimeseries = typeof metricsTimeseries.$inferSelect;
export type InsertMetricTimeseries = z.infer<typeof insertMetricSchema>;
export type PhaseRun = typeof phaseRuns.$inferSelect;
export type InsertPhaseRun = z.infer<typeof insertPhaseRunSchema>;
export type PhaseGate = typeof phaseGates.$inferSelect;
export type InsertPhaseGate = z.infer<typeof insertPhaseGateSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
  displayName: z.string().optional(),
});

export const createProjectFormSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  clientName: z.string().optional(),
  outputLanguage: z.enum(["en", "pt-BR", "es"]),
});

export const createCompanyFormSchema = z.object({
  name: z.string().min(1),
  industry: z.string().optional(),
  region: z.string().optional(),
  sizeBand: z.enum(["startup", "smb", "mid-market", "enterprise"]).optional(),
  notes: z.string().optional(),
});

export const createInviteFormSchema = z.object({
  email: z.string().email(),
  role: z.enum(["owner", "admin", "analyst", "viewer"]),
});

export const PHASES = [
  { id: 0, name: "Setup Baseline", short: "Baseline" },
  { id: 1, name: "ValueScope", short: "ValueScope" },
  { id: 2, name: "ZeroBase Rebuild", short: "ZeroBase" },
  { id: 3, name: "SmartStack", short: "SmartStack" },
  { id: 4, name: "ValueCase", short: "ValueCase" },
  { id: 5, name: "OrgDNA", short: "OrgDNA" },
  { id: 6, name: "AIPolicyCore", short: "AIPolicyCore" },
  { id: 7, name: "AdoptLoop", short: "AdoptLoop" },
] as const;

export const PHASE_DEPENDENCIES: Record<number, number[]> = {
  0: [],
  1: [],
  2: [1],
  3: [2],
  4: [2, 3],
  5: [2, 3, 4],
  6: [1, 2, 3, 4, 5],
  7: [5, 6],
};
