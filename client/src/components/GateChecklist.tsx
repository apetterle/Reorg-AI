import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, Clock, ShieldCheck, Loader2, ThumbsUp, ThumbsDown } from "lucide-react";
import { PHASES } from "@shared/schema";
import type { PhaseGate } from "@shared/schema";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface GateChecklistProps {
  tenantSlug: string;
  projectId: string;
  phaseId: number;
  gates?: PhaseGate[];
}

interface GateResult {
  phaseId: number;
  canRun: boolean;
  dependencies: Array<{
    phaseId: number;
    name: string;
    met: boolean;
  }>;
}

export function GateChecklist({ tenantSlug, projectId, phaseId, gates }: GateChecklistProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");

  const { data, isLoading } = useQuery<GateResult>({
    queryKey: ["/api/t", tenantSlug, "projects", projectId, "phases", String(phaseId), "gate"],
  });

  const existingGate = gates?.find((g) => g.phaseId === phaseId);
  const gateDecision = existingGate?.decision;

  const handleGateDecision = async (decision: "passed" | "failed") => {
    setSubmitting(true);
    try {
      await apiRequest("POST", `/api/t/${tenantSlug}/projects/${projectId}/phases/${phaseId}/gate-decision`, {
        decision,
        notes: notes || undefined,
        checklistJson: data?.dependencies?.map((d) => ({
          item: `Phase ${d.phaseId}: ${d.name}`,
          passed: d.met,
        })),
        evidenceCoverage: data?.dependencies?.filter((d) => d.met).length
          ? Math.round((data.dependencies.filter((d) => d.met).length / data.dependencies.length) * 100)
          : 0,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId, "gates"] });
      toast({ title: decision === "passed" ? t("gate.gateApproved") : t("gate.gateRejected") });
      setNotes("");
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card data-testid={`gate-checklist-loading-${phaseId}`}>
        <CardContent className="p-4 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t("gate.checkingPrerequisites")}</span>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card data-testid={`gate-checklist-${phaseId}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            {t("gate.gateCheck")}
          </CardTitle>
          <Badge
            variant="secondary"
            className={
              gateDecision === "passed"
                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                : gateDecision === "failed"
                  ? "bg-red-500/10 text-red-700 dark:text-red-400"
                  : data.canRun
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
            }
            data-testid={`badge-gate-status-${phaseId}`}
          >
            {gateDecision === "passed" ? t("gate.approved") : gateDecision === "failed" ? t("gate.rejected") : data.canRun ? t("gate.ready") : t("gate.blocked")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.dependencies.length === 0 ? (
          <p className="text-xs text-muted-foreground" data-testid={`text-no-deps-${phaseId}`}>
            {t("gate.noPrerequisites")}
          </p>
        ) : (
          data.dependencies.map((dep) => (
            <div
              key={dep.phaseId}
              className="flex items-center gap-2 text-sm"
              data-testid={`gate-dep-${phaseId}-${dep.phaseId}`}
            >
              {dep.met ? (
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
              <span className={dep.met ? "" : "text-muted-foreground"}>
                Phase {dep.phaseId}: {dep.name}
              </span>
            </div>
          ))
        )}

        {existingGate && existingGate.evidenceCoverage != null && (
          <div className="text-xs text-muted-foreground">
            {t("gate.evidenceCoverage")}: {existingGate.evidenceCoverage}%
          </div>
        )}

        {existingGate?.notes && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            {t("gate.notes")}: {existingGate.notes}
          </div>
        )}

        {data.canRun && !gateDecision && (
          <div className="border-t pt-3 space-y-2">
            <Textarea
              data-testid={`input-gate-notes-${phaseId}`}
              placeholder={t("phases.gateNotes")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="text-xs"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleGateDecision("passed")}
                disabled={submitting}
                className="flex-1"
                data-testid={`button-gate-approve-${phaseId}`}
              >
                {submitting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ThumbsUp className="w-3 h-3 mr-1" />}
                {t("phases.approve")}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleGateDecision("failed")}
                disabled={submitting}
                className="flex-1"
                data-testid={`button-gate-reject-${phaseId}`}
              >
                {submitting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ThumbsDown className="w-3 h-3 mr-1" />}
                {t("phases.reject")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
