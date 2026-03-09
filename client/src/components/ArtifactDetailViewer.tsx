import type { Artifact } from "@shared/schema";
import { PHASES } from "@shared/schema";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  CheckCircle2,
  Target,
  TrendingUp,
  Shield,
  Users,
  Cpu,
  BarChart3,
  FileText,
  Lightbulb,
  Clock,
  DollarSign,
  Layers,
  ArrowRight,
  Zap,
  Activity,
  Megaphone,
  GraduationCap,
} from "lucide-react";

import { MetricGrid } from "@/components/report/MetricGrid";
import { GaugeChart } from "@/components/report/GaugeChart";
import { BarChartPanel } from "@/components/report/BarChartPanel";
import { AreaChartPanel } from "@/components/report/AreaChartPanel";
import { ScenarioCards } from "@/components/report/ScenarioCards";
import { TimelineRoadmap } from "@/components/report/TimelineRoadmap";
import { StackDiagram } from "@/components/report/StackDiagram";
import { ComparisonPanel } from "@/components/report/ComparisonPanel";
import { ProcessFlowDiagram } from "@/components/report/ProcessFlowDiagram";
import { StatusBadge } from "@/components/report/StatusBadge";
import type { StatusLevel } from "@/components/report/StatusBadge";

interface ArtifactDetailViewerProps {
  artifact: Artifact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3" data-testid={`section-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <h3 className="text-sm font-semibold flex items-center gap-2 border-b pb-2">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function TextBlock({ text }: { text: string | undefined | null }) {
  if (!text) return null;
  return <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{text}</p>;
}

