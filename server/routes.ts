import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireTenantAccess, hashPassword, comparePasswords } from "./auth";
import { scanTextForPii, redactText, classifyDocumentKind } from "./pii";
import { buildPreview, detectKind } from "./parsers/preview";
import { sanitizeBuffer } from "./parsers/sanitize";
import { registerSchema, loginSchema, createProjectFormSchema, createInviteFormSchema, createCompanyFormSchema, PHASE_DEPENDENCIES, PHASES } from "@shared/schema";
import { randomBytes } from "crypto";
import passport from "passport";
import multer from "multer";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { ApiError } from "./errors";
import { logger } from "./logger";
import { requireRole } from "./rbac";
import { getStorage, buildStorageKey } from "./storage-adapter";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many uploads, please try again later." },
});

function escHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function getArtifactTitle(type: string, phaseId: number | null): string {
  const titles: Record<string, string> = {
    valuescope: "Phase 1 - ValueScope Analysis",
    zerobase_rebuild: "Phase 2 - ZeroBase Rebuild",
    smartstack: "Phase 3 - SmartStack Technology",
    valuecase: "Phase 4 - ValueCase Business Case",
    orgdna: "Phase 5 - OrgDNA Operating Model",
    aipolicycore: "Phase 6 - AIPolicyCore Governance",
    adoptloop: "Phase 7 - AdoptLoop Change Management",
    phase_0_output: "Phase 0 - Setup Baseline",
  };
  return titles[type] || `Phase ${phaseId ?? "?"} - ${type}`;
}

function renderStringList(items: any[], fallback = "No items available"): string[] {
  if (!Array.isArray(items) || items.length === 0) return [fallback];
  return items.map((item) => (typeof item === "string" ? item : JSON.stringify(item)));
}

function renderArtifactMarkdown(type: string, data: any, phaseId: number | null, template: string): string {
  if (!data || typeof data !== "object") return "";
  let md = `## ${getArtifactTitle(type, phaseId)}\n\n`;

  if (data.executiveSummary) {
    md += `### Executive Summary\n\n${data.executiveSummary}\n\n`;
  }

  if (type === "valuescope") {
    const n = data.narrative || data;
    if (!data.executiveSummary && n.executiveSummary) md += `### Executive Summary\n\n${n.executiveSummary}\n\n`;
    if (n.baselineAnalysis) md += `### Baseline Analysis\n\n${n.baselineAnalysis}\n\n`;
    if (n.opportunityNarrative && template !== "compliance") md += `### Opportunity Assessment\n\n${n.opportunityNarrative}\n\n`;
    if (n.roiSummary && template !== "compliance") md += `### ROI Summary\n\n${n.roiSummary}\n\n`;
    if (n.confidenceAssessment) md += `### Confidence Assessment\n\n${n.confidenceAssessment}\n\n`;
    if (n.recommendations && template === "technical") {
      md += `### Recommendations\n\n`;
      renderStringList(n.recommendations).forEach((r: string) => { md += `- ${r}\n`; });
      md += `\n`;
    }
    if (data.summary) {
      md += `### Summary Metrics\n\n`;
      md += `- **Total Approved Facts:** ${data.summary.totalApprovedFacts || 0}\n`;
      md += `- **KPI Count:** ${data.summary.kpiCount || 0}\n`;
      md += `- **Average Confidence:** ${((data.summary.averageConfidence || 0) * 100).toFixed(0)}%\n\n`;
    }
  }

  if (type === "zerobase_rebuild") {
    if (Array.isArray(data.processAssessments) && template !== "executive") {
      md += `### Process Assessments\n\n`;
      data.processAssessments.forEach((p: any) => {
        md += `#### ${p.processName || "Process"}\n\n`;
        if (p.currentState) md += `**Current State:** ${p.currentState}\n\n`;
        if (p.targetState) md += `**Target State:** ${p.targetState}\n\n`;
        if (p.aiEligibility) md += `**AI Eligibility Score:** ${p.aiEligibility.overallScore || "N/A"}/10\n\n`;
        if (p.automationSplit) md += `**Automation Split:** AI ${p.automationSplit.aiPercent}% / Human ${p.automationSplit.humanPercent}%\n\n`;
        if (p.expectedImpact) md += `**Expected Impact:** ${p.expectedImpact}\n\n`;
      });
    }
    if (Array.isArray(data.dePara) && template === "technical") {
      md += `### De-Para Comparisons\n\n`;
      data.dePara.forEach((d: any) => {
        md += `#### ${d.processName || "Process"}\n\n`;
        md += `| Aspect | Details |\n|---|---|\n`;
        md += `| Before | ${d.before || ""} |\n`;
        md += `| After | ${d.after || ""} |\n\n`;
        if (d.keyChanges) { md += `**Key Changes:** ${renderStringList(d.keyChanges).join(", ")}\n\n`; }
      });
    }
    if (Array.isArray(data.quickWins)) {
      md += `### Quick Wins\n\n`;
      renderStringList(data.quickWins).forEach((w: string) => { md += `- ${w}\n`; });
      md += `\n`;
    }
  }

  if (type === "smartstack") {
    if (data.currentTechAssessment && template !== "executive") md += `### Current Technology Assessment\n\n${data.currentTechAssessment}\n\n`;
    if (data.recommendedStack && template === "technical") {
      md += `### Recommended Stack\n\n`;
      for (const [layer, items] of Object.entries(data.recommendedStack)) {
        if (Array.isArray(items) && items.length > 0) {
          md += `#### ${layer.replace(/([A-Z])/g, " $1").replace(/^./, (s: string) => s.toUpperCase())}\n\n`;
          md += `| Component | Recommendation | Category | Rationale |\n|---|---|---|---|\n`;
          (items as any[]).forEach((item: any) => {
            md += `| ${item.component || ""} | ${item.recommendation || ""} | ${item.category || ""} | ${item.rationale || ""} |\n`;
          });
          md += `\n`;
        }
      }
    }
    if (Array.isArray(data.buildBuyPartnerMatrix)) {
      md += `### Build/Buy/Partner Matrix\n\n`;
      md += `| Component | Decision | Justification | Est. Cost | Timeline |\n|---|---|---|---|---|\n`;
      data.buildBuyPartnerMatrix.forEach((item: any) => {
        md += `| ${item.component || ""} | ${item.decision || ""} | ${item.justification || ""} | ${item.estimatedCost || ""} | ${item.implementationTime || ""} |\n`;
      });
      md += `\n`;
    }
    if (data.implementationRoadmap && template !== "compliance") {
      md += `### Implementation Roadmap\n\n`;
      const rm = data.implementationRoadmap;
      if (rm.wave1_quickWins) { md += `**Wave 1 (${rm.wave1_quickWins.weeks || "0-8 weeks"}):** ${renderStringList(rm.wave1_quickWins.items).join("; ")}\n\n`; }
      if (rm.wave2_scale) { md += `**Wave 2 (${rm.wave2_scale.weeks || "8-16 weeks"}):** ${renderStringList(rm.wave2_scale.items).join("; ")}\n\n`; }
      if (rm.wave3_optimization) { md += `**Wave 3 (${rm.wave3_optimization.weeks || "16-24 weeks"}):** ${renderStringList(rm.wave3_optimization.items).join("; ")}\n\n`; }
    }
  }

  if (type === "valuecase") {
    if (data.investmentSummary && template !== "compliance") {
      md += `### Investment Summary\n\n`;
      if (data.investmentSummary.totalInvestment) md += `**Total Investment:** ${data.investmentSummary.totalInvestment}\n\n`;
      if (Array.isArray(data.investmentSummary.categories)) {
        md += `| Category | Amount | Description |\n|---|---|---|\n`;
        data.investmentSummary.categories.forEach((c: any) => {
          md += `| ${c.category || ""} | ${c.amount || ""} | ${c.description || ""} |\n`;
        });
        md += `\n`;
      }
    }
    if (data.scenarioModels) {
      md += `### Scenario Analysis\n\n`;
      for (const [scenario, model] of Object.entries(data.scenarioModels)) {
        const m = model as any;
        md += `#### ${scenario.charAt(0).toUpperCase() + scenario.slice(1)}\n\n`;
        if (m.annualSavings) md += `- **Annual Savings:** ${m.annualSavings}\n`;
        if (m.paybackMonths) md += `- **Payback Period:** ${m.paybackMonths} months\n`;
        if (m.roi5Year) md += `- **5-Year ROI:** ${m.roi5Year}\n`;
        if (Array.isArray(m.assumptions)) { md += `- **Assumptions:** ${m.assumptions.join("; ")}\n`; }
        md += `\n`;
      }
    }
    if (data.financialProjection60Month && template === "technical") md += `### 60-Month Financial Projection\n\n${data.financialProjection60Month}\n\n`;
    if (Array.isArray(data.sensitivityAnalysis) && template !== "executive") {
      md += `### Sensitivity Analysis\n\n`;
      md += `| Variable | Impact | Range |\n|---|---|---|\n`;
      data.sensitivityAnalysis.forEach((s: any) => {
        md += `| ${s.variable || ""} | ${s.impact || ""} | ${s.range || ""} |\n`;
      });
      md += `\n`;
    }
  }

  if (type === "orgdna") {
    if (data.currentStateAnalysis && template !== "executive") md += `### Current State Analysis\n\n${data.currentStateAnalysis}\n\n`;
    if (data.targetOperatingModel) {
      md += `### Target Operating Model\n\n`;
      const tom = data.targetOperatingModel;
      if (tom.orgStructure) md += `${tom.orgStructure}\n\n`;
      if (Array.isArray(tom.designPrinciples)) {
        md += `**Design Principles:**\n`;
        tom.designPrinciples.forEach((p: string) => { md += `- ${p}\n`; });
        md += `\n`;
      }
    }
    if (Array.isArray(data.newRoles) && template !== "executive") {
      md += `### New Roles\n\n`;
      md += `| Title | Purpose | Reports To |\n|---|---|---|\n`;
      data.newRoles.forEach((r: any) => {
        md += `| ${r.title || ""} | ${r.purpose || ""} | ${r.reportsTo || ""} |\n`;
      });
      md += `\n`;
    }
    if (Array.isArray(data.raciMatrix) && template === "technical") {
      md += `### RACI Matrix\n\n`;
      md += `| Process | Responsible | Accountable | Consulted | Informed |\n|---|---|---|---|---|\n`;
      data.raciMatrix.forEach((r: any) => {
        md += `| ${r.process || ""} | ${r.responsible || ""} | ${r.accountable || ""} | ${Array.isArray(r.consulted) ? r.consulted.join(", ") : ""} | ${Array.isArray(r.informed) ? r.informed.join(", ") : ""} |\n`;
      });
      md += `\n`;
    }
    if (data.transitionPlan && template !== "executive") {
      md += `### Transition Plan\n\n`;
      const tp = data.transitionPlan;
      if (tp.phase1_foundation) md += `**Phase 1 (${tp.phase1_foundation.weeks || "0-8 weeks"}):** ${renderStringList(tp.phase1_foundation.actions).join("; ")}\n\n`;
      if (tp.phase2_migration) md += `**Phase 2 (${tp.phase2_migration.weeks || "8-16 weeks"}):** ${renderStringList(tp.phase2_migration.actions).join("; ")}\n\n`;
      if (tp.phase3_optimization) md += `**Phase 3 (${tp.phase3_optimization.weeks || "16-24 weeks"}):** ${renderStringList(tp.phase3_optimization.actions).join("; ")}\n\n`;
    }
  }

  if (type === "aipolicycore") {
    if (Array.isArray(data.aiUseCaseInventory)) {
      md += `### AI Use Case Inventory\n\n`;
      md += `| Use Case | Process | Risk Level | Human Oversight |\n|---|---|---|---|\n`;
      data.aiUseCaseInventory.forEach((u: any) => {
        md += `| ${u.useCase || ""} | ${u.process || ""} | ${u.riskLevel || ""} | ${u.humanOversight || ""} |\n`;
      });
      md += `\n`;
    }
    if (data.governancePolicies) {
      md += `### Governance Policies\n\n`;
      const gp = data.governancePolicies;
      if (gp.aiUsagePolicy) md += `**AI Usage Policy:** ${gp.aiUsagePolicy}\n\n`;
      if (gp.dataGovernance) md += `**Data Governance:** ${gp.dataGovernance}\n\n`;
      if (gp.modelManagement && template !== "executive") md += `**Model Management:** ${gp.modelManagement}\n\n`;
      if (gp.incidentResponse && template !== "executive") md += `**Incident Response:** ${gp.incidentResponse}\n\n`;
    }
    if (data.complianceMapping && (template === "compliance" || template === "technical")) {
      md += `### Compliance Mapping\n\n`;
      const cm = data.complianceMapping;
      if (Array.isArray(cm.lgpd)) { md += `**LGPD:**\n`; cm.lgpd.forEach((r: string) => { md += `- ${r}\n`; }); md += `\n`; }
      if (Array.isArray(cm.aiAct)) { md += `**AI Act:**\n`; cm.aiAct.forEach((r: string) => { md += `- ${r}\n`; }); md += `\n`; }
      if (Array.isArray(cm.isoNist)) { md += `**ISO/NIST:**\n`; cm.isoNist.forEach((r: string) => { md += `- ${r}\n`; }); md += `\n`; }
    }
    if (data.auditPlan && template !== "executive") {
      md += `### Audit Plan\n\n`;
      if (data.auditPlan.frequency) md += `**Frequency:** ${data.auditPlan.frequency}\n\n`;
      if (Array.isArray(data.auditPlan.scope)) { md += `**Scope:** ${data.auditPlan.scope.join(", ")}\n\n`; }
      if (Array.isArray(data.auditPlan.metrics)) { md += `**Metrics:** ${data.auditPlan.metrics.join(", ")}\n\n`; }
    }
  }

  if (type === "adoptloop") {
    if (Array.isArray(data.changeImpactAssessment) && template !== "executive") {
      md += `### Change Impact Assessment\n\n`;
      md += `| Area | Impact | Readiness |\n|---|---|---|\n`;
      data.changeImpactAssessment.forEach((c: any) => {
        md += `| ${c.area || ""} | ${c.impactLevel || ""} | ${c.readinessLevel || ""} |\n`;
      });
      md += `\n`;
    }
    if (data.adoptionRoadmap) {
      md += `### Adoption Roadmap\n\n`;
      const ar = data.adoptionRoadmap;
      if (ar.wave1_quickWins) { md += `**Wave 1 (${ar.wave1_quickWins.weeks || "0-8 weeks"}):** ${renderStringList(ar.wave1_quickWins.milestones).join("; ")}\n\n`; }
      if (ar.wave2_scale) { md += `**Wave 2 (${ar.wave2_scale.weeks || "8-16 weeks"}):** ${renderStringList(ar.wave2_scale.milestones).join("; ")}\n\n`; }
      if (ar.wave3_optimization) { md += `**Wave 3 (${ar.wave3_optimization.weeks || "16-24 weeks"}):** ${renderStringList(ar.wave3_optimization.milestones).join("; ")}\n\n`; }
    }
    if (data.communicationPlan && template !== "executive") {
      md += `### Communication Plan\n\n`;
      for (const [audience, plan] of Object.entries(data.communicationPlan)) {
        const p = plan as any;
        md += `**${audience.charAt(0).toUpperCase() + audience.slice(1)}:** ${p.frequency || ""} via ${p.format || ""}`;
        if (Array.isArray(p.keyMessages)) md += ` - ${p.keyMessages.join("; ")}`;
        md += `\n\n`;
      }
    }
    if (Array.isArray(data.upskillingProgram) && template === "technical") {
      md += `### Upskilling Program\n\n`;
      md += `| Track | Audience | Duration | Format |\n|---|---|---|---|\n`;
      data.upskillingProgram.forEach((u: any) => {
        md += `| ${u.track || ""} | ${u.audience || ""} | ${u.duration || ""} | ${u.deliveryFormat || ""} |\n`;
      });
      md += `\n`;
    }
  }

  if (type === "phase_0_output") {
    if (data.documentChecks || data.documents) {
      const docs = data.documentChecks || data.documents || [];
      if (Array.isArray(docs) && docs.length > 0) {
        md += `### Document Checks\n\n`;
        md += `| Document | Status | PII Risk |\n|---|---|---|\n`;
        docs.forEach((d: any) => {
          md += `| ${d.filename || d.name || ""} | ${d.status || ""} | ${d.piiRisk || ""} |\n`;
        });
        md += `\n`;
      }
    }
    if (data.piiResults || data.piiFindings) {
      const pii = data.piiResults || data.piiFindings || [];
      if (Array.isArray(pii) && pii.length > 0) {
        md += `### PII Scan Results\n\n`;
        pii.forEach((p: any) => {
          md += `- **${p.document || p.filename || "Document"}:** ${p.finding || p.result || JSON.stringify(p)}\n`;
        });
        md += `\n`;
      }
    }
  }

  if (Array.isArray(data.caveats) && data.caveats.length > 0) {
    md += `### Caveats & Limitations\n\n`;
    data.caveats.forEach((c: string) => { md += `- ${c}\n`; });
    md += `\n`;
  }

  if (Array.isArray(data.recommendations) && data.recommendations.length > 0 && type !== "valuescope") {
    md += `### Recommendations\n\n`;
    data.recommendations.forEach((r: string) => { md += `- ${r}\n`; });
    md += `\n`;
  }

  md += `---\n\n`;
  return md;
}

