import { storage } from "./storage";
import { hashPassword } from "./auth";
import { db } from "./db";
import { users, documents, memberships, companies } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

async function seedDemoData(userId: string) {
  const allTenantRows = await db.select().from(memberships).where(eq(memberships.userId, userId));
  if (!allTenantRows || allTenantRows.length === 0) return;
  const tenantId = allTenantRows[0].tenantId;

  const existingCompanies = await storage.getCompaniesForTenant(tenantId);
  if (existingCompanies.length === 0) {
    const company1 = await storage.createCompany({
      tenantId,
      name: "Acme Corp",
      industry: "Financial Services",
      region: "LATAM",
      sizeBand: "enterprise",
      notes: "Key client for restructuring and cost optimization projects",
    });
    const company2 = await storage.createCompany({
      tenantId,
      name: "TechFlow Inc",
      industry: "Technology",
      region: "North America",
      sizeBand: "mid-market",
      notes: "Growing SaaS company, supply chain focus",
    });

    const projects = await storage.getProjectsForTenant(tenantId);
    for (const p of projects) {
      if (!p.companyId) {
        const targetCompany = p.name.toLowerCase().includes("supply") ? company2.id : company1.id;
        await storage.updateProject(p.id, { companyId: targetCompany });
      }
    }
    logger.info("Seeded companies for existing tenant", { source: "seed", tenantId });
  }

  const projects = await storage.getProjectsForTenant(tenantId);
  if (!projects || projects.length === 0) return;
  const target = projects.find((p) => p.name === "Q4 2025 Restructuring Analysis") || projects[0];
  const existingDocs = await storage.getDocumentsForProject(target.id);
  if (existingDocs.length > 0) return;
  await createSampleProjectData(target.id, tenantId);
}

export async function seedDatabase() {
  const existingUser = await storage.getUserByUsername("demo");
  if (existingUser) {
    await seedDemoData(existingUser.id);
    return;
  }

  const hashedPassword = await hashPassword("demo123");

  const demoUser = await storage.createUser({
    email: "demo@reorg.ai",
    username: "demo",
    password: hashedPassword,
    displayName: "Demo Analyst",
  });

  const analystUser = await storage.createUser({
    email: "ana@reorg.ai",
    username: "ana",
    password: hashedPassword,
    displayName: "Ana Santos",
  });

  const tenant = await storage.createTenant({
    name: "Acme Holdings",
    slug: "acme-holdings",
  });

  await storage.createMembership({ tenantId: tenant.id, userId: demoUser.id, role: "owner" });
  await storage.createMembership({ tenantId: tenant.id, userId: analystUser.id, role: "analyst" });

  const tenant2 = await storage.createTenant({
    name: "Nova Capital",
    slug: "nova-capital",
  });

  await storage.createMembership({ tenantId: tenant2.id, userId: demoUser.id, role: "admin" });

  const company1 = await storage.createCompany({
    tenantId: tenant.id,
    name: "Acme Corp",
    industry: "Financial Services",
    region: "LATAM",
    sizeBand: "enterprise",
    notes: "Key client for restructuring and cost optimization projects",
  });

  const company2 = await storage.createCompany({
    tenantId: tenant.id,
    name: "TechFlow Inc",
    industry: "Technology",
    region: "North America",
    sizeBand: "mid-market",
    notes: "Growing SaaS company, supply chain focus",
  });

  const company3 = await storage.createCompany({
    tenantId: tenant2.id,
    name: "Nova Portfolio Co",
    industry: "Private Equity",
    region: "Europe",
    sizeBand: "enterprise",
  });

  const project = await storage.createProject({
    tenantId: tenant.id,
    companyId: company1.id,
    name: "Q4 2025 Restructuring Analysis",
    description: "Comprehensive analysis of Q4 financial documents and operational metrics",
    outputLanguage: "en",
  });

  const project2 = await storage.createProject({
    tenantId: tenant.id,
    companyId: company2.id,
    name: "Supply Chain Due Diligence",
    description: "Supplier contracts and logistics cost analysis",
    outputLanguage: "pt-BR",
  });

  const project3 = await storage.createProject({
    tenantId: tenant2.id,
    companyId: company3.id,
    name: "Portfolio Review 2025",
    description: "Annual portfolio company performance review",
    outputLanguage: "en",
  });

  await createSampleProjectData(project.id, tenant.id);

  logger.info("Database seeded with demo data", { source: "seed" });
  logger.info("Login: demo / demo123", { source: "seed" });
}

