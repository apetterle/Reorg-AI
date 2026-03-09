import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, Download, Eye, BarChart3, Zap, Lock, History } from "lucide-react";
import { PHASES } from "@shared/schema";
import type { Artifact } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { VersionTimeline } from "./VersionTimeline";

interface OutputCardProps {
  artifact: Artifact;
  tenantSlug?: string;
  projectId?: string;
  onView?: (artifact: Artifact) => void;
  onDownload?: (artifact: Artifact) => void;
}

const typeIcons: Record<string, any> = {
  valuescope: Zap,
  report: FileText,
  chart: BarChart3,
};

export function OutputCard({ artifact, tenantSlug, projectId, onView, onDownload }: OutputCardProps) {
  const { t } = useTranslation();
  const [versionsOpen, setVersionsOpen] = useState(false);
  const { toast } = useToast();

  const lockMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/artifacts/${artifact.id}/lock`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId, "outputs"] });
      toast({ title: t("artifacts.artifactLocked") });
    },
    onError: (err: Error) => {
      toast({ title: t("artifacts.lockFailed"), description: err.message, variant: "destructive" });
    },
  });

  const data = artifact.dataJson as any;
  const phaseName = artifact.phaseId !== null && artifact.phaseId !== undefined
    ? PHASES[artifact.phaseId]?.short || `Phase ${artifact.phaseId}`
    : t("artifacts.general");
  const Icon = typeIcons[artifact.type] || BarChart3;

  return (
    <>
      <Card data-testid={`output-card-${artifact.id}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-sm flex items-center gap-2">
              <Icon className="w-4 h-4 text-primary" />
              <span className="truncate">{artifact.type}</span>
              {artifact.locked && (
                <Lock className="w-3 h-3 text-muted-foreground" />
              )}
            </CardTitle>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="secondary" className="text-[10px]" data-testid={`badge-phase-${artifact.id}`}>
                {phaseName}
              </Badge>
              <Badge variant="secondary" className="text-[10px]" data-testid={`badge-version-${artifact.id}`}>
                v{artifact.schemaVersion}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {data?.summary && (
            <div className="grid grid-cols-2 gap-2">
              {data.summary.totalApprovedFacts !== undefined && (
                <div className="p-2 rounded-md bg-muted/50">
                  <span className="text-[10px] text-muted-foreground block">{t("artifacts.facts")}</span>
                  <span className="text-sm font-bold">{data.summary.totalApprovedFacts}</span>
                </div>
              )}
              {data.summary.averageConfidence !== undefined && (
                <div className="p-2 rounded-md bg-muted/50">
                  <span className="text-[10px] text-muted-foreground block">{t("artifacts.avgConfidence")}</span>
                  <span className="text-sm font-bold">
                    {((data.summary.averageConfidence || 0) * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          )}

          {data?.kpis?.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">
                {data.kpis.length} KPI{data.kpis.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {data?.opportunities?.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">
                {data.opportunities.length} {data.opportunities.length !== 1 ? t("artifacts.opportunitiesCount_plural", { count: data.opportunities.length }).split(" ").slice(1).join(" ") : t("artifacts.opportunitiesCount", { count: 1 }).split(" ").slice(1).join(" ")}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[10px] text-muted-foreground">
              {new Date(artifact.createdAt).toLocaleDateString()}
            </span>
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={artifact.locked || lockMutation.isPending}
                      onClick={() => lockMutation.mutate()}
                      data-testid="button-lock-artifact"
                    >
                      <Lock className="w-4 h-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {artifact.locked ? t("artifacts.alreadyLocked") : t("artifacts.lockArtifact")}
                </TooltipContent>
              </Tooltip>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setVersionsOpen(true)}
                data-testid="button-view-versions"
              >
                <History className="w-4 h-4" />
              </Button>

              {onView && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onView(artifact)}
                  data-testid={`button-view-output-${artifact.id}`}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              )}
              {onDownload && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDownload(artifact)}
                  data-testid={`button-download-output-${artifact.id}`}
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={versionsOpen} onOpenChange={setVersionsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("artifacts.versionHistory")}</DialogTitle>
          </DialogHeader>
          <VersionTimeline
            artifactId={artifact.id}
            tenantSlug={tenantSlug || ""}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
