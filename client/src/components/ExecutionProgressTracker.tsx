import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Check, XCircle, Clock, AlertTriangle } from "lucide-react";
import type { Job, JobStep } from "@shared/schema";

interface ExecutionProgressTrackerProps {
  jobId: string;
  onComplete?: () => void;
}

const stepStatusIcon: Record<string, any> = {
  pending: Clock,
  running: Loader2,
  succeeded: Check,
  failed: XCircle,
};

const stepStatusColor: Record<string, string> = {
  pending: "text-muted-foreground",
  running: "text-blue-600 dark:text-blue-400",
  succeeded: "text-green-600 dark:text-green-400",
  failed: "text-red-600 dark:text-red-400",
};

export function ExecutionProgressTracker({ jobId, onComplete }: ExecutionProgressTrackerProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery<{ job: Job; steps: JobStep[] }>({
    queryKey: ["/api/jobs", jobId, "poll"],
    refetchInterval: (query) => {
      const job = query.state.data?.job;
      if (job && (job.status === "succeeded" || job.status === "failed")) {
        return false;
      }
      return 2000;
    },
  });

  const job = data?.job;
  const steps = data?.steps || [];

  if (job && (job.status === "succeeded" || job.status === "failed") && onComplete) {
    setTimeout(onComplete, 500);
  }

  if (isLoading || !job) {
    return (
      <Card data-testid="execution-progress-tracker-loading">
        <CardContent className="p-4 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t("execution.loadingJobStatus")}</span>
        </CardContent>
      </Card>
    );
  }

  const progress = job.progress ? parseFloat(String(job.progress)) : 0;
  const completedSteps = steps.filter((s) => s.status === "succeeded").length;
  const totalSteps = steps.length || 1;

  return (
    <Card data-testid={`execution-progress-tracker-${jobId}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm">{t("execution.executionProgress")}</CardTitle>
          <Badge
            variant="secondary"
            className={
              job.status === "succeeded"
                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                : job.status === "running"
                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                  : job.status === "failed"
                    ? "bg-red-500/10 text-red-700 dark:text-red-400"
                    : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
            }
            data-testid={`badge-job-status-${jobId}`}
          >
            {job.status === "running" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            {job.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {completedSteps}/{totalSteps} {t("execution.steps")}
            </span>
            <span className="text-xs font-medium" data-testid={`text-progress-${jobId}`}>
              {progress.toFixed(0)}%
            </span>
          </div>
          <Progress value={progress} className="h-2" data-testid={`progress-bar-${jobId}`} />
        </div>

        {steps.length > 0 && (
          <div className="space-y-1.5">
            {steps.map((step) => {
              const Icon = stepStatusIcon[step.status] || Clock;
              const color = stepStatusColor[step.status] || "text-muted-foreground";
              return (
                <div
                  key={step.id}
                  className="flex items-center gap-2 text-sm"
                  data-testid={`step-item-${step.id}`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 flex-shrink-0 ${color} ${step.status === "running" ? "animate-spin" : ""}`}
                  />
                  <span className={step.status === "pending" ? "text-muted-foreground" : ""}>
                    {step.step}
                  </span>
                  {step.errorMessage && (
                    <span className="text-xs text-red-500 truncate ml-auto">{step.errorMessage}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {job.errorMessage && (
          <div className="p-2 rounded-md bg-red-500/5 text-xs text-red-700 dark:text-red-400">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            {job.errorMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