function kpiBox(label: string, value: string, subtitle?: string, color?: string): string {
  const bg = color || "#1a365d";
  return `<div class="kpi-card" style="border-top:4px solid ${bg}"><div class="kpi-value">${escHtml(value)}</div><div class="kpi-label">${escHtml(label)}</div>${subtitle ? `<div class="kpi-sub">${escHtml(subtitle)}</div>` : ""}</div>`;
}

function comparisonPanel(title: string, beforeLabel: string, beforeContent: string, afterLabel: string, afterContent: string, changes?: string[]): string {
  let html = `<div class="comparison-panel"><h4 class="comparison-title">${escHtml(title)}</h4><div class="comparison-grid">`;
  html += `<div class="comparison-before"><div class="comparison-header before-header">${escHtml(beforeLabel)}</div><div class="comparison-body">${escHtml(beforeContent)}</div></div>`;
  html += `<div class="comparison-arrow"><span>&#8594;</span></div>`;
  html += `<div class="comparison-after"><div class="comparison-header after-header">${escHtml(afterLabel)}</div><div class="comparison-body">${escHtml(afterContent)}</div></div>`;
  html += `</div>`;
  if (changes && changes.length > 0) {
    html += `<div class="comparison-changes"><strong>Key Changes:</strong> ${changes.map(c => escHtml(c)).join(" | ")}</div>`;
  }
  html += `</div>`;
  return html;
}

function scenarioCard(name: string, metrics: Record<string, string>, isBase?: boolean): string {
  const cls = isBase ? "scenario-card scenario-base" : "scenario-card";
  let html = `<div class="${cls}"><div class="scenario-header">${escHtml(name)}${isBase ? '<span class="scenario-tag">RECOMMENDED</span>' : ""}</div><div class="scenario-body">`;
  for (const [k, v] of Object.entries(metrics)) {
    html += `<div class="scenario-metric"><span class="scenario-metric-label">${escHtml(k)}</span><span class="scenario-metric-value">${escHtml(v)}</span></div>`;
  }
  html += `</div></div>`;
  return html;
}

function roadmapWave(waveName: string, weeks: string, items: string[], color: string): string {
  let html = `<div class="wave-card" style="border-left:4px solid ${color}"><div class="wave-header"><strong>${escHtml(waveName)}</strong><span class="wave-weeks">${escHtml(weeks)}</span></div><ul class="wave-items">`;
  items.forEach(item => { html += `<li>${escHtml(item)}</li>`; });
  html += `</ul></div>`;
  return html;
}

function stackLayer(layerName: string, items: any[]): string {
  const layerColors: Record<string, string> = { experience: "#6366f1", application: "#3b82f6", intelligence: "#8b5cf6", data: "#10b981" };
  const color = layerColors[layerName.toLowerCase()] || "#64748b";
  let html = `<div class="stack-layer" style="border-left:5px solid ${color}"><div class="stack-layer-name">${escHtml(layerName.replace(/([A-Z])/g, " $1").replace(/^./, (s: string) => s.toUpperCase()))}</div><div class="stack-items">`;
  items.forEach((item: any) => {
    html += `<div class="stack-item"><strong>${escHtml(item.component || item.recommendation || "")}</strong>`;
    if (item.category) html += ` <span class="badge badge-info">${escHtml(item.category)}</span>`;
    if (item.rationale) html += `<div class="stack-rationale">${escHtml(item.rationale)}</div>`;
    html += `</div>`;
  });
  html += `</div></div>`;
  return html;
}

function riskBadge(level: string): string {
  const normalized = (level || "").toLowerCase();
  return `<span class="badge badge-${normalized}">${escHtml(level)}</span>`;
}

