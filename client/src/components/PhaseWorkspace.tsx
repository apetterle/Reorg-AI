import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { PHASES, PHASE_DEPENDENCIES } from "@shared/schema";
import type { Artifact, Job, PhaseRun, PhaseGate } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Play, FileText, Lock, Check, Clock,
  AlertTriangle, Loader2, BarChart3, History, Eye
} from "lucide-react";
import { ExecutionProgressTracker } from "./ExecutionProgressTracker";
import { GateChecklist } from "./GateChecklist";

interface PhaseWorkspaceProps {
  phaseId: number;
  completedPhases: number[];
  currentPhase: number;
  artifacts: Artifact[];
  jobs: Job[];
  onRunPhase?: (phaseId: number) => void;
  onViewArtifact?: (artifact: Artifact) => void;
  runningJob?: boolean;
  tenantSlug: string;
  projectId: string;
}

export function PhaseWorkspace({
  phaseId,
  completedPhases,
  currentPhase,
  artifacts,
  jobs,
  onRunPhase,
  onViewArtifact,
  runningJob,
  tenantSlug,
  projectId,
}: PhaseWorkspaceProps) {
  const { t } = useTranslation();
  const phase = PHASES.find((p) => p.id === phaseId);
  if (!phase) return null;

  const deps = PHASE_DEPENDENCIES[phaseId] || [];
  const allDepsMet = deps.every((d) => completedPhases.includes(d));
  const isCompleted = completedPhases.includes(phaseId);
  const isLocked = !allDepsMet && !isCompleted;

  const phaseGoal = t(`phases.phase${phaseId}Goal`);
  const phaseInputsStr = t(`phases.phase${phaseId}Inputs`);
  const phaseInputs = phaseInputsStr ? phaseInputsStr.split(", ") : [];

  const phaseArtifacts = artifacts.filter((a) => a.phaseId === phaseId);
  const phaseJobs = jobs.filter(
    (j) => j.type === `phase_${phaseId}_run_v1` || j.type.startsWith(`phase_${phaseId}_`)
  );
  const latestJob = phaseJobs.length > 0
    ? phaseJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    : null;

  const activeJobId = latestJob && (latestJob.status === "running" || latestJob.status === "queued")
    ? latestJob.id
    : null;

  const { data: phaseRuns } = useQuery<PhaseRun[]>({
    queryKey: ["/api/t", tenantSlug, "projects", projectId, "phase-runs"],
    queryFn: async () => {
      const res = await fetch(`/api/t/${tenantSlug}/projects/${projectId}/phase-runs`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: gates } = useQuery<PhaseGate[]>({
    queryKey: ["/api/t", tenantSlug, "projects", projectId, "gates"],
    queryFn: async () => {
      const res = await fetch(`/api/t/${tenantSlug}/projects/${projectId}/gates`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const thisPhaseRuns = phaseRuns?.filter((r) => r.phaseId === phaseId) || [];
  const thisPhaseGate = gates?.find((g) => g.phaseId === phaseId);

  return (
    <div className="space-y-4" data-testid={`phase-workspace-${phaseId}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-lg font-semibold" data-testid={`text-phase-name-${phaseId}`}>
              {t("phases.phase{{id}}", { id: phaseId, defaultValue: `Phase ${phaseId}` })}: {phase.name}
            </h2>
            {thisPhaseGate?.decision === "passed" && (
              <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400">
                <Check className="w-3 h-3 mr-1" />
                {t("phases.gatePassed")}
              </Badge>
            )}
            {isCompleted && !thisPhaseGate && (
              <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400">
                <Check className="w-3 h-3 mr-1" />
                {t("common.completed")}
              </Badge>
            )}
            {isLocked && (
              <Badge variant="secondary" className="text-xs">
                <Lock className="w-3 h-3 mr-1" />
                {t("common.locked")}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground max-w-xl">{phaseGoal}</p>
        </div>
        <Button
          onClick={() => onRunPhase?.(phaseId)}
          disabled={isLocked || runningJob || !!activeJobId}
          data-testid={`button-run-phase-${phaseId}`}
        >
          {runningJob || activeJobId ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-2" />
          )}
          {runningJob || activeJobId ? t("common.running") : t("phases.runPhaseN", { id: phaseId })}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          {deps.length > 0 && (
            <GateChecklist
              tenantSlug={tenantSlug}
              projectId={projectId}
              phaseId={phaseId}
              gates={gates}
            />
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t("phases.requiredInputs")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {phaseInputs.map((input, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>{input}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {phaseArtifacts.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("project.artifacts")} ({phaseArtifacts.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {phaseArtifacts.map((artifact) => (
                  <div
                    key={artifact.id}
                    className="flex items-center gap-2 text-sm"
                    data-testid={`artifact-item-${artifact.id}`}
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{artifact.type}</span>
                    <Badge variant="secondary" className="text-[10px] ml-auto no-default-hover-elevate no-default-active-elevate">
                      v{artifact.schemaVersion}
                    </Badge>
                    {onViewArtifact && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onViewArtifact(artifact)}
                        data-testid={`button-view-artifact-${artifact.id}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {activeJobId && (
            <ExecutionProgressTracker jobId={activeJobId} />
          )}

          {latestJob && !activeJobId && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("phases.latestRun")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge
                    variant="secondary"
                    className={
                      latestJob.status === "succeeded"
                        ? "bg-green-500/10 text-green-700 dark:text-green-400"
                        : latestJob.status === "running"
                          ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                          : latestJob.status === "failed"
                            ? "bg-red-500/10 text-red-700 dark:text-red-400"
                            : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                    }
                    data-testid={`text-job-status-${latestJob.id}`}
                  >
                    {latestJob.status === "running" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                    {latestJob.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(latestJob.createdAt).toLocaleString()}
                  </span>
                  {latestJob.progress && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {latestJob.progress}%
                    </span>
                  )}
                </div>
                {latestJob.errorMessage && (
                  <div className="mt-2 p-2 rounded-md bg-red-500/5 text-xs text-red-700 dark:text-red-400">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    {latestJob.errorMessage}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {thisPhaseRuns.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <History className="w-4 h-4" />
                  {t("phases.runHistory")} ({thisPhaseRuns.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {thisPhaseRuns.slice(0, 5).map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center gap-3 text-sm p-2 rounded-md bg-muted/30"
                    data-testid={`phase-run-${run.id}`}
                  >
                    <Badge
                      variant="secondary"
                      className={
                        run.status === "completed"
                          ? "bg-green-500/10 text-green-700 dark:text-green-400 text-[10px]"
                          : run.status === "running"
                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[10px]"
                            : run.status === "failed"
                              ? "bg-red-500/10 text-red-700 dark:text-red-400 text-[10px]"
                              : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 text-[10px]"
                      }
                    >
                      {run.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(run.createdAt).toLocaleString()}
                    </span>
                    {run.startedAt && run.finishedAt && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        {Math.round((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s
                      </span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {isLocked && (
            <Card>
              <CardContent className="p-8 text-center">
                <Lock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="font-semibold text-sm mb-1">{t("phases.phaseLocked")}</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {t("phases.completePrerequisites")}
                  {" "}{deps.filter((d) => !completedPhases.includes(d)).map((d) => PHASES[d]?.short).join(", ")}
                </p>
              </CardContent>
            </Card>
          )}

          {!isLocked && !latestJob && !isCompleted && thisPhaseRuns.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Play className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="font-semibold text-sm mb-1">{t("phases.readyToRunTitle")}</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {t("phases.readyToRun", { id: phaseId })}
                </p>
              </CardContent>
            </Card>
          )}

          {isCompleted && phaseArtifacts.length === 0 && thisPhaseRuns.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Check className="w-10 h-10 text-green-500/30 mx-auto mb-3" />
                <h3 className="font-semibold text-sm mb-1">{t("phases.phaseComplete")}</h3>
                <p className="text-xs text-muted-foreground">
                  {t("phases.phaseCompleteDesc")}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