function ListBlock({ items, label }: { items: string[] | undefined | null; label?: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      {label && <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>}
      <ul className="space-y-1 mt-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
            <span className="text-muted-foreground/50 mt-0.5 flex-shrink-0">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CaveatsList({ caveats }: { caveats: string[] | undefined | null }) {
  if (!caveats || caveats.length === 0) return null;
  return (
    <Section title={i18n.t("artifacts.caveatsAssumptions")} icon={<AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />}>
      <Card className="bg-yellow-500/5 border-yellow-500/20">
        <CardContent className="p-4">
          <ul className="space-y-2">
            {caveats.map((c, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </Section>
  );
}

function mapRiskToStatus(level: string): StatusLevel {
  const l = (level || "").toLowerCase();
  if (l === "critical") return "critical";
  if (l === "high") return "high";
  if (l === "medium") return "medium";
  if (l === "low") return "low";
  return "info";
}

function renderValueScope(data: any) {
  const facts = data.summary?.totalApprovedFacts;
  const kpiCount = data.summary?.kpiCount;
  const avgConf = data.summary?.averageConfidence;
  const npv = data.roiEstimate?.npv;
  const payback = data.roiEstimate?.paybackMonths;

  return (
    <div className="space-y-6" data-testid="artifact-detail-valuescope">
      <MetricGrid
        metrics={[
          ...(facts !== undefined ? [{ label: i18n.t("artifacts.approvedFacts"), value: String(facts), icon: CheckCircle2, colorVariant: "primary" as const }] : []),
          ...(kpiCount !== undefined ? [{ label: i18n.t("artifacts.kpiCount"), value: String(kpiCount), icon: BarChart3, colorVariant: "success" as const }] : []),
          ...(avgConf !== undefined ? [{ label: i18n.t("artifacts.avgConfidence"), value: `${((avgConf || 0) * 100).toFixed(0)}%`, icon: Target, colorVariant: "warning" as const, trend: (avgConf > 0.7 ? "up" : "neutral") as "up" | "neutral" }] : []),
          ...(npv !== undefined ? [{ label: i18n.t("artifacts.npv"), value: String(npv), icon: DollarSign, colorVariant: "primary" as const }] : []),
          ...(payback !== undefined ? [{ label: i18n.t("artifacts.payback"), value: `${payback} mo`, icon: Clock, colorVariant: "success" as const }] : []),
        ].filter(Boolean)}
        columns={facts !== undefined && npv !== undefined ? 5 : 3}
      />

      {data.narrative?.executiveSummary && (
        <Section title={i18n.t("artifacts.executiveSummary")} icon={<FileText className="w-4 h-4" />}>
          <TextBlock text={data.narrative.executiveSummary} />
        </Section>
      )}

      {data.narrative?.baselineAnalysis && (
        <Section title={i18n.t("artifacts.baselineAnalysis")} icon={<BarChart3 className="w-4 h-4" />}>
          <TextBlock text={data.narrative.baselineAnalysis} />
        </Section>
      )}

      {data.baselineKpis?.kpis?.length > 0 && (
        <Section title={i18n.t("artifacts.baselineKPIs")} icon={<BarChart3 className="w-4 h-4" />}>
          <BarChartPanel
            title={i18n.t("artifacts.kpiBaselineValues")}
            subtitle={i18n.t("artifacts.currentMeasured")}
            data={data.baselineKpis.kpis.slice(0, 8).map((kpi: any) => ({
              name: String(kpi.key || kpi.name || "").substring(0, 20),
              value: typeof kpi.value === "number" ? kpi.value : parseFloat(String(kpi.value)) || 0,
            }))}
            layout="horizontal"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{i18n.t("artifacts.kpi")}</TableHead>
                <TableHead>{i18n.t("artifacts.value")}</TableHead>
                <TableHead>{i18n.t("artifacts.unit")}</TableHead>
                <TableHead>{i18n.t("artifacts.confidence")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.baselineKpis.kpis.map((kpi: any, i: number) => (
                <TableRow key={i} data-testid={`row-kpi-${i}`}>
                  <TableCell className="text-sm font-medium">{kpi.key || kpi.name}</TableCell>
                  <TableCell className="text-sm font-bold">{kpi.value}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{kpi.unit || "-"}</TableCell>
                  <TableCell className="text-sm">
                    {kpi.confidence ? (
                      <StatusBadge
                        status={kpi.confidence > 0.8 ? "ok" : kpi.confidence > 0.5 ? "medium" : "low"}
                        label={`${(kpi.confidence * 100).toFixed(0)}%`}
                      />
                    ) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}

      {data.opportunitySizing?.opportunities?.length > 0 && (
        <Section title={i18n.t("artifacts.opportunitySizing")} icon={<TrendingUp className="w-4 h-4" />}>
          <TextBlock text={data.narrative?.opportunityNarrative} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{i18n.t("artifacts.opportunity")}</TableHead>
                <TableHead className="text-right">{i18n.t("artifacts.low")}</TableHead>
                <TableHead className="text-right">{i18n.t("artifacts.mid")}</TableHead>
                <TableHead className="text-right">{i18n.t("artifacts.high")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.opportunitySizing.opportunities.map((opp: any, i: number) => (
                <TableRow key={i} data-testid={`row-opportunity-${i}`}>
                  <TableCell className="text-sm font-medium">{opp.label || opp.name}</TableCell>
                  <TableCell className="text-sm text-right">{opp.low}</TableCell>
                  <TableCell className="text-sm text-right font-medium">{opp.mid}</TableCell>
                  <TableCell className="text-sm text-right">{opp.high}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}

      {data.roiEstimate && (
        <Section title={i18n.t("artifacts.roiSummary")} icon={<TrendingUp className="w-4 h-4" />}>
          <TextBlock text={data.narrative?.roiSummary} />
        </Section>
      )}

      <ListBlock items={data.narrative?.recommendations} label={i18n.t("artifacts.recommendations")} />
      <CaveatsList caveats={data.narrative?.caveats || data.caveats} />
    </div>
  );
}

function renderZeroBaseRebuild(data: any) {
  const aiPct = data.overallAutomationTarget?.aiPercent || 0;
  const humanPct = data.overallAutomationTarget?.humanPercent || 0;
  const processCount = data.processAssessments?.length || 0;
  const quickWinCount = data.quickWins?.length || 0;

  return (
    <div className="space-y-6" data-testid="artifact-detail-zerobase">
      <MetricGrid
        metrics={[
          { label: i18n.t("artifacts.aiAutomation"), value: `${aiPct}%`, icon: Cpu, colorVariant: "primary", trend: "up", trendLabel: i18n.t("artifacts.target") },
          { label: i18n.t("artifacts.humanOversight"), value: `${humanPct}%`, icon: Users, colorVariant: "warning" },
          { label: i18n.t("artifacts.processesAnalyzed"), value: String(processCount), icon: Target, colorVariant: "success" },
          { label: i18n.t("artifacts.quickWins"), value: String(quickWinCount), icon: Zap, colorVariant: "primary" },
        ]}
        columns={4}
      />

      {data.executiveSummary && (
        <Section title={i18n.t("artifacts.executiveSummary")} icon={<FileText className="w-4 h-4" />}>
          <TextBlock text={data.executiveSummary} />
        </Section>
      )}

      {data.overallAutomationTarget && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <GaugeChart
            title={i18n.t("artifacts.aiAutomationTarget")}
            subtitle={i18n.t("artifacts.percentWorkAI")}
            value={aiPct}
            label={i18n.t("artifacts.aiDriven")}
            color="hsl(var(--chart-1))"
          />
          <GaugeChart
            title={i18n.t("artifacts.humanOversight")}
            subtitle={i18n.t("artifacts.percentHuman")}
            value={humanPct}
            label={i18n.t("artifacts.humanInLoop")}
            color="hsl(var(--chart-4))"
          />
        </div>
      )}

      {data.processAssessments?.length > 0 && (
        <Section title={i18n.t("artifacts.processAssessments")} icon={<Target className="w-4 h-4" />}>
          <BarChartPanel
            title={i18n.t("artifacts.aiEligibilityByProcess")}
            subtitle={i18n.t("artifacts.overallAIReadiness")}
            data={data.processAssessments.map((proc: any) => ({
              name: String(proc.processName || "").substring(0, 25),
              value: proc.aiEligibility?.overallScore || 0,
            }))}
            layout="horizontal"
            valueFormatter={(v: number) => `${v}/10`}
          />
          <Accordion type="multiple" className="w-full">
            {data.processAssessments.map((proc: any, i: number) => (
              <AccordionItem key={i} value={`process-${i}`} data-testid={`accordion-process-${i}`}>
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{proc.processName}</span>
                    {proc.aiEligibility?.overallScore && (
                      <StatusBadge
                        status={proc.aiEligibility.overallScore >= 7 ? "ok" : proc.aiEligibility.overallScore >= 4 ? "medium" : "low"}
                        label={`Score: ${proc.aiEligibility.overallScore}/10`}
                      />
                    )}
                    {proc.automationSplit && (
                      <Badge variant="secondary" className="text-[10px]">AI: {proc.automationSplit.aiPercent}%</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  {(proc.currentState || proc.targetState) && (
                    <ComparisonPanel
                      title={proc.processName}
                      items={[
                        ...(proc.currentState ? [{ label: i18n.t("artifacts.processState"), before: proc.currentState, after: proc.targetState || "" }] : []),
                      ]}
                    />
                  )}
                  <ListBlock items={proc.hitlPoints} label={i18n.t("artifacts.humanInTheLoopPoints")} />
                  {proc.expectedImpact && (
                    <Card className="bg-muted/30">
                      <CardContent className="p-3">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{i18n.t("artifacts.expectedImpact")}</span>
                        <TextBlock text={proc.expectedImpact} />
                      </CardContent>
                    </Card>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Section>
      )}

      {data.dePara?.length > 0 && (
        <Section title={i18n.t("artifacts.deParaTitle")} icon={<ArrowRight className="w-4 h-4" />}>
          <ProcessFlowDiagram
            title={i18n.t("artifacts.processTransformationFlows")}
            flows={data.dePara.map((dp: any) => {
              const splitToSteps = (text: string, isAfter: boolean) => {
                if (!text) return [{ label: "N/A" }];
                const sentences = text.split(/[.;\n]+/).map((s: string) => s.trim()).filter((s: string) => s.length > 3);
                if (sentences.length === 0) return [{ label: text.substring(0, 60) }];
                return sentences.slice(0, 5).map((s: string) => ({
                  label: s.substring(0, 50) + (s.length > 50 ? "..." : ""),
                  description: s.length > 50 ? s : undefined,
                  automated: isAfter && /\b(ai|automat|machine|bot|nlp|model|intelligent|digital)\b/i.test(s),
                }));
              };
              return {
                processName: dp.processName || i18n.t("artifacts.process"),
                before: splitToSteps(dp.before || "", false),
                after: splitToSteps(dp.after || "", true),
              };
            })}
          />
          <Accordion type="multiple" className="w-full mt-3">
            {data.dePara.map((dp: any, i: number) => (
              <AccordionItem key={i} value={`depara-${i}`} data-testid={`accordion-depara-${i}`}>
                <AccordionTrigger className="text-sm font-medium">{dp.processName}</AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <ComparisonPanel
                    items={[{ label: i18n.t("artifacts.process"), before: dp.before || "", after: dp.after || "" }]}
                  />
                  <ListBlock items={dp.keyChanges} label={i18n.t("artifacts.keyChanges")} />
                  <ListBlock items={dp.riskMitigations} label={i18n.t("artifacts.riskMitigations")} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Section>
      )}

      {data.quickWins?.length > 0 && (
        <Section title={i18n.t("artifacts.quickWinsWeeks")} icon={<Zap className="w-4 h-4" />}>
          <Card className="bg-[hsl(var(--chart-2)/0.05)] border-[hsl(var(--chart-2)/0.2)]">
            <CardContent className="p-4">
              <ListBlock items={data.quickWins} />
            </CardContent>
          </Card>
        </Section>
      )}

      <ListBlock items={data.strategicInitiatives} label={i18n.t("artifacts.strategicInitiatives")} />
      <CaveatsList caveats={data.caveats} />
    </div>
  );
}

function renderSmartStack(data: any) {
  const layers = ["experienceLayer", "applicationLayer", "intelligenceLayer", "dataLayer"] as const;
  const layerLabels: Record<string, string> = {
    experienceLayer: i18n.t("artifacts.experienceLayer"),
    applicationLayer: i18n.t("artifacts.applicationLayer"),
    intelligenceLayer: i18n.t("artifacts.intelligenceLayer"),
    dataLayer: i18n.t("artifacts.dataLayer"),
  };

  const stackLayers = data.recommendedStack
    ? layers
        .filter((l) => data.recommendedStack[l]?.length > 0)
        .map((l) => ({
          name: layerLabels[l],
          tools: (data.recommendedStack[l] || []).map((item: any) => ({
            name: item.component || item.recommendation,
            cost: item.estimatedCost,
            decision: item.category?.toLowerCase() as "build" | "buy" | "partner" | undefined,
          })),
        }))
    : [];

  const bbpCount = data.buildBuyPartnerMatrix?.length || 0;

  return (
    <div className="space-y-6" data-testid="artifact-detail-smartstack">
      <MetricGrid
        metrics={[
          { label: i18n.t("artifacts.stackLayers"), value: String(stackLayers.length), icon: Layers, colorVariant: "primary" },
          { label: i18n.t("artifacts.components"), value: String(bbpCount), icon: Cpu, colorVariant: "success" },
          ...(data.implementationRoadmap ? [{ label: i18n.t("artifacts.roadmapWaves"), value: "3", icon: Clock, colorVariant: "warning" as const }] : []),
        ]}
        columns={3}
      />

      {data.executiveSummary && (
        <Section title={i18n.t("artifacts.executiveSummary")} icon={<FileText className="w-4 h-4" />}>
          <TextBlock text={data.executiveSummary} />
        </Section>
      )}

      {data.currentTechAssessment && (
        <Section title={i18n.t("artifacts.currentTechAssessment")} icon={<Cpu className="w-4 h-4" />}>
          <TextBlock text={data.currentTechAssessment} />
        </Section>
      )}

      {stackLayers.length > 0 && (
        <Section title={i18n.t("artifacts.recommendedStack")} icon={<Layers className="w-4 h-4" />}>
          <StackDiagram title={i18n.t("artifacts.architectureLayers")} layers={stackLayers} />
        </Section>
      )}

      {data.buildBuyPartnerMatrix?.length > 0 && (
        <Section title={i18n.t("artifacts.bbpMatrix")} icon={<Target className="w-4 h-4" />}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{i18n.t("artifacts.component")}</TableHead>
                <TableHead>{i18n.t("artifacts.decision")}</TableHead>
                <TableHead>{i18n.t("artifacts.estCost")}</TableHead>
                <TableHead>{i18n.t("artifacts.timeline")}</TableHead>
                <TableHead>{i18n.t("artifacts.justification")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.buildBuyPartnerMatrix.map((item: any, i: number) => (
                <TableRow key={i} data-testid={`row-bbp-${i}`}>
                  <TableCell className="text-sm font-medium">{item.component}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={item.decision?.toLowerCase() === "build" ? "info" : item.decision?.toLowerCase() === "buy" ? "ok" : "medium"}
                      label={item.decision}
                    />
                  </TableCell>
                  <TableCell className="text-sm font-bold">{item.estimatedCost}</TableCell>
                  <TableCell className="text-sm">{item.implementationTime}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{item.justification}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}

      {data.integrationArchitecture && (
        <Section title={i18n.t("artifacts.integrationArchitecture")} icon={<Cpu className="w-4 h-4" />}>
          <TextBlock text={data.integrationArchitecture} />
        </Section>
      )}

      {data.implementationRoadmap && (
        <Section title={i18n.t("artifacts.implementationRoadmap")} icon={<Clock className="w-4 h-4" />}>
          <TimelineRoadmap
            title={i18n.t("artifacts.threeWavePlan")}
            waves={
              (["wave1_quickWins", "wave2_scale", "wave3_optimization"] as const)
                .filter((w) => data.implementationRoadmap[w])
                .map((wave, idx) => {
                  const w = data.implementationRoadmap[wave];
                  return {
                    label: i18n.t("phases.waveN", { n: idx + 1 }),
                    period: i18n.t("phases.nWeeks", { n: w.weeks }),
                    items: w.items || [],
                  };
                })
            }
          />
        </Section>
      )}

      <ListBlock items={data.securityAndCompliance} label={i18n.t("artifacts.securityCompliance")} />
      <CaveatsList caveats={data.caveats} />
    </div>
  );
}

function renderValueCase(data: any) {
  const totalInvestment = data.investmentSummary?.totalInvestment;
  const baseScenario = data.scenarioModels?.base;

  return (
    <div className="space-y-6" data-testid="artifact-detail-valuecase">
      <MetricGrid
        metrics={[
          ...(totalInvestment ? [{ label: i18n.t("artifacts.totalInvestment"), value: String(totalInvestment), icon: DollarSign, colorVariant: "danger" as const }] : []),
          ...(baseScenario?.roi5Year ? [{ label: i18n.t("artifacts.fiveYearROI"), value: String(baseScenario.roi5Year), icon: TrendingUp, colorVariant: "primary" as const, trend: "up" as const }] : []),
          ...(baseScenario?.annualSavings ? [{ label: i18n.t("artifacts.annualSavings"), value: String(baseScenario.annualSavings), icon: DollarSign, colorVariant: "success" as const }] : []),
          ...(baseScenario?.paybackMonths ? [{ label: i18n.t("artifacts.paybackPeriod"), value: `${baseScenario.paybackMonths}`, icon: Clock, colorVariant: "warning" as const }] : []),
        ]}
        columns={4}
      />

      {data.executiveSummary && (
        <Section title={i18n.t("artifacts.executiveSummary")} icon={<FileText className="w-4 h-4" />}>
          <TextBlock text={data.executiveSummary} />
        </Section>
      )}

      {data.investmentSummary?.categories?.length > 0 && (
        <Section title={i18n.t("artifacts.investmentBreakdown")} icon={<DollarSign className="w-4 h-4" />}>
          <BarChartPanel
            title={i18n.t("artifacts.investmentByCategory")}
            data={data.investmentSummary.categories.map((cat: any) => ({
              name: String(cat.category || "").substring(0, 20),
              value: parseFloat(String(cat.amount || "0").replace(/[^0-9.-]/g, "")) || 0,
            }))}
            layout="horizontal"
            valueFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{i18n.t("artifacts.category")}</TableHead>
                <TableHead className="text-right">{i18n.t("artifacts.amount")}</TableHead>
                <TableHead>{i18n.t("artifacts.description")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.investmentSummary.categories.map((cat: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="text-sm font-medium">{cat.category}</TableCell>
                  <TableCell className="text-sm font-bold text-right">{cat.amount}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{cat.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}

      {data.scenarioModels && (
        <Section title={i18n.t("artifacts.financialScenarios")} icon={<BarChart3 className="w-4 h-4" />}>
          <ScenarioCards
            title={i18n.t("artifacts.threeScenarioModel")}
            scenarios={
              (["conservative", "base", "optimistic"] as const)
                .filter((s) => data.scenarioModels[s])
                .map((scenario) => {
                  const s = data.scenarioModels[scenario];
                  return {
                    name: scenario.charAt(0).toUpperCase() + scenario.slice(1),
                    subtitle: scenario === "base" ? i18n.t("artifacts.recommendedScenario") : undefined,
                    highlighted: scenario === "base",
                    metrics: [
                      { label: i18n.t("artifacts.annualSavings"), value: String(s.annualSavings || "-") },
                      { label: i18n.t("artifacts.payback"), value: String(s.paybackMonths || "-") },
                      { label: i18n.t("artifacts.fiveYearROI"), value: String(s.roi5Year || "-") },
                    ],
                  };
                })
            }
          />
          {data.scenarioModels.base?.assumptions?.length > 0 && (
            <Card className="mt-3 bg-muted/30">
              <CardContent className="p-4">
                <ListBlock items={data.scenarioModels.base.assumptions} label={i18n.t("artifacts.baseCaseAssumptions")} />
              </CardContent>
            </Card>
          )}
        </Section>
      )}

      {data.scenarioModels && (() => {
        const parseNum = (v: any) => parseFloat(String(v || "0").replace(/[^0-9.-]/g, "")) || 0;
        const cons = data.scenarioModels.conservative;
        const base = data.scenarioModels.base;
        const opt = data.scenarioModels.optimistic;
        if (!cons && !base && !opt) return null;
        const consSavings = parseNum(cons?.annualSavings);
        const baseSavings = parseNum(base?.annualSavings);
        const optSavings = parseNum(opt?.annualSavings);
        const totalInv = parseNum(data.investmentSummary?.totalInvestment);
        if (consSavings === 0 && baseSavings === 0 && optSavings === 0) return null;
        const projData = [1, 2, 3, 4, 5].map((year) => ({
          year: `Year ${year}`,
          conservative: Math.round(consSavings * year - totalInv),
          base: Math.round(baseSavings * year - totalInv),
          optimistic: Math.round(optSavings * year - totalInv),
        }));
        return (
          <Section title={i18n.t("artifacts.cumulativeNetValue")} icon={<TrendingUp className="w-4 h-4" />}>
            <AreaChartPanel
              title={i18n.t("artifacts.fiveYearCumulative")}
              subtitle={i18n.t("artifacts.netValueAfterInvestment")}
              data={projData}
              xAxisKey="year"
              series={[
                { dataKey: "conservative", label: i18n.t("artifacts.conservative"), color: "hsl(var(--chart-4))" },
                { dataKey: "base", label: i18n.t("artifacts.base"), color: "hsl(var(--chart-1))" },
                { dataKey: "optimistic", label: i18n.t("artifacts.optimistic"), color: "hsl(var(--chart-2))" },
              ]}
              valueFormatter={(v: number) => v >= 0 ? `$${(v / 1000).toFixed(0)}k` : `-$${(Math.abs(v) / 1000).toFixed(0)}k`}
            />
          </Section>
        );
      })()}

      {data.financialProjection60Month && (
        <Section title={i18n.t("artifacts.sixtyMonthProjection")} icon={<TrendingUp className="w-4 h-4" />}>
          <TextBlock text={data.financialProjection60Month} />
        </Section>
      )}

      {data.sensitivityAnalysis?.length > 0 && (
        <Section title={i18n.t("artifacts.sensitivityAnalysis")} icon={<Activity className="w-4 h-4" />}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{i18n.t("artifacts.variable")}</TableHead>
                <TableHead>{i18n.t("artifacts.impact")}</TableHead>
                <TableHead>{i18n.t("artifacts.range")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.sensitivityAnalysis.map((sa: any, i: number) => (
                <TableRow key={i} data-testid={`row-sensitivity-${i}`}>
                  <TableCell className="text-sm font-medium">{sa.variable}</TableCell>
                  <TableCell className="text-sm">
                    <StatusBadge status={String(sa.impact || "").toLowerCase().includes("high") ? "high" : "medium"} label={sa.impact} />
                  </TableCell>
                  <TableCell className="text-sm">{sa.range}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}

      {data.riskFactors?.length > 0 && (
        <Section title={i18n.t("artifacts.riskFactors")} icon={<AlertTriangle className="w-4 h-4" />}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{i18n.t("artifacts.risk")}</TableHead>
                <TableHead>{i18n.t("artifacts.probability")}</TableHead>
                <TableHead>{i18n.t("artifacts.mitigation")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.riskFactors.map((rf: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="text-sm font-medium">{rf.risk}</TableCell>
                  <TableCell className="text-sm">
                    <StatusBadge status={mapRiskToStatus(rf.probability)} label={rf.probability} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{rf.mitigation}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}

      <ListBlock items={data.recommendations} label={i18n.t("artifacts.recommendations")} />
      <CaveatsList caveats={data.caveats} />
    </div>
  );
}

function renderOrgDNA(data: any) {
  const roleCount = data.newRoles?.length || 0;
  const raciCount = data.raciMatrix?.length || 0;

  return (
    <div className="space-y-6" data-testid="artifact-detail-orgdna">
      <MetricGrid
        metrics={[
          { label: i18n.t("artifacts.newRoles"), value: String(roleCount), icon: Users, colorVariant: "primary" },
          { label: i18n.t("artifacts.raciProcesses"), value: String(raciCount), icon: Target, colorVariant: "success" },
          ...(data.transitionPlan ? [{ label: i18n.t("artifacts.transitionPhases"), value: "3", icon: Clock, colorVariant: "warning" as const }] : []),
          ...(data.upskilling?.length ? [{ label: i18n.t("artifacts.upskillingPrograms"), value: String(data.upskilling.length), icon: GraduationCap, colorVariant: "primary" as const }] : []),
        ]}
        columns={4}
      />

      {data.executiveSummary && (
        <Section title={i18n.t("artifacts.executiveSummary")} icon={<FileText className="w-4 h-4" />}>
          <TextBlock text={data.executiveSummary} />
        </Section>
      )}

      {data.currentStateAnalysis && (
        <Section title={i18n.t("artifacts.currentStateAnalysis")} icon={<Users className="w-4 h-4" />}>
          <TextBlock text={data.currentStateAnalysis} />
        </Section>
      )}

      {data.targetOperatingModel && (
        <Section title={i18n.t("artifacts.targetOperatingModel")} icon={<Target className="w-4 h-4" />}>
          {data.targetOperatingModel.orgStructure && (
            <Card className="bg-muted/30 mb-3">
              <CardContent className="p-4">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{i18n.t("artifacts.orgStructureLabel")}</span>
                <TextBlock text={data.targetOperatingModel.orgStructure} />
              </CardContent>
            </Card>
          )}
          <ListBlock items={data.targetOperatingModel.designPrinciples} label={i18n.t("artifacts.designPrinciples")} />
          <ListBlock items={data.targetOperatingModel.keyChanges} label={i18n.t("artifacts.keyChanges")} />
        </Section>
      )}

      {data.newRoles?.length > 0 && (
        <Section title={i18n.t("artifacts.newRoles")} icon={<Users className="w-4 h-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.newRoles.map((role: any, i: number) => (
              <Card key={i} data-testid={`card-role-${i}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 flex-wrap">
                    {role.title}
                    {role.reportsTo && (
                      <Badge variant="secondary" className="text-[10px]">→ {role.reportsTo}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {role.purpose && <TextBlock text={role.purpose} />}
                  <ListBlock items={role.responsibilities?.slice(0, 4)} label={i18n.t("artifacts.keyResponsibilities")} />
                  <ListBlock items={role.requiredCompetencies?.slice(0, 3)} label={i18n.t("artifacts.competencies")} />
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {data.raciMatrix?.length > 0 && (
        <Section title={i18n.t("artifacts.raciMatrix")} icon={<Target className="w-4 h-4" />}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">{i18n.t("artifacts.process")}</TableHead>
                  <TableHead className="text-center"><Badge variant="secondary" className="text-[10px]">R</Badge></TableHead>
                  <TableHead className="text-center"><Badge variant="secondary" className="text-[10px]">A</Badge></TableHead>
                  <TableHead className="text-center"><Badge variant="secondary" className="text-[10px]">C</Badge></TableHead>
                  <TableHead className="text-center"><Badge variant="secondary" className="text-[10px]">I</Badge></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.raciMatrix.map((raci: any, i: number) => (
                  <TableRow key={i} data-testid={`row-raci-${i}`}>
                    <TableCell className="text-sm font-medium">{raci.process}</TableCell>
                    <TableCell className="text-xs text-center">{raci.responsible}</TableCell>
                    <TableCell className="text-xs text-center">{raci.accountable}</TableCell>
                    <TableCell className="text-xs text-center text-muted-foreground">{Array.isArray(raci.consulted) ? raci.consulted.join(", ") : raci.consulted}</TableCell>
                    <TableCell className="text-xs text-center text-muted-foreground">{Array.isArray(raci.informed) ? raci.informed.join(", ") : raci.informed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Section>
      )}

      {data.transitionPlan && (
        <Section title={i18n.t("artifacts.transitionPlan")} icon={<Clock className="w-4 h-4" />}>
          <TimelineRoadmap
            title={i18n.t("artifacts.orgTransitionRoadmap")}
            waves={
              (["phase1_foundation", "phase2_migration", "phase3_optimization"] as const)
                .filter((p) => data.transitionPlan[p])
                .map((phase, idx) => {
                  const p = data.transitionPlan[phase];
                  return {
                    label: i18n.t("phases.phaseNLabel", { n: idx + 1, name: phase.split("_")[1]?.replace(/^./, (s: string) => s.toUpperCase()) }),
                    period: i18n.t("phases.nWeeks", { n: p.weeks }),
                    items: p.actions || [],
                  };
                })
            }
          />
        </Section>
      )}

      {data.upskilling?.length > 0 && (
        <Section title={i18n.t("artifacts.upskillingPrograms")} icon={<GraduationCap className="w-4 h-4" />}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{i18n.t("artifacts.audience")}</TableHead>
                <TableHead>{i18n.t("artifacts.program")}</TableHead>
                <TableHead>{i18n.t("artifacts.duration")}</TableHead>
                <TableHead>{i18n.t("artifacts.objectives")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.upskilling.map((u: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="text-sm font-medium">{u.audience}</TableCell>
                  <TableCell className="text-sm">{u.program}</TableCell>
                  <TableCell className="text-sm">
                    <Badge variant="secondary" className="text-[10px]">{u.duration}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {Array.isArray(u.objectives) ? u.objectives.join("; ") : u.objectives || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}

      {data.spanOfControlAnalysis && (
        <Section title={i18n.t("artifacts.spanOfControl")} icon={<Users className="w-4 h-4" />}>
          <TextBlock text={data.spanOfControlAnalysis} />
        </Section>
      )}

      <CaveatsList caveats={data.caveats} />
    </div>
  );
}

function renderAIPolicyCore(data: any) {
  const useCaseCount = data.aiUseCaseInventory?.length || 0;
  const controlCount = data.riskControls?.length || 0;
  const highRisk = data.aiUseCaseInventory?.filter((uc: any) => ["high", "critical"].includes((uc.riskLevel || "").toLowerCase())).length || 0;

  return (
    <div className="space-y-6" data-testid="artifact-detail-aipolicycore">
      <MetricGrid
        metrics={[
          { label: i18n.t("artifacts.aiUseCases"), value: String(useCaseCount), icon: Cpu, colorVariant: "primary" },
          { label: i18n.t("artifacts.highCriticalRisk"), value: String(highRisk), icon: AlertTriangle, colorVariant: highRisk > 0 ? "danger" : "success" },
          { label: i18n.t("artifacts.riskControls"), value: String(controlCount), icon: Shield, colorVariant: "success" },
          ...(data.auditPlan ? [{ label: i18n.t("artifacts.auditFrequency"), value: String(data.auditPlan.frequency || i18n.t("phases.tbd")), icon: Clock, colorVariant: "warning" as const }] : []),
        ]}
        columns={4}
      />

      {data.executiveSummary && (
        <Section title={i18n.t("artifacts.executiveSummary")} icon={<FileText className="w-4 h-4" />}>
          <TextBlock text={data.executiveSummary} />
        </Section>
      )}

      {data.aiUseCaseInventory?.length > 0 && (
        <Section title={i18n.t("artifacts.aiUseCaseInventory")} icon={<Cpu className="w-4 h-4" />}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{i18n.t("artifacts.useCase")}</TableHead>
                  <TableHead>{i18n.t("artifacts.process")}</TableHead>
                  <TableHead>{i18n.t("artifacts.riskLevel")}</TableHead>
                  <TableHead>{i18n.t("artifacts.dataClassification")}</TableHead>
                  <TableHead>{i18n.t("artifacts.oversight")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.aiUseCaseInventory.map((uc: any, i: number) => (
                  <TableRow key={i} data-testid={`row-usecase-${i}`}>
                    <TableCell className="text-sm font-medium">{uc.useCase}</TableCell>
                    <TableCell className="text-sm">{uc.process}</TableCell>
                    <TableCell>
                      <StatusBadge status={mapRiskToStatus(uc.riskLevel)} label={uc.riskLevel} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{uc.dataClassification}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{uc.humanOversight}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Section>
      )}

      {data.governancePolicies && (
        <Section title={i18n.t("artifacts.governancePolicies")} icon={<Shield className="w-4 h-4" />}>
          <Accordion type="multiple" className="w-full">
            {Object.entries(data.governancePolicies).map(([key, value]) => {
              if (!value) return null;
              const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s: string) => s.toUpperCase());
              return (
                <AccordionItem key={key} value={key} data-testid={`accordion-policy-${key}`}>
                  <AccordionTrigger className="text-sm font-medium">{label}</AccordionTrigger>
                  <AccordionContent>
                    <TextBlock text={String(value)} />
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </Section>
      )}

      {data.riskControls?.length > 0 && (
        <Section title={i18n.t("artifacts.riskControls")} icon={<Shield className="w-4 h-4" />}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{i18n.t("artifacts.riskArea")}</TableHead>
                <TableHead>{i18n.t("artifacts.control")}</TableHead>
                <TableHead>{i18n.t("artifacts.frequency")}</TableHead>
                <TableHead>{i18n.t("artifacts.responsible")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.riskControls.map((rc: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="text-sm font-medium">{rc.riskArea}</TableCell>
                  <TableCell className="text-sm">{rc.control}</TableCell>
                  <TableCell className="text-sm">
                    <Badge variant="secondary" className="text-[10px]">{rc.frequency}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{rc.responsible}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}

      {data.complianceMapping && (
        <Section title={i18n.t("artifacts.complianceMapping")} icon={<CheckCircle2 className="w-4 h-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {data.complianceMapping.lgpd?.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold">LGPD</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.complianceMapping.lgpd.map((item: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-green-600 dark:text-green-400" />
                      <span>{item}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {data.complianceMapping.aiAct?.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold">AI Act</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.complianceMapping.aiAct.map((item: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-green-600 dark:text-green-400" />
                      <span>{item}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {data.complianceMapping.isoNist?.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold">ISO / NIST</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.complianceMapping.isoNist.map((item: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-green-600 dark:text-green-400" />
                      <span>{item}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </Section>
      )}

      {data.auditPlan && (
        <Section title={i18n.t("artifacts.auditPlan")} icon={<FileText className="w-4 h-4" />}>
          <Card className="bg-muted/30">
            <CardContent className="p-4 space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">{i18n.t("phases.frequencyPrefix")}</span>
                <span className="font-medium">{data.auditPlan.frequency}</span>
              </div>
              <ListBlock items={data.auditPlan.scope} label={i18n.t("artifacts.scope")} />
              <ListBlock items={data.auditPlan.metrics} label={i18n.t("artifacts.metrics")} />
            </CardContent>
          </Card>
        </Section>
      )}

      {data.modelPromptRegistry && (
        <Section title={i18n.t("artifacts.modelPromptRegistry")} icon={<Cpu className="w-4 h-4" />}>
          <Card className="bg-muted/30">
            <CardContent className="p-4 space-y-2">
              <TextBlock text={data.modelPromptRegistry.structure} />
              {data.modelPromptRegistry.versioningPolicy && (
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{i18n.t("artifacts.versioningPolicy")}</span>
                  <TextBlock text={data.modelPromptRegistry.versioningPolicy} />
                </div>
              )}
              {data.modelPromptRegistry.retentionPolicy && (
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{i18n.t("artifacts.retentionPolicy")}</span>
                  <TextBlock text={data.modelPromptRegistry.retentionPolicy} />
                </div>
              )}
            </CardContent>
          </Card>
        </Section>
      )}

      <CaveatsList caveats={data.caveats} />
    </div>
  );
}

function renderAdoptLoop(data: any) {
  const impactCount = data.changeImpactAssessment?.length || 0;
  const metricsCount = data.successMetrics?.length || 0;
  const feedbackCount = data.feedbackLoops?.length || 0;

  return (
    <div className="space-y-6" data-testid="artifact-detail-adoptloop">
      <MetricGrid
        metrics={[
          { label: i18n.t("artifacts.impactAreas"), value: String(impactCount), icon: Target, colorVariant: "primary" },
          { label: i18n.t("artifacts.successMetrics"), value: String(metricsCount), icon: BarChart3, colorVariant: "success" },
          { label: i18n.t("artifacts.feedbackLoops"), value: String(feedbackCount), icon: Activity, colorVariant: "warning" },
          ...(data.adoptionRoadmap ? [{ label: i18n.t("artifacts.adoptionWaves"), value: "3", icon: Clock, colorVariant: "primary" as const }] : []),
        ]}
        columns={4}
      />

      {data.executiveSummary && (
        <Section title={i18n.t("artifacts.executiveSummary")} icon={<FileText className="w-4 h-4" />}>
          <TextBlock text={data.executiveSummary} />
        </Section>
      )}

      {data.changeImpactAssessment?.length > 0 && (
        <Section title={i18n.t("artifacts.changeImpactAssessment")} icon={<Target className="w-4 h-4" />}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{i18n.t("artifacts.area")}</TableHead>
                  <TableHead>{i18n.t("artifacts.currentState")}</TableHead>
                  <TableHead>{i18n.t("artifacts.targetState")}</TableHead>
                  <TableHead>{i18n.t("artifacts.impact")}</TableHead>
                  <TableHead>{i18n.t("artifacts.readiness")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.changeImpactAssessment.map((ci: any, i: number) => (
                  <TableRow key={i} data-testid={`row-change-impact-${i}`}>
                    <TableCell className="text-sm font-medium">{ci.area}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{ci.currentState}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{ci.targetState}</TableCell>
                    <TableCell>
                      <StatusBadge status={mapRiskToStatus(ci.impactLevel)} label={ci.impactLevel} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={
                          (ci.readinessLevel || "").toLowerCase() === "high" ? "ok"
                            : (ci.readinessLevel || "").toLowerCase() === "medium" ? "medium"
                            : "low"
                        }
                        label={ci.readinessLevel}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data.changeImpactAssessment.some((ci: any) => ci.keyRisks?.length > 0) && (
            <Card className="mt-3 bg-[hsl(var(--chart-5)/0.05)] border-[hsl(var(--chart-5)/0.2)]">
              <CardContent className="p-4">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{i18n.t("artifacts.keyRisksByArea")}</span>
                {data.changeImpactAssessment.filter((ci: any) => ci.keyRisks?.length > 0).map((ci: any, i: number) => (
                  <div key={i} className="mt-2">
                    <span className="text-sm font-medium">{ci.area}:</span>
                    <ListBlock items={ci.keyRisks} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </Section>
      )}

      {data.adoptionRoadmap && (
        <Section title={i18n.t("artifacts.adoptionRoadmapTitle")} icon={<Clock className="w-4 h-4" />}>
          <TimelineRoadmap
            title={i18n.t("artifacts.threeWaveAdoption")}
            waves={
              (["wave1_quickWins", "wave2_scale", "wave3_optimization"] as const)
                .filter((w) => data.adoptionRoadmap[w])
                .map((wave, idx) => {
                  const w = data.adoptionRoadmap[wave];
                  return {
                    label: i18n.t("phases.waveN", { n: idx + 1 }),
                    period: i18n.t("phases.nWeeks", { n: w.weeks }),
                    items: w.milestones || [],
                    milestones: w.successMetrics || [],
                  };
                })
            }
          />
        </Section>
      )}

      {data.communicationPlan && (
        <Section title={i18n.t("artifacts.communicationPlan")} icon={<Megaphone className="w-4 h-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(["board", "managers", "operators"] as const).map((audience) => {
              const plan = data.communicationPlan[audience];
              if (!plan) return null;
              return (
                <Card key={audience} data-testid={`card-comm-${audience}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold capitalize flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" />
                      {audience}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-[10px]">{plan.frequency}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{plan.format}</Badge>
                    </div>
                    <ListBlock items={plan.keyMessages} label={i18n.t("artifacts.keyMessages")} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </Section>
      )}

      {data.upskillingProgram?.length > 0 && (
        <Section title={i18n.t("artifacts.upskillingProgram")} icon={<GraduationCap className="w-4 h-4" />}>
          <Accordion type="multiple" className="w-full">
            {data.upskillingProgram.map((prog: any, i: number) => (
              <AccordionItem key={i} value={`upskill-${i}`} data-testid={`accordion-upskill-${i}`}>
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{prog.track}</span>
                    <Badge variant="secondary" className="text-[10px]">{prog.audience}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{prog.duration}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    {i18n.t("phases.formatPrefix")}<span className="font-medium">{prog.deliveryFormat}</span>
                  </div>
                  <ListBlock items={prog.modules} label={i18n.t("artifacts.modules")} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Section>
      )}

      {data.successMetrics?.length > 0 && (
        <Section title={i18n.t("artifacts.successMetrics")} icon={<BarChart3 className="w-4 h-4" />}>
          <BarChartPanel
            title={i18n.t("artifacts.metricTargets")}
            subtitle={i18n.t("artifacts.baselineW12W24")}
            data={data.successMetrics.slice(0, 6).map((m: any) => ({
              name: String(m.metric || "").substring(0, 20),
              value: parseFloat(String(m.baseline || "0").replace(/[^0-9.-]/g, "")) || 0,
              comparisonValue: parseFloat(String(m.target_week24 || "0").replace(/[^0-9.-]/g, "")) || 0,
            }))}
            showComparison
            valueLabel={i18n.t("artifacts.baseline")}
            comparisonLabel={i18n.t("artifacts.comparisonLabel")}
            layout="horizontal"
          />
          {(() => {
            const parseMetricNum = (v: any) => parseFloat(String(v || "0").replace(/[^0-9.-]/g, "")) || 0;
            const allMetrics = Array.isArray(data.successMetrics) ? data.successMetrics : [];
            const metricsWithNums = allMetrics.slice(0, 5).filter((m: any) =>
              parseMetricNum(m.baseline) > 0 || parseMetricNum(m.target_week12) > 0 || parseMetricNum(m.target_week24) > 0
            );
            if (metricsWithNums.length === 0) return null;
            const timePoints = metricsWithNums.length > 0
              ? [
                  { period: i18n.t("artifacts.baseline"), ...Object.fromEntries(metricsWithNums.map((m: any, i: number) => [`m${i}`, parseMetricNum(m.baseline)])) },
                  { period: i18n.t("artifacts.week12"), ...Object.fromEntries(metricsWithNums.map((m: any, i: number) => [`m${i}`, parseMetricNum(m.target_week12)])) },
                  { period: i18n.t("artifacts.week24"), ...Object.fromEntries(metricsWithNums.map((m: any, i: number) => [`m${i}`, parseMetricNum(m.target_week24)])) },
                ]
              : [];
            return (
              <AreaChartPanel
                title={i18n.t("artifacts.metricProgressionTime")}
                subtitle={i18n.t("artifacts.trackingImprovement")}
                data={timePoints}
                xAxisKey="period"
                series={metricsWithNums.map((m: any, i: number) => ({
                  dataKey: `m${i}`,
                  label: String(m.metric || "").substring(0, 25),
                }))}
              />
            );
          })()}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{i18n.t("artifacts.metric")}</TableHead>
                <TableHead className="text-center">{i18n.t("artifacts.baseline")}</TableHead>
                <TableHead className="text-center">{i18n.t("artifacts.week12")}</TableHead>
                <TableHead className="text-center">{i18n.t("artifacts.week24")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.successMetrics.map((m: any, i: number) => (
                <TableRow key={i} data-testid={`row-metric-${i}`}>
                  <TableCell className="text-sm font-medium">{m.metric}</TableCell>
                  <TableCell className="text-sm text-center">{m.baseline}</TableCell>
                  <TableCell className="text-sm text-center">{m.target_week12}</TableCell>
                  <TableCell className="text-sm text-center font-bold">{m.target_week24}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}

      {data.feedbackLoops?.length > 0 && (
        <Section title={i18n.t("artifacts.feedbackLoops")} icon={<Activity className="w-4 h-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.feedbackLoops.map((fl: any, i: number) => (
              <Card key={i}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{fl.mechanism}</span>
                    <Badge variant="secondary" className="text-[10px]">{fl.frequency}</Badge>
                  </div>
                  {fl.actionProcess && <TextBlock text={fl.actionProcess} />}
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {data.executivePresentationOutline?.length > 0 && (
        <Section title={i18n.t("artifacts.executivePresentationOutline")} icon={<FileText className="w-4 h-4" />}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">{i18n.t("artifacts.slide")}</TableHead>
                <TableHead>{i18n.t("artifacts.title")}</TableHead>
                <TableHead>{i18n.t("artifacts.keyContent")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.executivePresentationOutline.map((slide: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="text-sm font-bold text-center">{slide.slideNumber}</TableCell>
                  <TableCell className="text-sm font-medium">{slide.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{slide.keyContent}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}

      <CaveatsList caveats={data.caveats} />
    </div>
  );
}

function renderPhase0Output(data: any) {
  const totalChecks = data.checks?.length || 0;
  const passedChecks = data.checks?.filter((c: any) => c.passed).length || 0;

  return (
    <div className="space-y-6" data-testid="artifact-detail-phase0">
      {totalChecks > 0 && (
        <MetricGrid
          metrics={[
            { label: i18n.t("artifacts.totalChecks"), value: String(totalChecks), icon: FileText, colorVariant: "primary" },
            { label: i18n.t("artifacts.passed"), value: String(passedChecks), icon: CheckCircle2, colorVariant: "success" },
            { label: i18n.t("artifacts.failedLabel"), value: String(totalChecks - passedChecks), icon: AlertTriangle, colorVariant: totalChecks - passedChecks > 0 ? "danger" : "success" },
          ]}
          columns={3}
        />
      )}

      {data.checks?.length > 0 && (
        <Section title={i18n.t("artifacts.documentChecks")} icon={<CheckCircle2 className="w-4 h-4" />}>
          <Card>
            <CardContent className="p-4 space-y-2">
              {data.checks.map((check: any, i: number) => (
                <div key={i} className="flex items-center gap-3 text-sm py-1 border-b last:border-0" data-testid={`check-item-${i}`}>
                  {check.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  )}
                  <span className="font-medium flex-1">{check.name}</span>
                  {check.detail && <span className="text-muted-foreground text-xs">{check.detail}</span>}
                  <StatusBadge status={check.passed ? "ok" : "critical"} label={check.passed ? i18n.t("phases.passLabel") : i18n.t("phases.failLabel")} />
                </div>
              ))}
            </CardContent>
          </Card>
        </Section>
      )}

      {data.piiResults && (
        <Section title={i18n.t("artifacts.piiScanResults")} icon={<Shield className="w-4 h-4" />}>
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <TextBlock text={typeof data.piiResults === "string" ? data.piiResults : JSON.stringify(data.piiResults, null, 2)} />
            </CardContent>
          </Card>
        </Section>
      )}

      {data.summary && typeof data.summary === "string" && (
        <Section title={i18n.t("artifacts.summary")} icon={<FileText className="w-4 h-4" />}>
          <TextBlock text={data.summary} />
        </Section>
      )}
    </div>
  );
}

function renderGenericArtifact(data: any) {
  const knownKeys = ["version", "generatedAt", "lineage"];
  const contentKeys = Object.keys(data).filter((k) => !knownKeys.includes(k));

  return (
    <div className="space-y-4" data-testid="artifact-detail-generic">
      {contentKeys.map((key) => {
        const value = data[key];
        const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s: string) => s.toUpperCase());

        if (typeof value === "string") {
          return (
            <Section key={key} title={label}>
              <TextBlock text={value} />
            </Section>
          );
        }

        if (Array.isArray(value) && value.length > 0) {
          if (typeof value[0] === "string") {
            return <ListBlock key={key} items={value} label={label} />;
          }
          return (
            <Section key={key} title={label}>
              <div className="space-y-2">
                {value.map((item: any, i: number) => (
                  <Card key={i}>
                    <CardContent className="p-3">
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-hidden">
                        {JSON.stringify(item, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </Section>
          );
        }

        if (typeof value === "object" && value !== null) {
          return (
            <Section key={key} title={label}>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-hidden">
                {JSON.stringify(value, null, 2)}
              </pre>
            </Section>
          );
        }

        if (typeof value === "number" || typeof value === "boolean") {
          return (
            <div key={key} className="text-sm">
              <span className="font-medium">{label}: </span>
              <span className="text-muted-foreground">{String(value)}</span>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

function getArtifactRenderer(type: string, data: any) {
  switch (type) {
    case "valuescope":
      return renderValueScope(data);
    case "zerobase_rebuild":
      return renderZeroBaseRebuild(data);
    case "smartstack":
      return renderSmartStack(data);
    case "valuecase":
      return renderValueCase(data);
    case "orgdna":
      return renderOrgDNA(data);
    case "aipolicycore":
      return renderAIPolicyCore(data);
    case "adoptloop":
      return renderAdoptLoop(data);
    case "phase_0_output":
      return renderPhase0Output(data);
    default:
      return renderGenericArtifact(data);
  }
}

export function ArtifactDetailViewer({ artifact, open, onOpenChange }: ArtifactDetailViewerProps) {
  if (!artifact) return null;

  const data = artifact.dataJson as any;
  const phaseName = artifact.phaseId !== null && artifact.phaseId !== undefined
    ? i18n.t(`phases.phaseShort${artifact.phaseId}`, { defaultValue: PHASES[artifact.phaseId]?.short || i18n.t("phases.phaseN", { id: artifact.phaseId }) })
    : i18n.t("common.general");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col" data-testid="dialog-artifact-detail">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap" data-testid="text-artifact-title">
            <span className="capitalize text-lg">{artifact.type.replace(/_/g, " ")}</span>
            <Badge variant="secondary" className="text-[10px]" data-testid="badge-artifact-phase">{phaseName}</Badge>
            <Badge variant="secondary" className="text-[10px]" data-testid="badge-artifact-version">v{artifact.schemaVersion}</Badge>
          </DialogTitle>
          <DialogDescription>
            {data?.generatedAt && (
              <span className="text-xs text-muted-foreground" data-testid="text-artifact-date">
                {i18n.t("artifacts.generated")}: {new Date(data.generatedAt).toLocaleString()}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-8 pb-6">
            {getArtifactRenderer(artifact.type, data)}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
