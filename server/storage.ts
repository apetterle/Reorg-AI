import { eq, and, desc, lt, isNull, or, sql, asc, gte, lte, ilike, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  tenants, users, memberships, invites, projects, documents,
  jobs, jobSteps, facts, evidence, artifacts, auditEvents, authSessions,
  companies, metricsTimeseries, phaseRuns, phaseGates, reports,
  type Tenant, type InsertTenant,
  type User, type InsertUser,
  type Membership, type InsertMembership,
  type Invite, type InsertInvite,
  type Project, type InsertProject,
  type Document, type InsertDocument,
  type Job, type InsertJob,
  type JobStep, type InsertJobStep,
  type Fact, type InsertFact,
  type Evidence, type InsertEvidence,
  type Artifact, type InsertArtifact,
  type AuthSession, type InsertAuthSession,
  type Company, type InsertCompany,
  type MetricTimeseries, type InsertMetricTimeseries,
  type PhaseRun, type InsertPhaseRun,
  type PhaseGate, type InsertPhaseGate,
  type Report, type InsertReport,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  createTenant(tenant: InsertTenant): Promise<Tenant>;
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  getTenantsForUser(userId: string): Promise<Tenant[]>;

  createMembership(membership: InsertMembership): Promise<Membership>;
  getMembership(tenantId: string, userId: string): Promise<Membership | undefined>;
  getMembershipsForTenant(tenantId: string): Promise<(Membership & { user: User })[]>;

  createInvite(invite: InsertInvite): Promise<Invite>;
  getInviteByToken(token: string): Promise<Invite | undefined>;
  getInvitesForTenant(tenantId: string): Promise<Invite[]>;
  acceptInvite(inviteId: string): Promise<void>;

  createProject(project: InsertProject): Promise<Project>;
  getProject(id: string): Promise<Project | undefined>;
  getProjectsForTenant(tenantId: string): Promise<Project[]>;
  updateProject(id: string, data: Partial<Project>): Promise<Project>;

  createDocument(doc: InsertDocument): Promise<Document>;
  getDocument(id: string): Promise<Document | undefined>;
  getDocumentsForProject(projectId: string): Promise<Document[]>;
  updateDocument(id: string, data: Partial<Document>): Promise<Document>;
  deleteDocument(id: string): Promise<void>;

  createJob(job: InsertJob): Promise<Job>;
  getJob(id: string): Promise<Job | undefined>;
  getJobsForProject(projectId: string): Promise<Job[]>;
  updateJob(id: string, data: Partial<Job>): Promise<Job>;
  claimJob(jobId: string, workerId: string): Promise<Job | undefined>;
  claimNextJob(workerId: string, lockMinutes?: number): Promise<Job | undefined>;
  heartbeatJob(jobId: string, workerId: string, lockMinutes?: number): Promise<void>;

  createJobStep(step: InsertJobStep): Promise<JobStep>;
  getJobSteps(jobId: string): Promise<JobStep[]>;
  updateJobStep(id: string, data: Partial<JobStep>): Promise<JobStep>;
  upsertJobStep(jobId: string, stepName: string, data: Partial<JobStep>): Promise<JobStep>;

  createFact(fact: InsertFact): Promise<Fact>;
  getFact(id: string): Promise<Fact | undefined>;
  getFactsForProject(projectId: string, filters?: { status?: string; factType?: string; minConfidence?: number }): Promise<Fact[]>;
  updateFact(id: string, data: Partial<Fact>): Promise<Fact>;

  createEvidence(ev: InsertEvidence): Promise<Evidence>;
  getEvidenceForFact(factId: string): Promise<Evidence[]>;
  getEvidence(id: string): Promise<Evidence | undefined>;

  createArtifact(artifact: InsertArtifact): Promise<Artifact>;
  createOrVersionArtifact(artifact: InsertArtifact): Promise<Artifact>;
  getArtifact(id: string): Promise<Artifact | undefined>;
  getArtifactsForProject(projectId: string): Promise<Artifact[]>;
  updateArtifact(id: string, data: Partial<Artifact>): Promise<Artifact>;
  getArtifactVersions(artifactId: string): Promise<Artifact[]>;

  createAuditEvent(tenantId: string, userId: string | null, action: string, entityType: string, entityId: string, metadata?: any, projectId?: string): Promise<void>;
  getAuditEventsForProject(projectId: string, filters?: { action?: string; userId?: string; entityType?: string; after?: Date; before?: Date }): Promise<any[]>;

  getJobsWithSteps(projectId: string): Promise<(Job & { steps: JobStep[] })[]>;
  getJobByIdempotencyKey(key: string): Promise<Job | undefined>;

  createCompany(company: InsertCompany): Promise<Company>;
  getCompany(id: string): Promise<Company | undefined>;
  getCompaniesForTenant(tenantId: string): Promise<Company[]>;
  updateCompany(id: string, data: Partial<Company>): Promise<Company>;
  deleteCompany(id: string): Promise<void>;

  createMetric(metric: InsertMetricTimeseries): Promise<MetricTimeseries>;
  getMetricsForProject(projectId: string, filters?: { metricKey?: string; periodStart?: string; periodEnd?: string }): Promise<MetricTimeseries[]>;
  deleteMetricsForProject(projectId: string): Promise<void>;

  createPhaseRun(run: InsertPhaseRun): Promise<PhaseRun>;
  getPhaseRun(id: string): Promise<PhaseRun | undefined>;
  getPhaseRunsForProject(projectId: string): Promise<PhaseRun[]>;
  updatePhaseRun(id: string, data: Partial<PhaseRun>): Promise<PhaseRun>;

  createPhaseGate(gate: InsertPhaseGate): Promise<PhaseGate>;
  getPhaseGate(id: string): Promise<PhaseGate | undefined>;
  getPhaseGatesForProject(projectId: string): Promise<PhaseGate[]>;
  updatePhaseGate(id: string, data: Partial<PhaseGate>): Promise<PhaseGate>;

  createReport(report: InsertReport): Promise<Report>;
  getReport(id: string): Promise<Report | undefined>;
  getReportsForProject(projectId: string): Promise<Report[]>;
  updateReport(id: string, data: Partial<Report>): Promise<Report>;

  getProjectsForCompany(companyId: string): Promise<Project[]>;

  searchDocuments(tenantId: string, pattern: string, limit: number): Promise<{ id: string; filename: string; projectId: string; status: string }[]>;
  searchFacts(tenantId: string, pattern: string, limit: number): Promise<{ id: string; key: string; factType: string; projectId: string; status: string }[]>;
  searchArtifacts(tenantId: string, pattern: string, limit: number): Promise<{ id: string; type: string; phaseId: number | null; projectId: string }[]>;
  searchProjects(tenantId: string, pattern: string, limit: number): Promise<{ id: string; name: string; description: string | null; status: string }[]>;

  bulkUpdateFacts(factIds: string[], data: Partial<Fact>): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser) {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async createTenant(tenant: InsertTenant) {
    const [created] = await db.insert(tenants).values(tenant).returning();
    return created;
  }

  async getTenant(id: string) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async getTenantBySlug(slug: string) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    return tenant;
  }

  async getTenantsForUser(userId: string) {
    const rows = await db
      .select({ tenant: tenants })
      .from(memberships)
      .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
      .where(eq(memberships.userId, userId));
    return rows.map((r) => r.tenant);
  }

  async createMembership(membership: InsertMembership) {
    const [created] = await db.insert(memberships).values(membership).returning();
    return created;
  }

  async getMembership(tenantId: string, userId: string) {
    const [m] = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.tenantId, tenantId), eq(memberships.userId, userId)));
    return m;
  }

  async getMembershipsForTenant(tenantId: string) {
    const rows = await db
      .select()
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.tenantId, tenantId));
    return rows.map((r) => ({ ...r.memberships, user: r.users }));
  }

  async createInvite(invite: InsertInvite) {
    const [created] = await db.insert(invites).values(invite).returning();
    return created;
  }

  async getInviteByToken(token: string) {
    const [inv] = await db.select().from(invites).where(eq(invites.token, token));
    return inv;
  }

  async getInvitesForTenant(tenantId: string) {
    return db.select().from(invites).where(eq(invites.tenantId, tenantId)).orderBy(desc(invites.createdAt));
  }

  async acceptInvite(inviteId: string) {
    await db.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.id, inviteId));
  }

  async createProject(project: InsertProject) {
    const [created] = await db.insert(projects).values(project).returning();
    return created;
  }

  async getProject(id: string) {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectsForTenant(tenantId: string) {
    return db.select().from(projects).where(eq(projects.tenantId, tenantId)).orderBy(desc(projects.createdAt));
  }

  async updateProject(id: string, data: Partial<Project>) {
    const [updated] = await db.update(projects).set({ ...data, updatedAt: new Date() }).where(eq(projects.id, id)).returning();
    return updated;
  }

  async createDocument(doc: InsertDocument) {
    const [created] = await db.insert(documents).values(doc).returning();
    return created;
  }

  async getDocument(id: string) {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async getDocumentsForProject(projectId: string) {
    return db.select().from(documents).where(eq(documents.projectId, projectId)).orderBy(desc(documents.createdAt));
  }

  async updateDocument(id: string, data: Partial<Document>) {
    const [updated] = await db.update(documents).set(data).where(eq(documents.id, id)).returning();
    return updated;
  }

  async deleteDocument(id: string) {
    await db.delete(documents).where(eq(documents.id, id));
  }

  async createJob(job: InsertJob) {
    const [created] = await db.insert(jobs).values(job).returning();
    return created;
  }

  async getJob(id: string) {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }

  async getJobsForProject(projectId: string) {
    return db.select().from(jobs).where(eq(jobs.projectId, projectId)).orderBy(desc(jobs.createdAt));
  }

  async updateJob(id: string, data: Partial<Job>) {
    const [updated] = await db.update(jobs).set({ ...data, updatedAt: new Date() }).where(eq(jobs.id, id)).returning();
    return updated;
  }

  async claimJob(jobId: string, workerId: string) {
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + 10 * 60 * 1000);
    const [claimed] = await db
      .update(jobs)
      .set({
        status: "running",
        lockedBy: workerId,
        lockedUntil,
        heartbeatAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(jobs.id, jobId),
          eq(jobs.status, "queued"),
          or(isNull(jobs.lockedUntil), lt(jobs.lockedUntil, now))
        )
      )
      .returning();
    return claimed;
  }

  async claimNextJob(workerId: string, lockMinutes: number = 10) {
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + lockMinutes * 60 * 1000);
    const result = await db.execute(sql`
      UPDATE jobs SET
        status = 'running',
        locked_by = ${workerId},
        locked_until = ${lockedUntil},
        heartbeat_at = ${now},
        attempt = attempt + 1,
        updated_at = ${now}
      WHERE id = (
        SELECT id FROM jobs
        WHERE status = 'queued'
          AND (run_after IS NULL OR run_after <= ${now})
          AND (locked_until IS NULL OR locked_until < ${now})
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `);
    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0] as any;
      return {
        id: row.id,
        projectId: row.project_id,
        tenantId: row.tenant_id,
        type: row.type,
        status: row.status,
        progress: row.progress,
        inputJson: row.input_json,
        budgetJson: row.budget_json,
        attempt: row.attempt,
        maxAttempts: row.max_attempts,
        lockedUntil: row.locked_until,
        lockedBy: row.locked_by,
        heartbeatAt: row.heartbeat_at,
        runAfter: row.run_after,
        resultJson: row.result_json,
        errorMessage: row.error_message,
        errorJson: row.error_json,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      } as Job;
    }
    return undefined;
  }

  async heartbeatJob(jobId: string, workerId: string, lockMinutes: number = 10) {
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + lockMinutes * 60 * 1000);
    await db
      .update(jobs)
      .set({ heartbeatAt: now, lockedUntil, updatedAt: now })
      .where(and(eq(jobs.id, jobId), eq(jobs.lockedBy, workerId)));
  }

  async createJobStep(step: InsertJobStep) {
    const [created] = await db.insert(jobSteps).values(step).returning();
    return created;
  }

  async getJobSteps(jobId: string) {
    return db.select().from(jobSteps).where(eq(jobSteps.jobId, jobId));
  }

  async updateJobStep(id: string, data: Partial<JobStep>) {
    const [updated] = await db.update(jobSteps).set(data).where(eq(jobSteps.id, id)).returning();
    return updated;
  }

  async upsertJobStep(jobId: string, stepName: string, data: Partial<JobStep>) {
    const existing = await db
      .select()
      .from(jobSteps)
      .where(and(eq(jobSteps.jobId, jobId), eq(jobSteps.step, stepName)));
    if (existing.length > 0) {
      const [updated] = await db
        .update(jobSteps)
        .set(data)
        .where(eq(jobSteps.id, existing[0].id))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(jobSteps)
      .values({ jobId, step: stepName, ...data })
      .returning();
    return created;
  }

  async createFact(fact: InsertFact) {
    const [created] = await db.insert(facts).values(fact).returning();
    return created;
  }

  async getFact(id: string) {
    const [fact] = await db.select().from(facts).where(eq(facts.id, id));
    return fact;
  }

  async getFactsForProject(projectId: string, filters?: { status?: string; factType?: string; minConfidence?: number }) {
    let conditions: any[] = [eq(facts.projectId, projectId)];
    if (filters?.status) conditions.push(eq(facts.status, filters.status));
    if (filters?.factType) conditions.push(eq(facts.factType, filters.factType));
    if (filters?.minConfidence !== undefined && !isNaN(filters.minConfidence)) {
      conditions.push(sql`${facts.confidence} >= ${filters.minConfidence}`);
    }
    return db.select().from(facts).where(and(...conditions)).orderBy(desc(facts.createdAt));
  }

  async updateFact(id: string, data: Partial<Fact>) {
    const [updated] = await db.update(facts).set({ ...data, updatedAt: new Date() }).where(eq(facts.id, id)).returning();
    return updated;
  }

  async createEvidence(ev: InsertEvidence) {
    const [created] = await db.insert(evidence).values(ev).returning();
    return created;
  }

  async getEvidenceForFact(factId: string) {
    return db.select().from(evidence).where(eq(evidence.factId, factId));
  }

  async getEvidence(id: string) {
    const [ev] = await db.select().from(evidence).where(eq(evidence.id, id));
    return ev;
  }

  async createArtifact(artifact: InsertArtifact) {
    const [created] = await db.insert(artifacts).values(artifact).returning();
    return created;
  }

  async createOrVersionArtifact(artifact: InsertArtifact) {
    const existing = await db.select().from(artifacts)
      .where(and(
        eq(artifacts.projectId, artifact.projectId),
        eq(artifacts.type, artifact.type),
      ))
      .orderBy(desc(artifacts.version))
      .limit(1);

    if (existing.length > 0) {
      const prev = existing[0];
      const rootId = prev.parentArtifactId || prev.id;
      const [created] = await db.insert(artifacts).values({
        ...artifact,
        version: prev.version + 1,
        parentArtifactId: rootId,
      }).returning();
      return created;
    }

    const [created] = await db.insert(artifacts).values(artifact).returning();
    return created;
  }

  async getArtifact(id: string) {
    const [art] = await db.select().from(artifacts).where(eq(artifacts.id, id));
    return art;
  }

  async getArtifactsForProject(projectId: string) {
    return db.select().from(artifacts).where(eq(artifacts.projectId, projectId)).orderBy(desc(artifacts.createdAt));
  }

  async updateArtifact(id: string, data: Partial<Artifact>) {
    const [updated] = await db.update(artifacts).set(data).where(eq(artifacts.id, id)).returning();
    return updated;
  }

  async getArtifactVersions(artifactId: string) {
    const artifact = await this.getArtifact(artifactId);
    if (!artifact) return [];
    const rootId = artifact.parentArtifactId || artifact.id;
    const byParent = await db.select().from(artifacts)
      .where(or(eq(artifacts.id, rootId), eq(artifacts.parentArtifactId, rootId)))
      .orderBy(asc(artifacts.version));
    return byParent;
  }

  async createAuditEvent(tenantId: string, userId: string | null, action: string, entityType: string, entityId: string, metadata?: any, projectId?: string) {
    await db.insert(auditEvents).values({ tenantId, userId: userId || null, action, entityType, entityId, metadata, projectId: projectId || null });
  }

  async getAuditEventsForProject(projectId: string, filters?: { action?: string; userId?: string; entityType?: string; after?: Date; before?: Date }) {
    let conditions: any[] = [eq(auditEvents.projectId, projectId)];
    if (filters?.action) conditions.push(eq(auditEvents.action, filters.action));
    if (filters?.userId) conditions.push(eq(auditEvents.userId, filters.userId));
    if (filters?.entityType) conditions.push(eq(auditEvents.entityType, filters.entityType));
    if (filters?.after) conditions.push(sql`${auditEvents.createdAt} >= ${filters.after}`);
    if (filters?.before) conditions.push(sql`${auditEvents.createdAt} <= ${filters.before}`);

    return db.select().from(auditEvents).where(and(...conditions)).orderBy(desc(auditEvents.createdAt)).limit(500);
  }

  async getJobsWithSteps(projectId: string) {
    const jobsList = await db.select().from(jobs).where(eq(jobs.projectId, projectId)).orderBy(desc(jobs.createdAt));
    const result: (Job & { steps: JobStep[] })[] = [];
    for (const job of jobsList) {
      const steps = await db.select().from(jobSteps).where(eq(jobSteps.jobId, job.id)).orderBy(asc(jobSteps.startedAt));
      result.push({ ...job, steps });
    }
    return result;
  }

  async getJobByIdempotencyKey(key: string) {
    const [job] = await db.select().from(jobs).where(eq(jobs.idempotencyKey, key));
    return job;
  }

  async createCompany(company: InsertCompany) {
    const [created] = await db.insert(companies).values(company).returning();
    return created;
  }

  async getCompany(id: string) {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async getCompaniesForTenant(tenantId: string) {
    return db.select().from(companies).where(eq(companies.tenantId, tenantId)).orderBy(desc(companies.createdAt));
  }

  async updateCompany(id: string, data: Partial<Company>) {
    const [updated] = await db.update(companies).set(data).where(eq(companies.id, id)).returning();
    return updated;
  }

  async deleteCompany(id: string) {
    await db.delete(companies).where(eq(companies.id, id));
  }

  async createMetric(metric: InsertMetricTimeseries) {
    const [created] = await db.insert(metricsTimeseries).values(metric).returning();
    return created;
  }

  async getMetricsForProject(projectId: string, filters?: { metricKey?: string; periodStart?: string; periodEnd?: string }) {
    let conditions: any[] = [eq(metricsTimeseries.projectId, projectId)];
    if (filters?.metricKey) conditions.push(eq(metricsTimeseries.metricKey, filters.metricKey));
    if (filters?.periodStart) conditions.push(gte(metricsTimeseries.periodStart, filters.periodStart));
    if (filters?.periodEnd) conditions.push(lte(metricsTimeseries.periodStart, filters.periodEnd));
    return db.select().from(metricsTimeseries).where(and(...conditions)).orderBy(asc(metricsTimeseries.periodStart));
  }

  async deleteMetricsForProject(projectId: string) {
    await db.delete(metricsTimeseries).where(eq(metricsTimeseries.projectId, projectId));
  }

  async createPhaseRun(run: InsertPhaseRun) {
    const [created] = await db.insert(phaseRuns).values(run).returning();
    return created;
  }

  async getPhaseRun(id: string) {
    const [run] = await db.select().from(phaseRuns).where(eq(phaseRuns.id, id));
    return run;
  }

  async getPhaseRunsForProject(projectId: string) {
    return db.select().from(phaseRuns).where(eq(phaseRuns.projectId, projectId)).orderBy(desc(phaseRuns.createdAt));
  }

  async updatePhaseRun(id: string, data: Partial<PhaseRun>) {
    const [updated] = await db.update(phaseRuns).set(data).where(eq(phaseRuns.id, id)).returning();
    return updated;
  }

  async createPhaseGate(gate: InsertPhaseGate) {
    const [created] = await db.insert(phaseGates).values(gate).returning();
    return created;
  }

  async getPhaseGate(id: string) {
    const [gate] = await db.select().from(phaseGates).where(eq(phaseGates.id, id));
    return gate;
  }

  async getPhaseGatesForProject(projectId: string) {
    return db.select().from(phaseGates).where(eq(phaseGates.projectId, projectId)).orderBy(desc(phaseGates.createdAt));
  }

  async updatePhaseGate(id: string, data: Partial<PhaseGate>) {
    const [updated] = await db.update(phaseGates).set(data).where(eq(phaseGates.id, id)).returning();
    return updated;
  }

  async createReport(report: InsertReport) {
    const [created] = await db.insert(reports).values(report).returning();
    return created;
  }

  async getReport(id: string) {
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    return report;
  }

  async getReportsForProject(projectId: string) {
    return db.select().from(reports).where(eq(reports.projectId, projectId)).orderBy(desc(reports.createdAt));
  }

  async updateReport(id: string, data: Partial<Report>) {
    const [updated] = await db.update(reports).set(data).where(eq(reports.id, id)).returning();
    return updated;
  }

  async getProjectsForCompany(companyId: string) {
    return db.select().from(projects).where(eq(projects.companyId, companyId)).orderBy(desc(projects.createdAt));
  }

  async searchDocuments(tenantId: string, pattern: string, limit: number) {
    const rows = await db.select({
      id: documents.id,
      filename: documents.filename,
      projectId: documents.projectId,
      status: documents.status,
    }).from(documents)
      .where(and(eq(documents.tenantId, tenantId), ilike(documents.filename, pattern)))
      .limit(limit);
    return rows;
  }

  async searchFacts(tenantId: string, pattern: string, limit: number) {
    const rows = await db.select({
      id: facts.id,
      key: facts.key,
      factType: facts.factType,
      projectId: facts.projectId,
      status: facts.status,
    }).from(facts)
      .where(and(eq(facts.tenantId, tenantId), ilike(facts.key, pattern)))
      .limit(limit);
    return rows;
  }

  async searchArtifacts(tenantId: string, pattern: string, limit: number) {
    const rows = await db.select({
      id: artifacts.id,
      type: artifacts.type,
      phaseId: artifacts.phaseId,
      projectId: artifacts.projectId,
    }).from(artifacts)
      .where(and(eq(artifacts.tenantId, tenantId), ilike(artifacts.type, pattern)))
      .limit(limit);
    return rows;
  }

  async searchProjects(tenantId: string, pattern: string, limit: number) {
    const rows = await db.select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
    }).from(projects)
      .where(and(eq(projects.tenantId, tenantId), or(ilike(projects.name, pattern), ilike(projects.description, pattern))))
      .limit(limit);
    return rows;
  }

  async bulkUpdateFacts(factIds: string[], data: Partial<Fact>) {
    if (factIds.length === 0) return 0;
    const result = await db.update(facts).set({ ...data, updatedAt: new Date() }).where(inArray(facts.id, factIds)).returning();
    return result.length;
  }
}

export const storage = new DatabaseStorage();