function renderArtifactHtml(type: string, data: any, phaseId: number | null, template: string): string {
  if (!data || typeof data !== "object") return "";
  const sectionId = `section-${type}`;
  let html = `<section id="${sectionId}" class="artifact-section"><h2 class="section-title">${escHtml(getArtifactTitle(type, phaseId))}</h2>`;

  if (data.executiveSummary) {
    html += `<div class="executive-summary"><h3>Executive Summary</h3><p>${escHtml(data.executiveSummary).replace(/\n/g, "<br>")}</p></div>`;
  }

  if (type === "valuescope") {
    const n = data.narrative || data;
    if (!data.executiveSummary && n.executiveSummary) {
      html += `<div class="executive-summary"><h3>Executive Summary</h3><p>${escHtml(n.executiveSummary).replace(/\n/g, "<br>")}</p></div>`;
    }
    if (data.summary) {
      html += `<div class="kpi-row">`;
      html += kpiBox("Total Facts", String(data.summary.totalApprovedFacts || 0), "Approved", "#2563eb");
      html += kpiBox("Average Confidence", `${((data.summary.averageConfidence || 0) * 100).toFixed(0)}%`, "Data Quality", "#059669");
      html += kpiBox("KPI Count", String(data.summary.kpiCount || 0), "Tracked Metrics", "#7c3aed");
      html += `</div>`;
    }
    if (n.baselineAnalysis) html += `<div class="content-block"><h3>Baseline Analysis</h3><p>${escHtml(n.baselineAnalysis).replace(/\n/g, "<br>")}</p></div>`;
    if (n.opportunityNarrative && template !== "compliance") html += `<div class="content-block"><h3>Opportunity Assessment</h3><p>${escHtml(n.opportunityNarrative).replace(/\n/g, "<br>")}</p></div>`;
    if (n.roiSummary && template !== "compliance") html += `<div class="content-block highlight-block"><h3>ROI Summary</h3><p>${escHtml(n.roiSummary).replace(/\n/g, "<br>")}</p></div>`;
    if (n.confidenceAssessment) html += `<div class="content-block"><h3>Confidence Assessment</h3><p>${escHtml(n.confidenceAssessment).replace(/\n/g, "<br>")}</p></div>`;
    if (n.recommendations && template === "technical") {
      html += `<div class="content-block"><h3>Recommendations</h3><ul class="styled-list">`;
      renderStringList(n.recommendations).forEach((r: string) => { html += `<li>${escHtml(r)}</li>`; });
      html += `</ul></div>`;
    }
  }

  if (type === "zerobase_rebuild") {
    if (data.automationSummary || (Array.isArray(data.processAssessments) && data.processAssessments.length > 0)) {
      const totalAi = data.automationSummary?.avgAiPercent || (Array.isArray(data.processAssessments) ? Math.round(data.processAssessments.reduce((sum: number, p: any) => sum + (p.automationSplit?.aiPercent || 0), 0) / (data.processAssessments.length || 1)) : 0);
      const totalHuman = 100 - totalAi;
      html += `<div class="kpi-row">`;
      html += kpiBox("AI Automation", `${totalAi}%`, "Target AI Coverage", "#2563eb");
      html += kpiBox("Human Tasks", `${totalHuman}%`, "Requires Human Judgment", "#dc2626");
      html += kpiBox("Processes Analyzed", String(Array.isArray(data.processAssessments) ? data.processAssessments.length : 0), "Total Assessments", "#7c3aed");
      html += `</div>`;
      html += `<div class="gauge-bar"><div class="gauge-fill" style="width:${totalAi}%;background:linear-gradient(90deg,#2563eb,#3b82f6)"></div><div class="gauge-label-left">AI ${totalAi}%</div><div class="gauge-label-right">Human ${totalHuman}%</div></div>`;
    }
    if (Array.isArray(data.processAssessments) && template !== "executive") {
      html += `<h3>Process Assessments</h3>`;
      data.processAssessments.forEach((p: any) => {
        if (p.currentState && p.targetState) {
          html += comparisonPanel(
            p.processName || "Process",
            "AS-IS (Current State)", p.currentState,
            "TO-BE (Target State)", p.targetState,
            Array.isArray(p.keyChanges) ? p.keyChanges : undefined
          );
        } else {
          html += `<div class="content-card"><h4>${escHtml(p.processName || "Process")}</h4>`;
          if (p.currentState) html += `<p><span class="field-label">Current State:</span> ${escHtml(p.currentState)}</p>`;
          if (p.targetState) html += `<p><span class="field-label">Target State:</span> ${escHtml(p.targetState)}</p>`;
          html += `</div>`;
        }
        if (p.aiEligibility) html += `<div class="metric-inline"><span>AI Eligibility:</span> <strong>${p.aiEligibility.overallScore || "N/A"}/10</strong></div>`;
        if (p.automationSplit) html += `<div class="metric-inline"><span>Split:</span> <strong>AI ${p.automationSplit.aiPercent}% / Human ${p.automationSplit.humanPercent}%</strong></div>`;
        if (p.expectedImpact) html += `<div class="metric-inline"><span>Expected Impact:</span> ${escHtml(p.expectedImpact)}</div>`;
      });
    }
    if (Array.isArray(data.dePara) && template === "technical") {
      html += `<h3>De-Para (Before/After) Comparisons</h3>`;
      data.dePara.forEach((d: any) => {
        html += comparisonPanel(d.processName || "Process", "Before", d.before || "", "After", d.after || "", Array.isArray(d.keyChanges) ? d.keyChanges : undefined);
      });
    }
    if (Array.isArray(data.quickWins)) {
      html += `<div class="content-block highlight-block"><h3>Quick Wins</h3><ul class="styled-list">`;
      renderStringList(data.quickWins).forEach((w: string) => { html += `<li>${escHtml(w)}</li>`; });
      html += `</ul></div>`;
    }
  }

  if (type === "smartstack") {
    if (data.currentTechAssessment && template !== "executive") html += `<div class="content-block"><h3>Current Technology Assessment</h3><p>${escHtml(data.currentTechAssessment).replace(/\n/g, "<br>")}</p></div>`;
    if (data.recommendedStack && template === "technical") {
      html += `<h3>Recommended Technology Stack</h3><div class="stack-diagram">`;
      for (const [layer, items] of Object.entries(data.recommendedStack)) {
        if (Array.isArray(items) && items.length > 0) {
          html += stackLayer(layer, items);
        }
      }
      html += `</div>`;
    }
    if (Array.isArray(data.buildBuyPartnerMatrix)) {
      html += `<h3>Build / Buy / Partner Decision Matrix</h3>`;
      html += `<table class="styled-table"><thead><tr><th>Component</th><th>Decision</th><th>Justification</th><th>Est. Cost</th><th>Timeline</th></tr></thead><tbody>`;
      data.buildBuyPartnerMatrix.forEach((item: any) => {
        const decisionClass = (item.decision || "").toLowerCase();
        html += `<tr><td><strong>${escHtml(item.component || "")}</strong></td><td><span class="badge badge-${decisionClass === "build" ? "info" : decisionClass === "buy" ? "success" : "warning"}">${escHtml(item.decision || "")}</span></td><td>${escHtml(item.justification || "")}</td><td class="text-right">${escHtml(item.estimatedCost || "")}</td><td>${escHtml(item.implementationTime || "")}</td></tr>`;
      });
      html += `</tbody></table>`;
    }
    if (data.implementationRoadmap && template !== "compliance") {
      html += `<h3>Implementation Roadmap</h3><div class="roadmap-container">`;
      const rm = data.implementationRoadmap;
      if (rm.wave1_quickWins) html += roadmapWave("Wave 1: Quick Wins", rm.wave1_quickWins.weeks || "0-8 weeks", renderStringList(rm.wave1_quickWins.items), "#059669");
      if (rm.wave2_scale) html += roadmapWave("Wave 2: Scale", rm.wave2_scale.weeks || "8-16 weeks", renderStringList(rm.wave2_scale.items), "#2563eb");
      if (rm.wave3_optimization) html += roadmapWave("Wave 3: Optimization", rm.wave3_optimization.weeks || "16-24 weeks", renderStringList(rm.wave3_optimization.items), "#7c3aed");
      html += `</div>`;
    }
  }

  if (type === "valuecase") {
    if (data.investmentSummary && template !== "compliance") {
      html += `<div class="kpi-row">`;
      if (data.investmentSummary.totalInvestment) html += kpiBox("Total Investment", String(data.investmentSummary.totalInvestment), "Capital Required", "#dc2626");
      if (data.scenarioModels?.base?.roi5Year) html += kpiBox("5-Year ROI", String(data.scenarioModels.base.roi5Year), "Base Scenario", "#059669");
      if (data.scenarioModels?.base?.paybackMonths) html += kpiBox("Payback Period", `${data.scenarioModels.base.paybackMonths} mo`, "Base Scenario", "#2563eb");
      if (data.scenarioModels?.base?.annualSavings) html += kpiBox("Annual Savings", String(data.scenarioModels.base.annualSavings), "Base Scenario", "#7c3aed");
      html += `</div>`;
      if (Array.isArray(data.investmentSummary.categories)) {
        html += `<h3>Investment Breakdown</h3>`;
        html += `<table class="styled-table"><thead><tr><th>Category</th><th>Amount</th><th>Description</th></tr></thead><tbody>`;
        data.investmentSummary.categories.forEach((c: any) => {
          html += `<tr><td><strong>${escHtml(c.category || "")}</strong></td><td class="text-right">${escHtml(c.amount || "")}</td><td>${escHtml(c.description || "")}</td></tr>`;
        });
        html += `</tbody></table>`;
      }
    }
    if (data.scenarioModels) {
      html += `<h3>Scenario Comparison</h3><div class="scenario-grid">`;
      for (const [scenario, model] of Object.entries(data.scenarioModels)) {
        const m = model as any;
        const metrics: Record<string, string> = {};
        if (m.annualSavings) metrics["Annual Savings"] = String(m.annualSavings);
        if (m.paybackMonths) metrics["Payback"] = `${m.paybackMonths} months`;
        if (m.roi5Year) metrics["5-Year ROI"] = String(m.roi5Year);
        if (m.npv) metrics["NPV"] = String(m.npv);
        html += scenarioCard(scenario.charAt(0).toUpperCase() + scenario.slice(1), metrics, scenario === "base");
      }
      html += `</div>`;
      for (const [scenario, model] of Object.entries(data.scenarioModels)) {
        const m = model as any;
        if (Array.isArray(m.assumptions) && m.assumptions.length > 0) {
          html += `<div class="assumptions-block"><strong>${escHtml(scenario.charAt(0).toUpperCase() + scenario.slice(1))} Assumptions:</strong> ${m.assumptions.map((a: string) => escHtml(a)).join("; ")}</div>`;
        }
      }
    }
    if (data.financialProjection60Month && template === "technical") html += `<div class="content-block"><h3>60-Month Financial Projection</h3><p>${escHtml(data.financialProjection60Month).replace(/\n/g, "<br>")}</p></div>`;
    if (Array.isArray(data.sensitivityAnalysis) && template !== "executive") {
      html += `<h3>Sensitivity Analysis</h3>`;
      html += `<table class="styled-table"><thead><tr><th>Variable</th><th>Impact</th><th>Range</th></tr></thead><tbody>`;
      data.sensitivityAnalysis.forEach((s: any) => {
        html += `<tr><td>${escHtml(s.variable || "")}</td><td>${escHtml(s.impact || "")}</td><td>${escHtml(s.range || "")}</td></tr>`;
      });
      html += `</tbody></table>`;
    }
  }

  if (type === "orgdna") {
    if (data.currentStateAnalysis && template !== "executive") html += `<div class="content-block"><h3>Current State Analysis</h3><p>${escHtml(data.currentStateAnalysis).replace(/\n/g, "<br>")}</p></div>`;
    if (data.targetOperatingModel) {
      html += `<div class="content-block"><h3>Target Operating Model</h3>`;
      const tom = data.targetOperatingModel;
      if (tom.orgStructure) html += `<p>${escHtml(tom.orgStructure).replace(/\n/g, "<br>")}</p>`;
      if (Array.isArray(tom.designPrinciples)) {
        html += `<div class="principles-grid">`;
        tom.designPrinciples.forEach((p: string, i: number) => {
          html += `<div class="principle-card"><span class="principle-num">${i + 1}</span><span>${escHtml(p)}</span></div>`;
        });
        html += `</div>`;
      }
      html += `</div>`;
    }
    if (Array.isArray(data.newRoles) && template !== "executive") {
      html += `<h3>New Roles & Responsibilities</h3><div class="roles-grid">`;
      data.newRoles.forEach((r: any) => {
        html += `<div class="role-card"><div class="role-title">${escHtml(r.title || "")}</div><div class="role-purpose">${escHtml(r.purpose || "")}</div><div class="role-reports">Reports to: <strong>${escHtml(r.reportsTo || "N/A")}</strong></div></div>`;
      });
      html += `</div>`;
    }
    if (Array.isArray(data.raciMatrix) && template === "technical") {
      html += `<h3>RACI Matrix</h3>`;
      html += `<table class="styled-table raci-table"><thead><tr><th>Process</th><th>R</th><th>A</th><th>C</th><th>I</th></tr></thead><tbody>`;
      data.raciMatrix.forEach((r: any) => {
        html += `<tr><td><strong>${escHtml(r.process || "")}</strong></td><td class="raci-r">${escHtml(r.responsible || "")}</td><td class="raci-a">${escHtml(r.accountable || "")}</td><td>${Array.isArray(r.consulted) ? r.consulted.map((c: string) => escHtml(c)).join(", ") : ""}</td><td>${Array.isArray(r.informed) ? r.informed.map((i: string) => escHtml(i)).join(", ") : ""}</td></tr>`;
      });
      html += `</tbody></table>`;
    }
    if (data.transitionPlan && template !== "executive") {
      html += `<h3>Transition Plan</h3><div class="roadmap-container">`;
      const tp = data.transitionPlan;
      if (tp.phase1_foundation) html += roadmapWave("Phase 1: Foundation", tp.phase1_foundation.weeks || "0-8 weeks", renderStringList(tp.phase1_foundation.actions), "#059669");
      if (tp.phase2_migration) html += roadmapWave("Phase 2: Migration", tp.phase2_migration.weeks || "8-16 weeks", renderStringList(tp.phase2_migration.actions), "#2563eb");
      if (tp.phase3_optimization) html += roadmapWave("Phase 3: Optimization", tp.phase3_optimization.weeks || "16-24 weeks", renderStringList(tp.phase3_optimization.actions), "#7c3aed");
      html += `</div>`;
    }
  }

  if (type === "aipolicycore") {
    if (Array.isArray(data.aiUseCaseInventory)) {
      html += `<h3>AI Use Case Inventory</h3>`;
      html += `<table class="styled-table"><thead><tr><th>Use Case</th><th>Process</th><th>Risk Level</th><th>Human Oversight</th></tr></thead><tbody>`;
      data.aiUseCaseInventory.forEach((u: any) => {
        html += `<tr><td><strong>${escHtml(u.useCase || "")}</strong></td><td>${escHtml(u.process || "")}</td><td>${riskBadge(u.riskLevel || "")}</td><td>${escHtml(u.humanOversight || "")}</td></tr>`;
      });
      html += `</tbody></table>`;
    }
    if (data.governancePolicies) {
      html += `<h3>Governance Policies</h3>`;
      const gp = data.governancePolicies;
      if (gp.aiUsagePolicy) html += `<div class="policy-card"><h4>AI Usage Policy</h4><p>${escHtml(gp.aiUsagePolicy).replace(/\n/g, "<br>")}</p></div>`;
      if (gp.dataGovernance) html += `<div class="policy-card"><h4>Data Governance</h4><p>${escHtml(gp.dataGovernance).replace(/\n/g, "<br>")}</p></div>`;
      if (gp.modelManagement && template !== "executive") html += `<div class="policy-card"><h4>Model Management</h4><p>${escHtml(gp.modelManagement).replace(/\n/g, "<br>")}</p></div>`;
      if (gp.incidentResponse && template !== "executive") html += `<div class="policy-card"><h4>Incident Response</h4><p>${escHtml(gp.incidentResponse).replace(/\n/g, "<br>")}</p></div>`;
    }
    if (data.complianceMapping && (template === "compliance" || template === "technical")) {
      html += `<h3>Compliance Mapping</h3><div class="compliance-grid">`;
      const cm = data.complianceMapping;
      if (Array.isArray(cm.lgpd)) { html += `<div class="compliance-section"><h4>LGPD</h4><ul class="checklist">`; cm.lgpd.forEach((r: string) => { html += `<li><span class="check-icon">&#10003;</span> ${escHtml(r)}</li>`; }); html += `</ul></div>`; }
      if (Array.isArray(cm.aiAct)) { html += `<div class="compliance-section"><h4>AI Act</h4><ul class="checklist">`; cm.aiAct.forEach((r: string) => { html += `<li><span class="check-icon">&#10003;</span> ${escHtml(r)}</li>`; }); html += `</ul></div>`; }
      if (Array.isArray(cm.isoNist)) { html += `<div class="compliance-section"><h4>ISO/NIST</h4><ul class="checklist">`; cm.isoNist.forEach((r: string) => { html += `<li><span class="check-icon">&#10003;</span> ${escHtml(r)}</li>`; }); html += `</ul></div>`; }
      html += `</div>`;
    }
    if (data.auditPlan && template !== "executive") {
      html += `<div class="content-card"><h3>Audit Plan</h3>`;
      if (data.auditPlan.frequency) html += `<p><span class="field-label">Frequency:</span> ${escHtml(data.auditPlan.frequency)}</p>`;
      if (Array.isArray(data.auditPlan.scope)) html += `<p><span class="field-label">Scope:</span> ${data.auditPlan.scope.map((s: string) => escHtml(s)).join(", ")}</p>`;
      if (Array.isArray(data.auditPlan.metrics)) html += `<p><span class="field-label">Metrics:</span> ${data.auditPlan.metrics.map((m: string) => escHtml(m)).join(", ")}</p>`;
      html += `</div>`;
    }
  }

  if (type === "adoptloop") {
    if (Array.isArray(data.changeImpactAssessment) && template !== "executive") {
      html += `<h3>Change Impact Assessment</h3>`;
      html += `<table class="styled-table"><thead><tr><th>Area</th><th>Impact Level</th><th>Readiness Level</th></tr></thead><tbody>`;
      data.changeImpactAssessment.forEach((c: any) => {
        html += `<tr><td><strong>${escHtml(c.area || "")}</strong></td><td>${riskBadge(c.impactLevel || "")}</td><td>${riskBadge(c.readinessLevel || "")}</td></tr>`;
      });
      html += `</tbody></table>`;
    }
    if (data.adoptionRoadmap) {
      html += `<h3>Adoption Roadmap</h3><div class="roadmap-container">`;
      const ar = data.adoptionRoadmap;
      if (ar.wave1_quickWins) html += roadmapWave("Wave 1: Quick Wins", ar.wave1_quickWins.weeks || "0-8 weeks", renderStringList(ar.wave1_quickWins.milestones), "#059669");
      if (ar.wave2_scale) html += roadmapWave("Wave 2: Scale", ar.wave2_scale.weeks || "8-16 weeks", renderStringList(ar.wave2_scale.milestones), "#2563eb");
      if (ar.wave3_optimization) html += roadmapWave("Wave 3: Optimization", ar.wave3_optimization.weeks || "16-24 weeks", renderStringList(ar.wave3_optimization.milestones), "#7c3aed");
      html += `</div>`;
    }
    if (data.communicationPlan && template !== "executive") {
      html += `<h3>Communication Plan</h3><div class="comm-grid">`;
      for (const [audience, plan] of Object.entries(data.communicationPlan)) {
        const p = plan as any;
        html += `<div class="comm-card"><div class="comm-audience">${escHtml(audience.charAt(0).toUpperCase() + audience.slice(1))}</div>`;
        html += `<div class="comm-details"><span class="field-label">Frequency:</span> ${escHtml(p.frequency || "")}</div>`;
        html += `<div class="comm-details"><span class="field-label">Format:</span> ${escHtml(p.format || "")}</div>`;
        if (Array.isArray(p.keyMessages)) { html += `<ul class="styled-list">`; p.keyMessages.forEach((m: string) => { html += `<li>${escHtml(m)}</li>`; }); html += `</ul>`; }
        html += `</div>`;
      }
      html += `</div>`;
    }
    if (Array.isArray(data.upskillingProgram) && template === "technical") {
      html += `<h3>Upskilling Program</h3>`;
      html += `<table class="styled-table"><thead><tr><th>Track</th><th>Audience</th><th>Duration</th><th>Format</th></tr></thead><tbody>`;
      data.upskillingProgram.forEach((u: any) => {
        html += `<tr><td><strong>${escHtml(u.track || "")}</strong></td><td>${escHtml(u.audience || "")}</td><td>${escHtml(u.duration || "")}</td><td>${escHtml(u.deliveryFormat || "")}</td></tr>`;
      });
      html += `</tbody></table>`;
    }
  }

  if (type === "phase_0_output") {
    const docs = data.documentChecks || data.documents || [];
    if (Array.isArray(docs) && docs.length > 0) {
      html += `<h3>Document Checks</h3>`;
      html += `<table class="styled-table"><thead><tr><th>Document</th><th>Status</th><th>PII Risk</th></tr></thead><tbody>`;
      docs.forEach((d: any) => {
        html += `<tr><td>${escHtml(d.filename || d.name || "")}</td><td><span class="badge badge-${(d.status || "").toLowerCase() === "ready" ? "success" : "warning"}">${escHtml(d.status || "")}</span></td><td>${riskBadge(d.piiRisk || "")}</td></tr>`;
      });
      html += `</tbody></table>`;
    }
    const pii = data.piiResults || data.piiFindings || [];
    if (Array.isArray(pii) && pii.length > 0) {
      html += `<div class="content-block"><h3>PII Scan Results</h3><ul class="styled-list">`;
      pii.forEach((p: any) => {
        html += `<li><strong>${escHtml(p.document || p.filename || "Document")}:</strong> ${escHtml(p.finding || p.result || JSON.stringify(p))}</li>`;
      });
      html += `</ul></div>`;
    }
  }

  if (Array.isArray(data.caveats) && data.caveats.length > 0) {
    html += `<div class="caveats-block"><h3>Caveats &amp; Limitations</h3><ul class="styled-list">`;
    data.caveats.forEach((c: string) => { html += `<li>${escHtml(c)}</li>`; });
    html += `</ul></div>`;
  }

  if (Array.isArray(data.recommendations) && data.recommendations.length > 0 && type !== "valuescope") {
    html += `<div class="content-block highlight-block"><h3>Recommendations</h3><ul class="styled-list">`;
    data.recommendations.forEach((r: string) => { html += `<li>${escHtml(r)}</li>`; });
    html += `</ul></div>`;
  }

  html += `</section>`;
  return html;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<any> {
  const sessionMiddleware = setupAuth(app);

  app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/readyz", (_req, res) => res.json({ status: "ready" }));

  app.get("/api/t/:tenantSlug/search", requireTenantAccess, async (req, res, next) => {
    try {
      const q = String(req.query.q || "").trim();
      if (!q || q.length < 2) {
        return res.json({ documents: [], facts: [], artifacts: [], projects: [] });
      }

      const tenantId = (req as any).tenant.id;
      const pattern = `%${q}%`;

      const [docRows, factRows, artifactRows, projectRows] = await Promise.all([
        storage.searchDocuments(tenantId, pattern, 10),
        storage.searchFacts(tenantId, pattern, 10),
        storage.searchArtifacts(tenantId, pattern, 10),
        storage.searchProjects(tenantId, pattern, 10),
      ]);

      res.json({
        documents: docRows,
        facts: factRows,
        artifacts: artifactRows,
        projects: projectRows,
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/auth/register", authLimiter, async (req, res, next) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) throw new ApiError("VALIDATION", "Invalid input", { errors: parsed.error.flatten() });

      const existing = await storage.getUserByUsername(parsed.data.username);
      if (existing) throw new ApiError("CONFLICT", "Username already taken");

      const existingEmail = await storage.getUserByEmail(parsed.data.email);
      if (existingEmail) throw new ApiError("CONFLICT", "Email already in use");

      const hashedPassword = await hashPassword(parsed.data.password);
      const user = await storage.createUser({
        email: parsed.data.email,
        username: parsed.data.username,
        password: hashedPassword,
        displayName: parsed.data.displayName || null,
      });

      req.login({ id: user.id, email: user.email, username: user.username, displayName: user.displayName }, (err) => {
        if (err) return next(err);
        res.json({ id: user.id, email: user.email, username: user.username, displayName: user.displayName });
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/auth/login", authLimiter, (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: info?.message || "Invalid credentials", requestId: randomBytes(8).toString("hex") } });
      req.login(user, (err) => {
        if (err) return next(err);
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => res.json({ message: "Logged out" }));
  });

  app.get("/api/me", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated", requestId: randomBytes(8).toString("hex") } });
    res.json(req.user);
  });

  app.get("/api/tenants", requireAuth, async (req, res, next) => {
    try {
      const tenantsList = await storage.getTenantsForUser(req.user!.id);
      res.json(tenantsList);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/tenants", requireAuth, async (req, res, next) => {
    try {
      const { name } = req.body;
      if (!name) throw new ApiError("VALIDATION", "Name is required");

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const existing = await storage.getTenantBySlug(slug);
      if (existing) throw new ApiError("CONFLICT", "Tenant slug already exists");

      const tenant = await storage.createTenant({ name, slug });
      await storage.createMembership({ tenantId: tenant.id, userId: req.user!.id, role: "owner" });
      await storage.createAuditEvent(tenant.id, req.user!.id, "created", "tenant", tenant.id);
      res.json(tenant);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/t/:tenantSlug/invites", requireTenantAccess, async (req, res, next) => {
    try {
      const invitesList = await storage.getInvitesForTenant((req as any).tenant.id);
      res.json(invitesList);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/t/:tenantSlug/invites", requireTenantAccess, async (req, res, next) => {
    try {
      const membership = (req as any).membership;
      requireRole(membership.role, "admin");

      const parsed = createInviteFormSchema.safeParse(req.body);
      if (!parsed.success) throw new ApiError("VALIDATION", "Invalid input", { errors: parsed.error.flatten() });

      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const invite = await storage.createInvite({
        tenantId: (req as any).tenant.id,
        email: parsed.data.email,
        role: parsed.data.role,
        token,
        expiresAt,
        createdById: req.user!.id,
      });

      await storage.createAuditEvent((req as any).tenant.id, req.user!.id, "created", "invite", invite.id);
      res.json(invite);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/invites/accept", requireAuth, async (req, res, next) => {
    try {
      const { token } = req.body;
      if (!token) throw new ApiError("VALIDATION", "Token is required");

      const invite = await storage.getInviteByToken(token);
      if (!invite) throw new ApiError("NOT_FOUND", "Invalid invite");
      if (invite.acceptedAt) throw new ApiError("CONFLICT", "Invite already accepted");
      if (new Date() > invite.expiresAt) throw new ApiError("VALIDATION", "Invite expired");

      if (invite.email && req.user!.email !== invite.email) {
        throw new ApiError("FORBIDDEN", "This invite was sent to a different email address");
      }

      const existingMembership = await storage.getMembership(invite.tenantId, req.user!.id);
      if (!existingMembership) {
        await storage.createMembership({ tenantId: invite.tenantId, userId: req.user!.id, role: invite.role });
      }

      await storage.acceptInvite(invite.id);
      await storage.createAuditEvent(invite.tenantId, req.user!.id, "accepted", "invite", invite.id);
      res.json({ message: "Invite accepted" });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/t/:tenantSlug/members", requireTenantAccess, async (req, res, next) => {
    try {
      const members = await storage.getMembershipsForTenant((req as any).tenant.id);
      res.json(members.map((m) => ({
        id: m.id,
        role: m.role,
        createdAt: m.createdAt,
        user: { id: m.user.id, email: m.user.email, username: m.user.username, displayName: m.user.displayName },
      })));
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/t/:tenantSlug/projects", requireTenantAccess, async (req, res, next) => {
    try {
      const projectsList = await storage.getProjectsForTenant((req as any).tenant.id);
      res.json(projectsList);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/t/:tenantSlug/projects", requireTenantAccess, async (req, res, next) => {
    try {
      requireRole((req as any).membership.role, "analyst");
      const parsed = createProjectFormSchema.safeParse(req.body);
      if (!parsed.success) throw new ApiError("VALIDATION", "Invalid input", { errors: parsed.error.flatten() });

      const project = await storage.createProject({
        tenantId: (req as any).tenant.id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        outputLanguage: parsed.data.outputLanguage,
      });
      res.json(project);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/t/:tenantSlug/projects/:projectId", requireTenantAccess, async (req, res, next) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Project not found");
      }
      res.json(project);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/t/:tenantSlug/projects/:projectId", requireTenantAccess, async (req, res, next) => {
    try {
      requireRole((req as any).membership.role, "analyst");
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Project not found");
      }

      const updated = await storage.updateProject(project.id, {
        name: req.body.name || project.name,
        description: req.body.description !== undefined ? req.body.description : project.description,
        outputLanguage: req.body.outputLanguage || project.outputLanguage,
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/t/:tenantSlug/projects/:projectId/documents", requireTenantAccess, async (req, res, next) => {
    try {
      const docs = await storage.getDocumentsForProject(req.params.projectId);
      res.json(docs);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/t/:tenantSlug/projects/:projectId/documents", requireTenantAccess, uploadLimiter, upload.single("file"), async (req, res, next) => {
    try {
      requireRole((req as any).membership.role, "analyst");
      const file = req.file;
      if (!file) throw new ApiError("VALIDATION", "File is required");

      const project = await storage.getProject(req.params.projectId);
      if (!project || project.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Project not found");
      }

      const fileBuffer = file.buffer;
      const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");
      const kind = classifyDocumentKind(file.originalname);

      const storageKey = buildStorageKey((req as any).tenant.id, project.id, file.originalname, sha256);
      const objectStorage = getStorage();
      await objectStorage.putObject({ key: storageKey, body: fileBuffer, contentType: file.mimetype });

      const preview = await buildPreview({ filename: file.originalname, mime: file.mimetype, buf: fileBuffer });
      const piiRisk = preview.pii.hasPii ? (preview.pii.risk as "low" | "medium" | "high") : "low";
      const containsPii = preview.pii.hasPii;

      const doc = await storage.createDocument({
        projectId: project.id,
        tenantId: (req as any).tenant.id,
        filename: file.originalname,
        kind,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey,
        storageProvider: process.env.R2_ENDPOINT ? "r2" : "local",
        sha256,
        status: containsPii ? "blocked" : "ready",
        piiRisk,
        containsPii,
        piiScanJson: preview.pii,
        piiScannedAt: new Date(),
        classificationJson: { kind: preview.kind, warnings: preview.warnings },
      });

      await storage.createAuditEvent((req as any).tenant.id, req.user!.id, "uploaded", "document", doc.id, {
        filename: file.originalname,
        piiRisk,
        containsPii,
      }, project.id);

      res.json(doc);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/documents/:documentId/preview", requireAuth, async (req, res, next) => {
    try {
      const doc = await storage.getDocument(req.params.documentId as string);
      if (!doc) throw new ApiError("NOT_FOUND", "Document not found");

      const membership = await storage.getMembership(doc.tenantId, req.user!.id);
      if (!membership) throw new ApiError("FORBIDDEN", "Access denied");

      const objectStorage = getStorage();
      const fileExists = await objectStorage.exists({ key: doc.storageKey });
      if (!fileExists) throw new ApiError("NOT_FOUND", "File not found");

      const buf = await objectStorage.getObject({ key: doc.storageKey });
      const preview = await buildPreview({ filename: doc.filename, mime: doc.mimeType, buf });

      res.json({
        documentId: doc.id,
        filename: doc.filename,
        kind: preview.kind,
        previewText: preview.previewText ? redactText(preview.previewText) : undefined,
        previewTables: preview.previewTables,
        warnings: preview.warnings,
        pii: preview.pii,
        truncated: false,
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/documents/:documentId/sanitize", requireAuth, async (req, res, next) => {
    try {
      const doc = await storage.getDocument(req.params.documentId);
      if (!doc) throw new ApiError("NOT_FOUND", "Document not found");

      const membership = await storage.getMembership(doc.tenantId, req.user!.id);
      if (!membership) throw new ApiError("FORBIDDEN", "Access denied");
      requireRole(membership.role, "analyst");

      const objectStorage = getStorage();
      const fileExists = await objectStorage.exists({ key: doc.storageKey });
      if (!fileExists) throw new ApiError("NOT_FOUND", "File not found");

      const docKind = detectKind(doc.filename, doc.mimeType);
      const supportedKinds = ["csv", "xlsx", "text", "data"];
      if (!supportedKinds.includes(docKind)) {
        throw new ApiError("VALIDATION", `Cannot auto-sanitize ${docKind} files (${doc.filename}). Delete and re-upload a clean version.`);
      }

      const buf = await objectStorage.getObject({ key: doc.storageKey });
      const sanitized = sanitizeBuffer({ filename: doc.filename, mime: doc.mimeType, buf });
      const sanitizedKey = doc.storageKey.replace(/\/uploads\//, "/sanitized/");
      await objectStorage.putObject({ key: sanitizedKey, body: sanitized, contentType: doc.mimeType || "application/octet-stream" });

      const updated = await storage.updateDocument(doc.id, {
        status: "ready",
        piiRisk: "low",
        sanitizedAt: new Date(),
        sanitizedById: req.user!.id,
        storageKey: sanitizedKey,
        originalStorageKey: doc.storageKey,
      });

      await storage.createAuditEvent(doc.tenantId, req.user!.id, "sanitized", "document", doc.id, undefined, doc.projectId);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/documents/:documentId", requireAuth, async (req, res, next) => {
    try {
      const doc = await storage.getDocument(req.params.documentId);
      if (!doc) throw new ApiError("NOT_FOUND", "Document not found");

      const membership = await storage.getMembership(doc.tenantId, req.user!.id);
      if (!membership) throw new ApiError("FORBIDDEN", "Access denied");
      requireRole(membership.role, "analyst");

      const objectStorage = getStorage();
      await objectStorage.deleteObject({ key: doc.storageKey }).catch(() => {});

      await storage.deleteDocument(doc.id);
      res.json({ message: "Document deleted" });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/t/:tenantSlug/projects/:projectId/run/ingest", requireTenantAccess, async (req, res, next) => {
    try {
      requireRole((req as any).membership.role, "analyst");
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Project not found");
      }

      const job = await storage.createJob({
        projectId: project.id,
        tenantId: (req as any).tenant.id,
        type: "ingest_documents_v1",
        status: "queued",
      });

      await storage.createAuditEvent((req as any).tenant.id, req.user!.id, "queued", "job", job.id, { type: "ingest_documents_v1" }, project.id);
      res.json(job);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/t/:tenantSlug/projects/:projectId/run/extract", requireTenantAccess, async (req, res, next) => {
    try {
      requireRole((req as any).membership.role, "analyst");
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Project not found");
      }

      const job = await storage.createJob({
        projectId: project.id,
        tenantId: (req as any).tenant.id,
        type: "extract_facts_v1",
        status: "queued",
      });

      await storage.createAuditEvent((req as any).tenant.id, req.user!.id, "queued", "job", job.id, { type: "extract_facts_v1" }, project.id);
      res.json(job);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/t/:tenantSlug/projects/:projectId/run/valuescope", requireTenantAccess, async (req, res, next) => {
    try {
      requireRole((req as any).membership.role, "analyst");
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Project not found");
      }

      const job = await storage.createJob({
        projectId: project.id,
        tenantId: (req as any).tenant.id,
        type: "valuescope_v1",
        status: "queued",
        inputJson: { language: project.outputLanguage },
      });

      await storage.createAuditEvent((req as any).tenant.id, req.user!.id, "queued", "job", job.id, { type: "valuescope_v1" }, project.id);
      res.json(job);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/t/:tenantSlug/projects/:projectId/run/sanitize", requireTenantAccess, async (req, res, next) => {
    try {
      requireRole((req as any).membership.role, "analyst");
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Project not found");
      }

      const { documentId } = req.body;
      if (!documentId) throw new ApiError("VALIDATION", "documentId is required");

      const job = await storage.createJob({
        projectId: project.id,
        tenantId: (req as any).tenant.id,
        type: "sanitize_document_v1",
        status: "queued",
        inputJson: { documentId },
      });

      await storage.createAuditEvent((req as any).tenant.id, req.user!.id, "queued", "job", job.id, { type: "sanitize_document_v1", documentId }, project.id);
      res.json(job);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/t/:tenantSlug/projects/:projectId/run/export", requireTenantAccess, async (req, res, next) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Project not found");
      }

      const format = req.body.format || "json";
      const artifactIds = req.body.artifactIds;

      const job = await storage.createJob({
        projectId: project.id,
        tenantId: (req as any).tenant.id,
        type: "export_v1",
        status: "queued",
        inputJson: { format, artifactIds },
      });

      await storage.createAuditEvent((req as any).tenant.id, req.user!.id, "queued", "job", job.id, { type: "export_v1", format }, project.id);
      res.json(job);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/jobs/:jobId/poll", requireAuth, async (req, res, next) => {
    try {
      const job = await storage.getJob(req.params.jobId);
      if (!job) throw new ApiError("NOT_FOUND", "Job not found");
      const membership = await storage.getMembership(job.tenantId, req.user!.id);
      if (!membership) throw new ApiError("FORBIDDEN", "Access denied");
      const steps = await storage.getJobSteps(job.id);
      res.json({ job, steps });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/jobs/:jobId", requireAuth, async (req, res, next) => {
    try {
      const job = await storage.getJob(req.params.jobId);
      if (!job) throw new ApiError("NOT_FOUND", "Job not found");
      const membership = await storage.getMembership(job.tenantId, req.user!.id);
      if (!membership) throw new ApiError("FORBIDDEN", "Access denied");
      res.json(job);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/jobs/:jobId/steps", requireAuth, async (req, res, next) => {
    try {
      const job = await storage.getJob(req.params.jobId);
      if (!job) throw new ApiError("NOT_FOUND", "Job not found");
      const membership = await storage.getMembership(job.tenantId, req.user!.id);
      if (!membership) throw new ApiError("FORBIDDEN", "Access denied");
      const steps = await storage.getJobSteps(job.id);
      res.json(steps);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/t/:tenantSlug/projects/:projectId/facts", requireTenantAccess, async (req, res, next) => {
    try {
      const filters: any = {};
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.factType) filters.factType = req.query.factType as string;
      if (req.query.minConfidence) filters.minConfidence = parseFloat(req.query.minConfidence as string);
      const factsList = await storage.getFactsForProject(req.params.projectId, filters);
      res.json(factsList);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/facts/:factId/approve", requireAuth, async (req, res, next) => {
    try {
      const fact = await storage.getFact(req.params.factId);
      if (!fact) throw new ApiError("NOT_FOUND", "Fact not found");
      const membership = await storage.getMembership(fact.tenantId, req.user!.id);
      if (!membership) throw new ApiError("FORBIDDEN", "Access denied");
      requireRole(membership.role, "analyst");

      const updated = await storage.updateFact(fact.id, { status: "approved" });
      await storage.createAuditEvent(fact.tenantId, req.user!.id, "approved", "fact", fact.id, undefined, fact.projectId);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/facts/:factId/reject", requireAuth, async (req, res, next) => {
    try {
      const fact = await storage.getFact(req.params.factId);
      if (!fact) throw new ApiError("NOT_FOUND", "Fact not found");
      const membership = await storage.getMembership(fact.tenantId, req.user!.id);
      if (!membership) throw new ApiError("FORBIDDEN", "Access denied");
      requireRole(membership.role, "analyst");

      const updated = await storage.updateFact(fact.id, { status: "rejected" });
      await storage.createAuditEvent(fact.tenantId, req.user!.id, "rejected", "fact", fact.id, undefined, fact.projectId);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/t/:tenantSlug/projects/:projectId/facts/bulk-approve", requireTenantAccess, async (req, res, next) => {
    try {
      requireRole((req as any).membership.role, "analyst");
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Project not found");
      }
      const { factIds } = req.body;
      if (!Array.isArray(factIds) || factIds.length === 0) {
        throw new ApiError("VALIDATION", "factIds must be a non-empty array");
      }
      const results = [];
      for (const factId of factIds) {
        const fact = await storage.getFact(factId);
        if (!fact || fact.projectId !== project.id) continue;
        const updated = await storage.updateFact(fact.id, { status: "approved" });
        await storage.createAuditEvent((req as any).tenant.id, req.user!.id, "bulk_approved", "fact", fact.id, undefined, project.id);
        results.push(updated);
      }
      res.json({ updated: results.length, facts: results });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/t/:tenantSlug/projects/:projectId/facts/bulk-reject", requireTenantAccess, async (req, res, next) => {
    try {
      requireRole((req as any).membership.role, "analyst");
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Project not found");
      }
      const { factIds } = req.body;
      if (!Array.isArray(factIds) || factIds.length === 0) {
        throw new ApiError("VALIDATION", "factIds must be a non-empty array");
      }
      const results = [];
      for (const factId of factIds) {
        const fact = await storage.getFact(factId);
        if (!fact || fact.projectId !== project.id) continue;
        const updated = await storage.updateFact(fact.id, { status: "rejected" });
        await storage.createAuditEvent((req as any).tenant.id, req.user!.id, "bulk_rejected", "fact", fact.id, undefined, project.id);
        results.push(updated);
      }
      res.json({ updated: results.length, facts: results });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/t/:tenantSlug/projects/:projectId/documents/bulk-delete", requireTenantAccess, async (req, res, next) => {
    try {
      requireRole((req as any).membership.role, "analyst");
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Project not found");
      }
      const { documentIds } = req.body;
      if (!Array.isArray(documentIds) || documentIds.length === 0) {
        throw new ApiError("VALIDATION", "documentIds must be a non-empty array");
      }
      const objectStorage = getStorage();
      let deleted = 0;
      for (const docId of documentIds) {
        const doc = await storage.getDocument(docId);
        if (!doc || doc.projectId !== project.id) continue;
        await objectStorage.deleteObject({ key: doc.storageKey }).catch(() => {});
        await storage.deleteDocument(doc.id);
        await storage.createAuditEvent((req as any).tenant.id, req.user!.id, "bulk_deleted", "document", doc.id, undefined, project.id);
        deleted++;
      }
      res.json({ deleted });
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/facts/:factId", requireAuth, async (req, res, next) => {
    try {
      const fact = await storage.getFact(req.params.factId);
      if (!fact) throw new ApiError("NOT_FOUND", "Fact not found");
      const membership = await storage.getMembership(fact.tenantId, req.user!.id);
      if (!membership) throw new ApiError("FORBIDDEN", "Access denied");
      requireRole(membership.role, "analyst");

      const updateData: any = {};
      if (req.body.valueJson !== undefined) updateData.valueJson = req.body.valueJson;
      if (req.body.unit !== undefined) updateData.unit = req.body.unit;
      if (req.body.confidence !== undefined) updateData.confidence = req.body.confidence;

      const updated = await storage.updateFact(fact.id, updateData);
      await storage.createAuditEvent(fact.tenantId, req.user!.id, "edited", "fact", fact.id, undefined, fact.projectId);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/facts/:factId/evidence", requireAuth, async (req, res, next) => {
    try {
      const fact = await storage.getFact(req.params.factId);
      if (!fact) throw new ApiError("NOT_FOUND", "Fact not found");
      const membership = await storage.getMembership(fact.tenantId, req.user!.id);
      if (!membership) throw new ApiError("FORBIDDEN", "Access denied");
      const evidenceList = await storage.getEvidenceForFact(fact.id);
      res.json(evidenceList);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/evidence/:evidenceId/snippet", requireAuth, async (req, res, next) => {
    try {
      const ev = await storage.getEvidence(req.params.evidenceId);
      if (!ev) throw new ApiError("NOT_FOUND", "Evidence not found");
      const fact = await storage.getFact(ev.factId);
      if (!fact) throw new ApiError("NOT_FOUND", "Related fact not found");
      const membership = await storage.getMembership(fact.tenantId, req.user!.id);
      if (!membership) throw new ApiError("FORBIDDEN", "Access denied");

      let snippet = "";
      const textMimeTypes = ["text/plain", "text/csv", "application/json", "application/xml", "text/xml"];
      if (ev.documentId) {
        const doc = await storage.getDocument(ev.documentId);
        if (doc) {
          const isTextFile = textMimeTypes.includes(doc.mimeType || "") ||
            ["csv", "txt", "json", "xml"].includes(doc.filename.split(".").pop()?.toLowerCase() || "");
          if (isTextFile) {
            const objectStorage = getStorage();
            const exists = await objectStorage.exists({ key: doc.storageKey });
            if (exists) {
              const refData = ev.refJson as any;
              const buf = await objectStorage.getObject({ key: doc.storageKey });
              const content = buf.toString("utf-8");
              if (refData?.startChar !== undefined && refData?.endChar !== undefined) {
                snippet = content.substring(refData.startChar, refData.endChar);
              } else {
                snippet = content.substring(0, 500);
              }
            }
          } else {
            snippet = `[Binary document: ${doc.filename}] Snippet extraction not supported for ${doc.kind || "this file type"}.`;
          }
        }
      }
      if (!snippet && ev.refJson) {
        const refData = ev.refJson as any;
        snippet = refData.snippet || refData.text || JSON.stringify(ev.refJson);
      }

      res.json({
        evidenceId: ev.id,
        snippet: redactText(snippet),
        kind: ev.kind,
        redacted: true,
      });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/t/:tenantSlug/projects/:projectId/outputs", requireTenantAccess, async (req, res, next) => {
    try {
      const artifactsList = await storage.getArtifactsForProject(req.params.projectId);
      res.json(artifactsList);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/outputs/:outputId", requireAuth, async (req, res, next) => {
    try {
      const artifact = await storage.getArtifact(req.params.outputId);
      if (!artifact) throw new ApiError("NOT_FOUND", "Output not found");
      const membership = await storage.getMembership(artifact.tenantId, req.user!.id);
      if (!membership) throw new ApiError("FORBIDDEN", "Access denied");
      res.json(artifact);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/t/:tenantSlug/projects/:projectId/export", requireTenantAccess, async (req, res, next) => {
    try {
      requireRole((req as any).membership.role, "analyst");
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Project not found");
      }

      const format = (req.body.format as string) || "json";
      const template = (req.body.template as string) || "executive";
      const citations = req.body.citations !== false;
      const footnotes = req.body.footnotes === true;
      const artifactsList = await storage.getArtifactsForProject(project.id);
      const approvedFacts = await storage.getFactsForProject(project.id, { status: "approved" });

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

      if (format === "json") {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="${project.name}-export.json"`);
        return res.json(exportData);
      }

      if (format === "md") {
        const templateLabel = template === "executive" ? "Executive Summary" : template === "compliance" ? "Compliance Report" : "Technical Report";
        const exportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
        let md = `# ${project.name}\n\n`;
        md += `## ${templateLabel}\n\n`;
        md += `| Field | Value |\n|---|---|\n`;
        md += `| **Report Type** | ${templateLabel} |\n`;
        md += `| **Language** | ${project.outputLanguage} |\n`;
        md += `| **Generated** | ${exportDate} |\n`;
        md += `| **Artifacts** | ${artifactsList.length} |\n`;
        md += `| **Approved Facts** | ${sanitizedFacts.length} |\n\n`;
        md += `---\n\n`;

        if (artifactsList.length > 0) {
          md += `## Table of Contents\n\n`;
          artifactsList.forEach((a, i) => {
            md += `${i + 1}. ${getArtifactTitle(a.type, a.phaseId)}\n`;
          });
          if (sanitizedFacts.length > 0) md += `${artifactsList.length + 1}. Approved Facts\n`;
          md += `\n---\n\n`;

          artifactsList.forEach((a) => {
            md += renderArtifactMarkdown(a.type, a.dataJson as any, a.phaseId, template);
          });
        }

        if (template !== "executive" || sanitizedFacts.length > 0) {
          md += `## Approved Facts (${sanitizedFacts.length})\n\n`;
          if (sanitizedFacts.length > 0) {
            md += `| # | Key | Type | Value | Confidence |\n|---|---|---|---|---|\n`;
            sanitizedFacts.forEach((f, i) => {
              const val = typeof f.valueJson === "object" ? JSON.stringify(f.valueJson) : String(f.valueJson || "");
              md += `| ${i + 1} | ${f.key} | ${f.factType} | ${val.substring(0, 60)}${val.length > 60 ? "..." : ""} | ${((f.confidence || 0) * 100).toFixed(0)}% |\n`;
            });
            md += `\n`;
          }
        }

        if (citations && sanitizedFacts.length > 0) {
          md += `## References & Citations\n\n`;
          sanitizedFacts.forEach((f, i) => {
            md += `[${i + 1}] **${f.key}** (${f.factType}) — Confidence: ${((f.confidence || 0) * 100).toFixed(0)}%${f.unit ? ` | Unit: ${f.unit}` : ""}\n\n`;
          });
        }

        md += `---\n\n`;
        md += `> *Report generated by ReOrg AI on ${exportDate}.*\n`;
        if (footnotes) {
          md += `> *All data has been sanitized and PII redacted per data governance policies.*\n`;
        }

        res.setHeader("Content-Type", "text/markdown");
        res.setHeader("Content-Disposition", `attachment; filename="${project.name}-export.md"`);
        return res.send(md);
      }

      if (format === "html") {
        const templateLabel = template === "executive" ? "Executive Summary" : template === "compliance" ? "Compliance Report" : "Technical Report";
        const exportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
        const reportCss = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#1e293b;line-height:1.7;background:#fff}
.report-container{max-width:960px;margin:0 auto;padding:0 2rem}

/* Cover Page */
.cover-page{background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#1a365d 100%);color:#fff;padding:4rem 3rem;margin:-2rem -2rem 0;text-align:center;page-break-after:always}
.cover-logo{font-size:1rem;letter-spacing:4px;text-transform:uppercase;opacity:0.7;margin-bottom:2rem}
.cover-title{font-size:2.5rem;font-weight:700;margin-bottom:0.5rem;line-height:1.2}
.cover-subtitle{font-size:1.25rem;font-weight:300;opacity:0.85;margin-bottom:2rem}
.cover-divider{width:80px;height:3px;background:linear-gradient(90deg,#3b82f6,#8b5cf6);margin:2rem auto}
.cover-meta{display:flex;justify-content:center;gap:2rem;flex-wrap:wrap;margin-top:1.5rem;font-size:0.9rem;opacity:0.8}
.cover-meta-item{display:flex;align-items:center;gap:0.5rem}

/* Table of Contents */
.toc{padding:2rem 0;page-break-after:always}
.toc h2{font-size:1.5rem;color:#1e3a5f;margin-bottom:1.5rem;padding-bottom:0.5rem;border-bottom:2px solid #e2e8f0}
.toc-list{list-style:none;padding:0}
.toc-item{padding:0.6rem 0;border-bottom:1px dotted #cbd5e1;display:flex;justify-content:space-between;align-items:center}
.toc-item a{color:#1e3a5f;text-decoration:none;font-weight:500}
.toc-item a:hover{color:#3b82f6}
.toc-num{color:#94a3b8;font-size:0.85rem}

/* Section Titles */
.artifact-section{margin:2.5rem 0;page-break-inside:avoid}
.section-title{font-size:1.5rem;color:#1e3a5f;padding-bottom:0.75rem;border-bottom:3px solid #3b82f6;margin-bottom:1.5rem}
h3{font-size:1.15rem;color:#334155;margin:1.5rem 0 0.75rem;font-weight:600}
h4{font-size:1rem;color:#475569;margin:1rem 0 0.5rem}

/* Executive Summary Block */
.executive-summary{background:linear-gradient(135deg,#f0f9ff,#eff6ff);border-left:4px solid #3b82f6;padding:1.25rem 1.5rem;border-radius:0 6px 6px 0;margin:1rem 0 1.5rem;font-size:1.02rem}

/* KPI Cards */
.kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin:1.5rem 0}
.kpi-card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:1.25rem;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.06)}
.kpi-value{font-size:2rem;font-weight:800;color:#1e3a5f;line-height:1.1}
.kpi-label{font-size:0.8rem;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-top:0.5rem;font-weight:600}
.kpi-sub{font-size:0.75rem;color:#94a3b8;margin-top:0.25rem}

/* Comparison Panels */
.comparison-panel{margin:1.5rem 0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
.comparison-title{padding:0.75rem 1rem;background:#f8fafc;border-bottom:1px solid #e2e8f0;margin:0;font-size:1rem}
.comparison-grid{display:grid;grid-template-columns:1fr 40px 1fr;align-items:stretch}
.comparison-before,.comparison-after{padding:1rem}
.comparison-arrow{display:flex;align-items:center;justify-content:center;background:#f1f5f9;font-size:1.5rem;color:#64748b}
.comparison-header{font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:0.5rem;padding:0.25rem 0.5rem;border-radius:4px;display:inline-block}
.before-header{background:#fee2e2;color:#991b1b}
.after-header{background:#dcfce7;color:#166534}
.comparison-body{font-size:0.92rem;line-height:1.6;color:#475569}
.comparison-changes{padding:0.75rem 1rem;background:#fffbeb;border-top:1px solid #e2e8f0;font-size:0.85rem;color:#92400e}

/* Scenario Cards */
.scenario-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;margin:1.5rem 0}
.scenario-card{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
.scenario-base{border:2px solid #3b82f6;box-shadow:0 2px 8px rgba(59,130,246,0.15)}
.scenario-header{padding:0.75rem 1rem;background:#f8fafc;font-weight:700;font-size:0.95rem;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;gap:0.5rem}
.scenario-tag{font-size:0.65rem;background:#3b82f6;color:#fff;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:0.5px}
.scenario-body{padding:1rem}
.scenario-metric{display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid #f1f5f9}
.scenario-metric:last-child{border-bottom:none}
.scenario-metric-label{color:#64748b;font-size:0.85rem}
.scenario-metric-value{font-weight:700;color:#1e293b}
.assumptions-block{font-size:0.85rem;color:#64748b;margin:0.5rem 0;padding:0.5rem 0.75rem;background:#f8fafc;border-radius:4px}

/* Roadmap / Waves */
.roadmap-container{margin:1.5rem 0}
.wave-card{background:#fff;border:1px solid #e2e8f0;border-radius:0 8px 8px 0;padding:1rem 1.25rem;margin:0.75rem 0}
.wave-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;flex-wrap:wrap;gap:0.5rem}
.wave-weeks{font-size:0.8rem;background:#f1f5f9;color:#475569;padding:2px 10px;border-radius:10px}
.wave-items{margin:0;padding-left:1.25rem}
.wave-items li{margin:0.25rem 0;font-size:0.92rem;color:#475569}

/* Stack Diagram */
.stack-diagram{margin:1.5rem 0}
.stack-layer{background:#fff;border:1px solid #e2e8f0;border-radius:0 8px 8px 0;padding:1rem 1.25rem;margin:0.5rem 0}
.stack-layer-name{font-weight:700;font-size:0.95rem;color:#1e293b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.5rem}
.stack-items{display:flex;flex-wrap:wrap;gap:0.5rem}
.stack-item{font-size:0.9rem;color:#475569}
.stack-rationale{font-size:0.8rem;color:#94a3b8;margin-top:0.15rem}

/* Roles & Cards */
.roles-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1rem;margin:1rem 0}
.role-card{border:1px solid #e2e8f0;border-radius:8px;padding:1rem;background:#fff}
.role-title{font-weight:700;color:#1e3a5f;font-size:1rem;margin-bottom:0.5rem}
.role-purpose{font-size:0.9rem;color:#475569;margin-bottom:0.5rem}
.role-reports{font-size:0.8rem;color:#94a3b8}

.principles-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:0.75rem;margin:1rem 0}
.principle-card{display:flex;align-items:flex-start;gap:0.75rem;padding:0.75rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.9rem}
.principle-num{background:#3b82f6;color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;flex-shrink:0}

/* Communication Cards */
.comm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1rem;margin:1rem 0}
.comm-card{border:1px solid #e2e8f0;border-radius:8px;padding:1rem;background:#fff}
.comm-audience{font-weight:700;color:#1e3a5f;font-size:1rem;margin-bottom:0.75rem;padding-bottom:0.5rem;border-bottom:2px solid #e2e8f0}
.comm-details{font-size:0.9rem;margin:0.25rem 0}

/* Policy Cards */
.policy-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:1.25rem;margin:1rem 0}
.policy-card h4{margin:0 0 0.75rem;color:#1e3a5f}

/* Compliance */
.compliance-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem;margin:1rem 0}
.compliance-section{border:1px solid #e2e8f0;border-radius:8px;padding:1rem;background:#fff}
.compliance-section h4{margin:0 0 0.75rem;color:#1e3a5f}
.checklist{list-style:none;padding:0}
.checklist li{padding:0.4rem 0;border-bottom:1px solid #f1f5f9;display:flex;align-items:flex-start;gap:0.5rem;font-size:0.9rem}
.check-icon{color:#059669;font-weight:700;flex-shrink:0}

/* Content Blocks */
.content-block{margin:1.5rem 0}
.content-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:1.25rem;margin:1rem 0}
.highlight-block{background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border-left:4px solid #059669;padding:1.25rem 1.5rem;border-radius:0 6px 6px 0}
.caveats-block{background:#fffbeb;border-left:4px solid #f59e0b;padding:1.25rem 1.5rem;border-radius:0 6px 6px 0;margin:1.5rem 0}

.field-label{font-weight:600;color:#475569}
.metric-inline{font-size:0.9rem;color:#475569;margin:0.25rem 0 0.25rem 1rem}

/* Gauge Bar */
.gauge-bar{position:relative;height:32px;background:#fee2e2;border-radius:6px;margin:1rem 0;overflow:hidden}
.gauge-fill{height:100%;border-radius:6px 0 0 6px;transition:width 0.3s}
.gauge-label-left{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:0.8rem;font-weight:700;color:#fff}
.gauge-label-right{position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:0.8rem;font-weight:700;color:#991b1b}

/* Badges */
.badge{display:inline-block;padding:2px 10px;border-radius:10px;font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.3px}
.badge-low,.badge-success{background:#dcfce7;color:#166534}
.badge-medium,.badge-warning,.badge-partner{background:#fef3c7;color:#92400e}
.badge-high{background:#fee2e2;color:#991b1b}
.badge-critical{background:#ef4444;color:#fff}
.badge-info,.badge-build{background:#dbeafe;color:#1e40af}
.badge-buy{background:#dcfce7;color:#166534}

/* Tables */
.styled-table{width:100%;border-collapse:separate;border-spacing:0;margin:1rem 0;font-size:0.88rem;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
.styled-table thead tr{background:#f1f5f9}
.styled-table th{text-align:left;padding:10px 14px;font-weight:700;color:#334155;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e2e8f0}
.styled-table td{padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#475569}
.styled-table tbody tr:last-child td{border-bottom:none}
.styled-table tbody tr:hover{background:#f8fafc}
.text-right{text-align:right}
.raci-r{background:#eff6ff}
.raci-a{background:#fef3c7}

/* Lists */
.styled-list{padding-left:1.5rem;margin:0.5rem 0}
.styled-list li{margin:0.35rem 0;font-size:0.92rem;color:#475569}

/* Facts Section */
.fact-card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:1rem;margin:0.75rem 0;display:grid;grid-template-columns:1fr auto;gap:1rem;align-items:start}
.fact-key{font-weight:700;color:#1e3a5f}
.fact-type{font-size:0.75rem;color:#64748b;text-transform:uppercase}
.fact-confidence{font-size:0.85rem;font-weight:700}

/* Footer */
.report-footer{margin-top:3rem;padding:1.5rem 0;border-top:2px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;font-size:0.8rem;color:#94a3b8}
.footer-brand{font-weight:700;color:#64748b}

/* Print toolbar */
.print-toolbar{position:fixed;top:0;left:0;right:0;z-index:100;background:#1e293b;color:#fff;padding:0.75rem 2rem;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 8px rgba(0,0,0,0.2)}
.print-toolbar button{background:#3b82f6;color:#fff;border:none;padding:0.5rem 1.5rem;border-radius:6px;font-size:0.875rem;font-weight:600;cursor:pointer;transition:background 0.2s}
.print-toolbar button:hover{background:#2563eb}
.print-toolbar .toolbar-title{font-size:0.875rem;font-weight:500;opacity:0.9}
.print-spacer{height:56px}

/* Print styles */
@media print{
  body{font-size:10pt;color:#000}
  .print-toolbar,.print-spacer{display:none!important}
  .cover-page{padding:3rem 2rem}
  .kpi-row{grid-template-columns:repeat(auto-fit,minmax(140px,1fr))}
  .scenario-grid{grid-template-columns:repeat(3,1fr)}
  .artifact-section{page-break-inside:avoid}
  .report-footer{page-break-before:always}
  @page{margin:2cm;size:A4}
}
`;

        let html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escHtml(project.name)} - ${templateLabel}</title><style>${reportCss}</style></head><body>`;
        html += `<div class="print-toolbar"><span class="toolbar-title">${escHtml(project.name)} &mdash; ${templateLabel}</span><button onclick="window.print()">Save as PDF</button></div><div class="print-spacer"></div>`;

        html += `<div class="cover-page">`;
        html += `<div class="cover-logo">ReOrg AI</div>`;
        html += `<div class="cover-divider"></div>`;
        html += `<h1 class="cover-title">${escHtml(project.name)}</h1>`;
        html += `<p class="cover-subtitle">${templateLabel}</p>`;
        html += `<div class="cover-divider"></div>`;
        html += `<div class="cover-meta">`;
        html += `<div class="cover-meta-item"><strong>Date:</strong> ${exportDate}</div>`;
        html += `<div class="cover-meta-item"><strong>Language:</strong> ${escHtml(project.outputLanguage)}</div>`;
        html += `<div class="cover-meta-item"><strong>Artifacts:</strong> ${artifactsList.length}</div>`;
        html += `<div class="cover-meta-item"><strong>Facts:</strong> ${sanitizedFacts.length}</div>`;
        html += `</div>`;
        html += `</div>`;

        html += `<div class="report-container">`;

        if (artifactsList.length > 0) {
          html += `<nav class="toc"><h2>Table of Contents</h2><ol class="toc-list">`;
          artifactsList.forEach((a, i) => {
            html += `<li class="toc-item"><a href="#section-${a.type}">${getArtifactTitle(a.type, a.phaseId)}</a><span class="toc-num">${i + 1}</span></li>`;
          });
          if (template !== "executive" || sanitizedFacts.length > 0) {
            html += `<li class="toc-item"><a href="#section-facts">Approved Facts</a><span class="toc-num">${artifactsList.length + 1}</span></li>`;
          }
          if (citations && sanitizedFacts.length > 0) {
            html += `<li class="toc-item"><a href="#section-citations">References &amp; Citations</a><span class="toc-num">${artifactsList.length + 2}</span></li>`;
          }
          html += `</ol></nav>`;

          artifactsList.forEach((a) => {
            html += renderArtifactHtml(a.type, a.dataJson as any, a.phaseId, template);
          });
        }

        if (template !== "executive" || sanitizedFacts.length > 0) {
          html += `<section id="section-facts" class="artifact-section"><h2 class="section-title">Approved Facts (${sanitizedFacts.length})</h2>`;
          if (sanitizedFacts.length > 0) {
            html += `<table class="styled-table"><thead><tr><th>#</th><th>Key</th><th>Type</th><th>Value</th><th>Confidence</th></tr></thead><tbody>`;
            sanitizedFacts.forEach((f, i) => {
              const val = typeof f.valueJson === "object" ? JSON.stringify(f.valueJson) : String(f.valueJson || "");
              const truncVal = val.length > 80 ? val.substring(0, 80) + "..." : val;
              const confPct = ((f.confidence || 0) * 100).toFixed(0);
              const confColor = Number(confPct) >= 80 ? "#059669" : Number(confPct) >= 50 ? "#d97706" : "#dc2626";
              html += `<tr><td>${i + 1}</td><td><strong>${escHtml(String(f.key))}</strong></td><td><span class="badge badge-info">${escHtml(f.factType)}</span></td><td>${escHtml(truncVal)}</td><td><span style="color:${confColor};font-weight:700">${confPct}%</span></td></tr>`;
            });
            html += `</tbody></table>`;
          }
          html += `</section>`;
        }

        if (citations && sanitizedFacts.length > 0) {
          html += `<section id="section-citations" class="artifact-section"><h2 class="section-title">References &amp; Citations</h2><ol class="styled-list">`;
          sanitizedFacts.forEach((f) => {
            html += `<li><strong>${escHtml(String(f.key))}</strong> (${escHtml(f.factType)}) — Confidence: ${((f.confidence || 0) * 100).toFixed(0)}%${f.unit ? ` | Unit: ${escHtml(f.unit)}` : ""}</li>`;
          });
          html += `</ol></section>`;
        }

        html += `<footer class="report-footer">`;
        html += `<div class="footer-brand">ReOrg AI Platform</div>`;
        html += `<div>Generated on ${exportDate}${footnotes ? " | All data sanitized and PII redacted" : ""}</div>`;
        html += `</footer>`;

        html += `</div></body></html>`;
        res.setHeader("Content-Type", "text/html");
        res.setHeader("Content-Disposition", `attachment; filename="${project.name}-export.html"`);
        return res.send(html);
      }

      throw new ApiError("VALIDATION", "Unsupported format. Use json, md, or html.");
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/t/:tenantSlug/projects/:projectId/jobs", requireTenantAccess, async (req, res, next) => {
    try {
      const jobsList = await storage.getJobsForProject(req.params.projectId);
      res.json(jobsList);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/t/:tenantSlug/projects/:projectId/phases/:phaseId/run", requireTenantAccess, async (req, res, next) => {
    try {
      requireRole((req as any).membership.role, "analyst");
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Project not found");
      }

      const phaseId = parseInt(req.params.phaseId, 10);
      if (isNaN(phaseId) || phaseId < 0 || phaseId > 7) {
        throw new ApiError("VALIDATION", "Invalid phase ID. Must be 0-7.");
      }

      const deps = PHASE_DEPENDENCIES[phaseId] || [];

      if (deps.length > 0) {
        const projectJobs = await storage.getJobsForProject(project.id);
        const completedPhases = new Set<number>();
        for (const j of projectJobs) {
          const match = j.type.match(/^phase_(\d+)_run_v1$/);
          if (match && j.status === "succeeded") {
            completedPhases.add(parseInt(match[1], 10));
          }
        }
        const unmetDeps = deps.filter((d: number) => !completedPhases.has(d));
        if (unmetDeps.length > 0) {
          throw new ApiError("VALIDATION", `Prerequisites not met. Missing phases: ${unmetDeps.join(", ")}`);
        }
      }

      const jobType = `phase_${phaseId}_run_v1`;
      const job = await storage.createJob({
        projectId: project.id,
        tenantId: (req as any).tenant.id,
        type: jobType,
        status: "queued",
        inputJson: { phaseId, language: project.outputLanguage },
      });

      await storage.createAuditEvent((req as any).tenant.id, req.user!.id, "queued", "job", job.id, { type: jobType, phaseId }, project.id);
      res.json(job);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/t/:tenantSlug/projects/:projectId/phases/:phaseId/gate", requireTenantAccess, async (req, res, next) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Project not found");
      }

      const phaseId = parseInt(req.params.phaseId, 10);
      if (isNaN(phaseId) || phaseId < 0 || phaseId > 7) {
        throw new ApiError("VALIDATION", "Invalid phase ID. Must be 0-7.");
      }

      const deps = PHASE_DEPENDENCIES[phaseId] || [];

      const projectJobs = await storage.getJobsForProject(project.id);
      const completedPhases = new Set<number>();
      for (const j of projectJobs) {
        const match = j.type.match(/^phase_(\d+)_run_v1$/);
        if (match && j.status === "succeeded") {
          completedPhases.add(parseInt(match[1], 10));
        }
      }

      const dependencies = deps.map((depId: number) => ({
        phaseId: depId,
        name: PHASES[depId]?.short || `Phase ${depId}`,
        met: completedPhases.has(depId),
      }));

      const canRun = dependencies.every((d: any) => d.met);

      res.json({ phaseId, canRun, dependencies });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/t/:tenantSlug/projects/:projectId/audit", requireTenantAccess, async (req, res, next) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Project not found");
      }
      const filters: any = {};
      if (req.query.action) filters.action = req.query.action;
      if (req.query.userId) filters.userId = req.query.userId;
      if (req.query.entityType) filters.entityType = req.query.entityType;
      if (req.query.after) filters.after = new Date(req.query.after as string);
      if (req.query.before) filters.before = new Date(req.query.before as string);
      const events = await storage.getAuditEventsForProject(project.id, filters);
      res.json(events);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/t/:tenantSlug/projects/:projectId/audit/export", requireTenantAccess, async (req, res, next) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Project not found");
      }
      const events = await storage.getAuditEventsForProject(project.id);
      const format = req.query.format === "csv" ? "csv" : "json";
      if (format === "csv") {
        const headers = "id,tenant_id,user_id,action,entity_type,entity_id,created_at\n";
        const rows = events.map((e: any) =>
          `${e.id},${e.tenantId},${e.userId || ""},${e.action},${e.entityType},${e.entityId || ""},${e.createdAt}`
        ).join("\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=audit.csv");
        res.send(headers + rows);
      } else {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", "attachment; filename=audit.json");
        res.json(events);
      }
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/t/:tenantSlug/projects/:projectId/runs", requireTenantAccess, async (req, res, next) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Project not found");
      }
      const jobsWithSteps = await storage.getJobsWithSteps(project.id);
      res.json(jobsWithSteps);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/artifacts/:artifactId/lock", requireAuth, async (req, res, next) => {
    try {
      const artifact = await storage.getArtifact(req.params.artifactId);
      if (!artifact) throw new ApiError("NOT_FOUND", "Artifact not found");
      const membership = await storage.getMembership(artifact.tenantId, req.user!.id);
      if (!membership) throw new ApiError("FORBIDDEN", "Access denied");
      requireRole(membership.role, "analyst");
      if (artifact.locked) throw new ApiError("CONFLICT", "Artifact is already locked");
      const updated = await storage.updateArtifact(artifact.id, { locked: true, lockedAt: new Date() });
      await storage.createAuditEvent(artifact.tenantId, req.user!.id, "locked", "artifact", artifact.id, { version: artifact.version }, artifact.projectId);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/artifacts/:artifactId/versions", requireAuth, async (req, res, next) => {
    try {
      const artifact = await storage.getArtifact(req.params.artifactId);
      if (!artifact) throw new ApiError("NOT_FOUND", "Artifact not found");
      const membership = await storage.getMembership(artifact.tenantId, req.user!.id);
      if (!membership) throw new ApiError("FORBIDDEN", "Access denied");
      const versions = await storage.getArtifactVersions(artifact.id);
      res.json(versions);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/t/:tenantSlug/projects/:projectId/normalize", requireTenantAccess, async (req, res, next) => {
    try {
      requireRole((req as any).membership.role, "analyst");
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Project not found");
      }
      const { documentId } = req.body || {};
      const idempotencyKey = documentId ? `normalize_${documentId}` : undefined;
      if (idempotencyKey) {
        const existing = await storage.getJobByIdempotencyKey(idempotencyKey);
        if (existing && existing.status === "succeeded") {
          return res.json(existing);
        }
      }
      const job = await storage.createJob({
        projectId: project.id,
        tenantId: (req as any).tenant.id,
        type: "normalize_document_v1",
        status: "queued",
        inputJson: { documentId },
        idempotencyKey,
      });
      await storage.createAuditEvent((req as any).tenant.id, req.user!.id, "queued", "job", job.id, { type: "normalize_document_v1", documentId }, project.id);
      res.json(job);
    } catch (err) {
      next(err);
    }
  });

  // === Company CRUD ===

  app.get("/api/t/:tenantSlug/companies", requireTenantAccess, async (req, res, next) => {
    try {
      const companiesList = await storage.getCompaniesForTenant((req as any).tenant.id);
      res.json(companiesList);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/t/:tenantSlug/companies", requireTenantAccess, async (req, res, next) => {
    try {
      requireRole((req as any).membership.role, "admin");
      const parsed = createCompanyFormSchema.safeParse(req.body);
      if (!parsed.success) throw new ApiError("VALIDATION", "Invalid input", { errors: parsed.error.flatten() });
      const company = await storage.createCompany({
        tenantId: (req as any).tenant.id,
        name: parsed.data.name,
        industry: parsed.data.industry || null,
        region: parsed.data.region || null,
        sizeBand: parsed.data.sizeBand || null,
        notes: parsed.data.notes || null,
      });
      await storage.createAuditEvent((req as any).tenant.id, req.user!.id, "created", "company", company.id);
      res.json(company);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/t/:tenantSlug/companies/:companyId", requireTenantAccess, async (req, res, next) => {
    try {
      const company = await storage.getCompany(req.params.companyId);
      if (!company || company.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Company not found");
      }
      res.json(company);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/t/:tenantSlug/companies/:companyId", requireTenantAccess, async (req, res, next) => {
    try {
      requireRole((req as any).membership.role, "admin");
      const company = await storage.getCompany(req.params.companyId);
      if (!company || company.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Company not found");
      }
      const updated = await storage.updateCompany(company.id, {
        name: req.body.name || company.name,
        industry: req.body.industry !== undefined ? req.body.industry : company.industry,
        region: req.body.region !== undefined ? req.body.region : company.region,
        sizeBand: req.body.sizeBand !== undefined ? req.body.sizeBand : company.sizeBand,
        notes: req.body.notes !== undefined ? req.body.notes : company.notes,
      });
      await storage.createAuditEvent((req as any).tenant.id, req.user!.id, "updated", "company", company.id);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/t/:tenantSlug/companies/:companyId", requireTenantAccess, async (req, res, next) => {
    try {
      requireRole((req as any).membership.role, "owner");
      const company = await storage.getCompany(req.params.companyId);
      if (!company || company.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Company not found");
      }
      const companyProjects = await storage.getProjectsForCompany(company.id);
      if (companyProjects.length > 0) {
        throw new ApiError("CONFLICT", "Cannot delete a company that has projects");
      }
      await storage.deleteCompany(company.id);
      await storage.createAuditEvent((req as any).tenant.id, req.user!.id, "deleted", "company", company.id);
      res.json({ message: "Company deleted" });
    } catch (err) {
      next(err);
    }
  });

  // === Projects scoped by Company ===

  app.get("/api/t/:tenantSlug/companies/:companyId/projects", requireTenantAccess, async (req, res, next) => {
    try {
      const company = await storage.getCompany(req.params.companyId);
      if (!company || company.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Company not found");
      }
      const projectsList = await storage.getProjectsForCompany(company.id);
      res.json(projectsList);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/t/:tenantSlug/companies/:companyId/projects", requireTenantAccess, async (req, res, next) => {
    try {
      requireRole((req as any).membership.role, "analyst");
      const company = await storage.getCompany(req.params.companyId);
      if (!company || company.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Company not found");
      }
      const parsed = createProjectFormSchema.safeParse(req.body);
      if (!parsed.success) throw new ApiError("VALIDATION", "Invalid input", { errors: parsed.error.flatten() });
      const project = await storage.createProject({
        tenantId: (req as any).tenant.id,
        companyId: company.id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        clientName: company.name,
        outputLanguage: parsed.data.outputLanguage,
      });
      await storage.createAuditEvent((req as any).tenant.id, req.user!.id, "created", "project", project.id, { companyId: company.id }, project.id);
      res.json(project);
    } catch (err) {
      next(err);
    }
  });

  // === Phase Runs ===

  app.get("/api/t/:tenantSlug/projects/:projectId/phase-runs", requireTenantAccess, async (req, res, next) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Project not found");
      }
      const runs = await storage.getPhaseRunsForProject(project.id);
      res.json(runs);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/t/:tenantSlug/projects/:projectId/phase-runs/:phaseRunId", requireTenantAccess, async (req, res, next) => {
    try {
      const run = await storage.getPhaseRun(req.params.phaseRunId);
      if (!run || run.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Phase run not found");
      }
      res.json(run);
    } catch (err) {
      next(err);
    }
  });

  // === Phase Gates ===

  app.get("/api/t/:tenantSlug/projects/:projectId/gates", requireTenantAccess, async (req, res, next) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Project not found");
      }
      const gates = await storage.getPhaseGatesForProject(project.id);
      res.json(gates);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/t/:tenantSlug/projects/:projectId/phases/:phaseId/gate-decision", requireTenantAccess, async (req, res, next) => {
    try {
      requireRole((req as any).membership.role, "admin");
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Project not found");
      }
      const phaseId = parseInt(req.params.phaseId, 10);
      if (isNaN(phaseId) || phaseId < 0 || phaseId > 7) {
        throw new ApiError("VALIDATION", "Invalid phase ID. Must be 0-7.");
      }
      const { decision, checklistJson, evidenceCoverage, notes, phaseRunId } = req.body;
      if (!decision || !["passed", "failed"].includes(decision)) {
        throw new ApiError("VALIDATION", "Decision must be 'passed' or 'failed'");
      }
      const gate = await storage.createPhaseGate({
        projectId: project.id,
        tenantId: (req as any).tenant.id,
        phaseId,
        phaseRunId: phaseRunId || null,
        decision,
        decidedBy: req.user!.id,
        decidedAt: new Date(),
        checklistJson: checklistJson || null,
        evidenceCoverage: evidenceCoverage != null ? String(evidenceCoverage) : null,
        notes: notes || null,
      });
      await storage.createAuditEvent((req as any).tenant.id, req.user!.id, "gate_decision", "phase_gate", gate.id, { phaseId, decision }, project.id);
      res.json(gate);
    } catch (err) {
      next(err);
    }
  });

  // === Reports ===

  app.get("/api/t/:tenantSlug/projects/:projectId/reports", requireTenantAccess, async (req, res, next) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Project not found");
      }
      const reportsList = await storage.getReportsForProject(project.id);
      res.json(reportsList);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/t/:tenantSlug/projects/:projectId/reports", requireTenantAccess, async (req, res, next) => {
    try {
      requireRole((req as any).membership.role, "analyst");
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Project not found");
      }
      const { title, templateId, selectedArtifactVersionsJson, outputFormat } = req.body;
      if (!title || !templateId) throw new ApiError("VALIDATION", "Title and templateId are required");
      const report = await storage.createReport({
        projectId: project.id,
        tenantId: (req as any).tenant.id,
        title,
        templateId,
        selectedArtifactVersionsJson: selectedArtifactVersionsJson || null,
        outputFormat: outputFormat || "html",
      });
      await storage.createAuditEvent((req as any).tenant.id, req.user!.id, "created", "report", report.id, undefined, project.id);
      res.json(report);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/reports/:reportId", requireAuth, async (req, res, next) => {
    try {
      const report = await storage.getReport(req.params.reportId);
      if (!report) throw new ApiError("NOT_FOUND", "Report not found");
      const membership = await storage.getMembership(report.tenantId, req.user!.id);
      if (!membership) throw new ApiError("FORBIDDEN", "Access denied");
      res.json(report);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/reports/:reportId", requireAuth, async (req, res, next) => {
    try {
      const report = await storage.getReport(req.params.reportId);
      if (!report) throw new ApiError("NOT_FOUND", "Report not found");
      const membership = await storage.getMembership(report.tenantId, req.user!.id);
      if (!membership) throw new ApiError("FORBIDDEN", "Access denied");
      requireRole(membership.role, "analyst");
      const updated = await storage.updateReport(report.id, {
        title: req.body.title || report.title,
        selectedArtifactVersionsJson: req.body.selectedArtifactVersionsJson !== undefined ? req.body.selectedArtifactVersionsJson : report.selectedArtifactVersionsJson,
        outputFormat: req.body.outputFormat || report.outputFormat,
        status: req.body.status || report.status,
        storageKey: req.body.storageKey !== undefined ? req.body.storageKey : report.storageKey,
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // === Metrics Timeseries ===

  app.get("/api/t/:tenantSlug/projects/:projectId/metrics", requireTenantAccess, async (req, res, next) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Project not found");
      }
      const filters: any = {};
      if (req.query.metricKey) filters.metricKey = req.query.metricKey;
      if (req.query.periodStart) filters.periodStart = req.query.periodStart;
      if (req.query.periodEnd) filters.periodEnd = req.query.periodEnd;
      const metrics = await storage.getMetricsForProject(project.id, filters);
      res.json(metrics);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/t/:tenantSlug/projects/:projectId/metrics", requireTenantAccess, async (req, res, next) => {
    try {
      requireRole((req as any).membership.role, "analyst");
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.tenantId !== (req as any).tenant.id) {
        throw new ApiError("NOT_FOUND", "Project not found");
      }
      const { metrics } = req.body;
      if (!Array.isArray(metrics) || metrics.length === 0) {
        throw new ApiError("VALIDATION", "metrics must be a non-empty array");
      }
      const created = [];
      for (const m of metrics) {
        if (!m.metricKey || !m.periodStart || m.value == null || !m.unit) {
          throw new ApiError("VALIDATION", "Each metric requires metricKey, periodStart, value, and unit");
        }
        const metric = await storage.createMetric({
          tenantId: (req as any).tenant.id,
          companyId: project.companyId || null,
          projectId: project.id,
          metricKey: m.metricKey,
          periodStart: m.periodStart,
          periodGranularity: m.periodGranularity || "month",
          value: String(m.value),
          unit: m.unit,
          sampleSize: m.sampleSize || null,
          sourceLineageJson: m.sourceLineageJson || null,
        });
        created.push(metric);
      }
      res.json(created);
    } catch (err) {
      next(err);
    }
  });

  return sessionMiddleware;
}

