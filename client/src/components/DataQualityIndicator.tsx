import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Database, FileCheck, Clock } from "lucide-react";
import type { Document as Doc, Fact } from "@shared/schema";
import { useTranslation } from "react-i18next";

interface DataQualityIndicatorProps {
  documents: Doc[];
  facts: Fact[];
}

function getQualityLevel(value: number, t: (key: string) => string): { label: string; color: string } {
  if (value >= 80) return { label: t("dataQuality.high"), color: "text-green-600 dark:text-green-400" };
  if (value >= 50) return { label: t("dataQuality.medium"), color: "text-yellow-600 dark:text-yellow-400" };
  return { label: t("dataQuality.low"), color: "text-red-600 dark:text-red-400" };
}

export function DataQualityIndicator({ documents, facts }: DataQualityIndicatorProps) {
  const { t } = useTranslation();
  const totalDocs = documents.length;
  const readyDocs = documents.filter(
    (d) => d.status === "ready" || d.status === "ingested" || d.status === "extracted"
  ).length;
  const coverage = totalDocs > 0 ? (readyDocs / totalDocs) * 100 : 0;

  const totalFacts = facts.length;
  const approvedFacts = facts.filter((f) => f.status === "approved").length;
  const completeness = totalFacts > 0 ? (approvedFacts / totalFacts) * 100 : 0;

  const now = new Date();
  const recentDocs = documents.filter((d) => {
    const diff = now.getTime() - new Date(d.createdAt).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  }).length;
  const freshness = totalDocs > 0 ? (recentDocs / totalDocs) * 100 : 0;

  const coverageQ = getQualityLevel(coverage, t);
  const completenessQ = getQualityLevel(completeness, t);
  const freshnessQ = getQualityLevel(freshness, t);

  return (
    <div className="grid grid-cols-3 gap-3" data-testid="data-quality-indicator">
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className="cursor-default" data-testid="quality-coverage">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Database className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">{t("dataQuality.coverage")}</span>
              </div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className={`text-sm font-bold ${coverageQ.color}`}>{coverage.toFixed(0)}%</span>
                <Badge variant="secondary" className="text-[9px]">{coverageQ.label}</Badge>
              </div>
              <Progress value={coverage} className="h-1" />
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("dataQuality.docsReady", { ready: readyDocs, total: totalDocs })}</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Card className="cursor-default" data-testid="quality-completeness">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <FileCheck className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">{t("dataQuality.completeness")}</span>
              </div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className={`text-sm font-bold ${completenessQ.color}`}>{completeness.toFixed(0)}%</span>
                <Badge variant="secondary" className="text-[9px]">{completenessQ.label}</Badge>
              </div>
              <Progress value={completeness} className="h-1" />
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("dataQuality.factsApproved", { approved: approvedFacts, total: totalFacts })}</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Card className="cursor-default" data-testid="quality-freshness">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">{t("dataQuality.freshness")}</span>
              </div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className={`text-sm font-bold ${freshnessQ.color}`}>{freshness.toFixed(0)}%</span>
                <Badge variant="secondary" className="text-[9px]">{freshnessQ.label}</Badge>
              </div>
              <Progress value={freshness} className="h-1" />
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("dataQuality.docsRecent", { recent: recentDocs, total: totalDocs })}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