async function createSampleProjectData(projectId: string, tenantId: string) {
  const sampleContent = `ACME HOLDINGS - Q4 2025 FINANCIAL SUMMARY

Revenue: $142.5M (up 8.3% YoY)
EBITDA: $31.2M (margin 21.9%)
Net Income: $18.7M
Total Debt: $95.0M
Cash & Equivalents: $27.3M
Headcount: 1,245 FTEs

Key Highlights:
- Supply chain costs reduced by 12% through vendor consolidation.
- New product line contributed $15.8M in revenue during its first quarter.
- Operating expenses decreased 3.1% due to office space optimization.
- Capital expenditures totaled $8.4M, primarily in technology infrastructure.
- Accounts receivable days outstanding improved from 52 to 44 days.
`;

  const uploadsDir = path.resolve("uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const storageKey = `seed-${crypto.randomUUID()}.txt`;
  const filePath = path.join(uploadsDir, storageKey);
  fs.writeFileSync(filePath, sampleContent, "utf-8");

  const doc = await storage.createDocument({
    projectId,
    tenantId,
    filename: "q4-2025-financial-summary.txt",
    kind: "financial_report",
    mimeType: "text/plain",
    sizeBytes: Buffer.byteLength(sampleContent, "utf-8"),
    storageKey,
    storageProvider: "local",
    sha256: crypto.createHash("sha256").update(sampleContent).digest("hex"),
    status: "clean",
    piiRisk: "none",
  });

  const extractJob = await storage.createJob({
    projectId,
    tenantId,
    type: "extract",
    status: "succeeded",
  });

  await storage.createJobStep({
    jobId: extractJob.id,
    step: "parse_document",
    status: "succeeded",
    startedAt: new Date(),
    finishedAt: new Date(),
  });

  await storage.createJobStep({
    jobId: extractJob.id,
    step: "extract_facts",
    status: "succeeded",
    startedAt: new Date(),
    finishedAt: new Date(),
  });

  const fact1 = await storage.createFact({
    projectId,
    tenantId,
    factType: "financial_metric",
    key: "revenue_q4_2025",
    valueJson: { amount: 142500000, currency: "USD", period: "Q4 2025" },
    unit: "USD",
    confidence: 0.95,
    status: "approved",
    derivedFromJobId: extractJob.id,
  });

  const fact2 = await storage.createFact({
    projectId,
    tenantId,
    factType: "financial_metric",
    key: "ebitda_q4_2025",
    valueJson: { amount: 31200000, currency: "USD", margin: 0.219, period: "Q4 2025" },
    unit: "USD",
    confidence: 0.93,
    status: "approved",
    derivedFromJobId: extractJob.id,
  });

  const fact3 = await storage.createFact({
    projectId,
    tenantId,
    factType: "financial_metric",
    key: "total_debt",
    valueJson: { amount: 95000000, currency: "USD" },
    unit: "USD",
    confidence: 0.92,
    status: "proposed",
    derivedFromJobId: extractJob.id,
  });

  const fact4 = await storage.createFact({
    projectId,
    tenantId,
    factType: "operational_metric",
    key: "headcount",
    valueJson: { count: 1245, unit: "FTEs" },
    unit: "FTEs",
    confidence: 0.98,
    status: "approved",
    derivedFromJobId: extractJob.id,
  });

  const fact5 = await storage.createFact({
    projectId,
    tenantId,
    factType: "operational_metric",
    key: "supply_chain_cost_reduction",
    valueJson: { percentChange: -12, driver: "vendor consolidation" },
    unit: "%",
    confidence: 0.88,
    status: "proposed",
    derivedFromJobId: extractJob.id,
  });

  await storage.createEvidence({
    factId: fact1.id,
    documentId: doc.id,
    kind: "extracted_text",
    refJson: { page: 1, lineStart: 3, lineEnd: 3, text: "Revenue: $[REDACTED] (up 8.3% YoY)" },
    snippetRedacted: true,
  });

  await storage.createEvidence({
    factId: fact2.id,
    documentId: doc.id,
    kind: "extracted_text",
    refJson: { page: 1, lineStart: 4, lineEnd: 4, text: "EBITDA: $[REDACTED] (margin 21.9%)" },
    snippetRedacted: true,
  });

  await storage.createEvidence({
    factId: fact3.id,
    documentId: doc.id,
    kind: "extracted_text",
    refJson: { page: 1, lineStart: 6, lineEnd: 6, text: "Total Debt: $[REDACTED]" },
    snippetRedacted: true,
  });

  await storage.createEvidence({
    factId: fact4.id,
    documentId: doc.id,
    kind: "extracted_text",
    refJson: { page: 1, lineStart: 8, lineEnd: 8, text: "Headcount: [REDACTED] FTEs" },
    snippetRedacted: true,
  });

  await storage.createEvidence({
    factId: fact5.id,
    documentId: doc.id,
    kind: "extracted_text",
    refJson: { page: 1, lineStart: 11, lineEnd: 11, text: "Supply chain costs reduced by [REDACTED]% through vendor consolidation." },
    snippetRedacted: true,
  });

  await storage.createArtifact({
    projectId,
    tenantId,
    type: "restructuring_summary",
    schemaVersion: "1.0",
    language: "en",
    dataJson: {
      title: "Q4 2025 Restructuring Analysis - Executive Summary",
      sections: [
        {
          heading: "Financial Overview",
          body: "Revenue reached $142.5M in Q4 2025, reflecting 8.3% year-over-year growth. EBITDA stood at $31.2M with a healthy 21.9% margin. Net income was $18.7M. The company carries $95.0M in total debt against $27.3M in cash and equivalents.",
        },
        {
          heading: "Operational Efficiency",
          body: "Headcount stands at 1,245 FTEs. Supply chain costs were reduced by 12% through vendor consolidation. Operating expenses decreased 3.1% due to office space optimization. Accounts receivable days outstanding improved from 52 to 44 days.",
        },
        {
          heading: "Growth Drivers",
          body: "A new product line contributed $15.8M in revenue during its first quarter of availability. Capital expenditures totaled $8.4M, primarily invested in technology infrastructure to support scaling operations.",
        },
      ],
      generatedAt: new Date().toISOString(),
      factIds: [fact1.id, fact2.id, fact3.id, fact4.id, fact5.id],
    },
  });

  logger.info("Sample project data created", { source: "seed" });
}
