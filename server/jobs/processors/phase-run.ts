import { storage } from "../../storage";
import { logger } from "../../logger";
import { step } from "../worker";
import type { Job } from "@shared/schema";
import { PHASE_DEPENDENCIES, PHASES } from "@shared/schema";
import { runPhase2 } from "./phases/phase2-zerobase";
import { runPhase3 } from "./phases/phase3-smartstack";
import { runPhase4 } from "./phases/phase4-valuecase";
import { runPhase5 } from "./phases/phase5-orgdna";
import { runPhase6 } from "./phases/phase6-aipolicycore";
import { runPhase7 } from "./phases/phase7-adoptloop";

async function getProjectInfo(projectId: string) {
  const project = await storage.getProject(projectId);
  if (!project) throw new Error("Project not found");

  let companyName: string | undefined;
  let industry: string | undefined;
  if (project.companyId) {
    const company = await storage.getCompany(project.companyId);
    if (company) {
      companyName = company.name;
      industry = company.industry || undefined;
    }
  }

  return {
    name: project.name,
    companyName,
    industry,
    language: project.outputLanguage || "pt-BR",
  };
}

const phaseRunners: Record<number, (
  projectId: string,
  tenantId: string,
  facts: any[],
  priorArtifacts: any[],
  projectInfo: any,
) => Promise<any>> = {
  2: runPhase2,
  3: runPhase3,
  4: runPhase4,
  5: runPhase5,
  6: runPhase6,
  7: runPhase7,
};

export async function processPhaseRun(job: Job): Promise<void> {
  const { projectId, tenantId } = job;
  const phaseMatch = job.type.match(/phase_(\d+)_run_v1/);
  const phaseId = phaseMatch ? parseInt(phaseMatch[1]) : 0;
  const phaseMeta = PHASES[phaseId] || { id: phaseId, name: `Phase ${phaseId}`, short: `P${phaseId}` };

  await step(job.id, "check_prerequisites", async () => {
    const project = await storage.getProject(projectId);
    if (!project) throw new Error("Project not found");

    const deps = PHASE_DEPENDENCIES[phaseId] || [];
    if (deps.length > 0 && (project.currentPhase || 0) < Math.max(...deps)) {
      const missingPhases = deps.filter((d) => d > (project.currentPhase || 0));
      throw new Error(`Prerequisites not met: complete phases ${missingPhases.join(", ")} first`);
    }

    return { phaseId, phaseName: phaseMeta.name, prerequisites: deps };
  });

  const gatherResult = await step(job.id, "gather_inputs", async () => {
    const facts = await storage.getFactsForProject(projectId, { status: "approved" });
    const docs = await storage.getDocumentsForProject(projectId);
    const processedDocs = docs.filter((d) => d.status === "extracted" || d.status === "ingested");
    const allArtifacts = await storage.getArtifactsForProject(projectId);

    return {
      approvedFacts: facts.length,
      processedDocuments: processedDocs.length,
      totalDocuments: docs.length,
      existingArtifacts: allArtifacts.length,
    };
  });

  const analysisResult = await step(job.id, "run_analysis", async () => {
    const facts = await storage.getFactsForProject(projectId, { status: "approved" });
    const allArtifacts = await storage.getArtifactsForProject(projectId);
    const projectInfo = await getProjectInfo(projectId);

    const runner = phaseRunners[phaseId];
    if (runner) {
      const priorArtifacts = allArtifacts.filter((a) => a.phaseId !== null && a.phaseId < phaseId);
      const artifact = await runner(projectId, tenantId, facts, priorArtifacts, projectInfo);
      return {
        phaseId,
        phaseName: phaseMeta.name,
        artifactId: artifact.id,
        artifactType: artifact.type,
        aiGenerated: true,
        completedAt: new Date().toISOString(),
      };
    }

    const numericFacts = facts.filter((f) => f.factType === "numeric" || f.factType === "kpi" || f.factType === "financial_metric");
    const textualFacts = facts.filter((f) => f.factType === "textual" || f.factType === "operational_metric");

    const artifact = await storage.createOrVersionArtifact({
      projectId,
      tenantId,
      type: `phase_${phaseId}_output`,
      phaseId,
      schemaVersion: "1.0",
      language: projectInfo.language || "pt-BR",
      dataJson: {
        phase: phaseMeta.name,
        phaseId,
        kpisAnalyzed: numericFacts.length,
        claimsAnalyzed: textualFacts.length,
        generatedAt: new Date().toISOString(),
      },
    });

    return {
      phaseId,
      phaseName: phaseMeta.name,
      artifactId: artifact.id,
      artifactType: artifact.type,
      aiGenerated: false,
      completedAt: new Date().toISOString(),
    };
  });

  await step(job.id, "quality_checks", async () => {
    const docs = await storage.getDocumentsForProject(projectId);
    const facts = await storage.getFactsForProject(projectId, { status: "approved" });
    const allFacts = await storage.getFactsForProject(projectId);

    const checks: { name: string; passed: boolean; detail?: string }[] = [];

    if (phaseId === 0) {
      const hasDocuments = docs.length > 0;
      checks.push({ name: "Documents uploaded", passed: hasDocuments, detail: `${docs.length} document(s) found` });
      const piiScanned = docs.every((d) => d.piiScannedAt !== null);
      checks.push({ name: "PII scan completed", passed: piiScanned, detail: piiScanned ? "All documents scanned" : "Some documents pending PII scan" });
      const noneBlocked = docs.filter((d) => d.containsPii && !d.sanitizedAt).length === 0;
      checks.push({ name: "No blocked documents", passed: noneBlocked, detail: noneBlocked ? "No PII-blocked documents" : "Some documents blocked by PII" });
    } else if (phaseId === 1) {
      const hasFacts = allFacts.length > 0;
      checks.push({ name: "Facts extracted", passed: hasFacts, detail: `${allFacts.length} fact(s) found` });
      const hasApproved = facts.length > 0;
      checks.push({ name: "Facts approved", passed: hasApproved, detail: `${facts.length} approved fact(s)` });
      const numericFacts = facts.filter((f) => f.factType === "numeric" || f.factType === "kpi");
      checks.push({ name: "Numeric data available", passed: numericFacts.length > 0, detail: `${numericFacts.length} numeric fact(s)` });
    } else {
      const prevPhaseArtifacts = await storage.getArtifactsForProject(projectId);
      const prevDone = prevPhaseArtifacts.some((a) => a.phaseId === phaseId - 1);
      checks.push({ name: "Previous phase completed", passed: prevDone, detail: prevDone ? `Phase ${phaseId - 1} artifacts found` : `No phase ${phaseId - 1} artifacts` });
      const hasApproved = facts.length > 0;
      checks.push({ name: "Approved facts available", passed: hasApproved, detail: `${facts.length} approved fact(s)` });
    }

    const allPassed = checks.every((c) => c.passed);
    return { checks, allPassed };
  });

  await step(job.id, "update_project_phase", async () => {
    const project = await storage.getProject(projectId);
    if (project && (project.currentPhase || 0) <= phaseId) {
      await storage.updateProject(projectId, { currentPhase: phaseId + 1 });
    }
    return { newPhase: phaseId + 1 };
  });

  await storage.updateJob(job.id, { resultJson: { phaseId, phaseName: phaseMeta.name, status: "completed" } });
  logger.info(`Phase ${phaseId} job completed`, { source: "jobs", jobId: job.id, phaseId });
  await storage.createAuditEvent(tenantId, null, "completed", "job", job.id, { phaseId, phaseName: phaseMeta.name }, projectId);
}
