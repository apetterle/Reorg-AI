import { storage } from "../../storage";
import { logger } from "../../logger";
import { redactText } from "../../pii";
import { getStorage } from "../../storage-adapter";
import { step } from "../worker";
import type { Job } from "@shared/schema";

export async function processExport(job: Job): Promise<void> {
  const { projectId, tenantId } = job;
  const inputJson = job.inputJson as any;
  const format = inputJson?.format || "json";
  const artifactIds = inputJson?.artifactIds as string[] | undefined;

  const result = await step(job.id, "export_artifacts", async () => {
    const project = await storage.getProject(projectId);
    if (!project) throw new Error("Project not found");

    let artifactsList = await storage.getArtifactsForProject(projectId);
    if (artifactIds && artifactIds.length > 0) {
      artifactsList = artifactsList.filter((a) => artifactIds.includes(a.id));
    }

    const approvedFacts = await storage.getFactsForProject(projectId, { status: "approved" });

    const sanitizedFacts = approvedFacts.map((f) => ({
      ...f,
      valueJson: typeof f.valueJson === "object"
        ? JSON.parse(redactText(JSON.stringify(f.valueJson)))
        : f.valueJson,
    }));

    const exportData = {
      project: { name: project.name, language: project.outputLanguage },
      facts: sanitizedFacts,
      artifacts: artifactsList.map((a) => a.dataJson),
      exportedAt: new Date().toISOString(),
    };

    let content: string;
    let filename: string;
    let contentType: string;

    if (format === "md") {
      let md = `# ${project.name} - ValueScope Report\n\n`;
      md += `**Language:** ${project.outputLanguage}\n`;
      md += `**Exported:** ${new Date().toISOString()}\n\n`;
      md += `## Approved Facts (${sanitizedFacts.length})\n\n`;
      sanitizedFacts.forEach((f) => {
        md += `### ${f.key}\n`;
        md += `- **Type:** ${f.factType}\n`;
        md += `- **Value:** ${JSON.stringify(f.valueJson)}\n`;
        if (f.unit) md += `- **Unit:** ${f.unit}\n`;
        md += `- **Confidence:** ${(f.confidence || 0) * 100}%\n\n`;
      });
      if (artifactsList.length > 0) {
        md += `## ValueScope Artifacts\n\n`;
        artifactsList.forEach((a) => {
          md += `### ${a.type} (v${a.schemaVersion})\n`;
          md += `\`\`\`json\n${JSON.stringify(a.dataJson, null, 2)}\n\`\`\`\n\n`;
        });
      }
      content = md;
      filename = `${project.name}-export.md`;
      contentType = "text/markdown";
    } else if (format === "html") {
      let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${project.name} - Export</title>
        <style>body{font-family:system-ui;max-width:800px;margin:0 auto;padding:2rem}
        h1{color:#1a365d}h2{border-bottom:2px solid #e2e8f0;padding-bottom:.5rem}
        .fact{background:#f7fafc;padding:1rem;border-radius:8px;margin:1rem 0;border:1px solid #e2e8f0}
        .label{font-weight:600;color:#4a5568}</style></head><body>`;
      html += `<h1>${project.name}</h1>`;
      html += `<p>Language: ${project.outputLanguage} | Exported: ${new Date().toISOString()}</p>`;
      html += `<h2>Approved Facts (${sanitizedFacts.length})</h2>`;
      sanitizedFacts.forEach((f) => {
        html += `<div class="fact"><h3>${f.key}</h3>`;
        html += `<p><span class="label">Type:</span> ${f.factType}</p>`;
        html += `<p><span class="label">Value:</span> ${JSON.stringify(f.valueJson)}</p>`;
        if (f.unit) html += `<p><span class="label">Unit:</span> ${f.unit}</p>`;
        html += `<p><span class="label">Confidence:</span> ${(f.confidence || 0) * 100}%</p></div>`;
      });
      html += `</body></html>`;
      content = html;
      filename = `${project.name}-export.html`;
      contentType = "text/html";
    } else {
      content = JSON.stringify(exportData, null, 2);
      filename = `${project.name}-export.json`;
      contentType = "application/json";
    }

    const storageKey = `exports/${job.id}-${filename}`;
    const objectStorage = getStorage();
    await objectStorage.putObject({ key: storageKey, body: Buffer.from(content, "utf-8"), contentType });

    return { filename, contentType, format, storageKey };
  });

  await storage.updateJob(job.id, { resultJson: result });
  logger.info("Export job completed", { source: "jobs", jobId: job.id, ...result });

  await storage.createAuditEvent(tenantId, null, "completed", "job", job.id, result, projectId);
}
