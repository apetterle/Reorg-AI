import { useTranslation } from "react-i18next";
import { PHASES, PHASE_DEPENDENCIES } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock, Check, ChevronRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type PhaseState = "locked" | "active" | "completed" | "gate_passed";

interface PhaseProgressStepperProps {
  currentPhase: number;
  completedPhases: number[];
  gatePassedPhases?: number[];
  onPhaseClick?: (phaseId: number) => void;
}

function getPhaseState(
  phaseId: number,
  currentPhase: number,
  completedPhases: number[],
  gatePassedPhases: number[] = []
): PhaseState {
  if (gatePassedPhases.includes(phaseId)) return "gate_passed";
  if (completedPhases.includes(phaseId)) return "completed";
  if (phaseId === currentPhase) return "active";
  const deps = PHASE_DEPENDENCIES[phaseId] || [];
  const allDepsMet = deps.every((dep) => completedPhases.includes(dep));
  if (allDepsMet && phaseId <= currentPhase) return "active";
  if (allDepsMet) return "locked";
  return "locked";
}

const stateStyles: Record<PhaseState, string> = {
  locked: "bg-muted text-muted-foreground",
  active: "bg-primary/10 text-primary border-primary/30",
  completed: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
  gate_passed: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
};

const dotStyles: Record<PhaseState, string> = {
  locked: "bg-muted-foreground/30",
  active: "bg-primary",
  completed: "bg-green-500",
  gate_passed: "bg-green-500",
};

export function PhaseProgressStepper({
  currentPhase,
  completedPhases,
  gatePassedPhases,
  onPhaseClick,
}: PhaseProgressStepperProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1" data-testid="phase-progress-stepper">
      {PHASES.map((phase, idx) => {
        const state = getPhaseState(phase.id, currentPhase, completedPhases, gatePassedPhases);
        const isClickable = state !== "locked";

        return (
          <div key={phase.id} className="flex items-center gap-1 flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => isClickable && onPhaseClick?.(phase.id)}
                  disabled={!isClickable}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium border transition-colors",
                    stateStyles[state],
                    isClickable ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                    state === "locked" && "border-transparent"
                  )}
                  data-testid={`phase-step-${phase.id}`}
                >
                  <span
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                      state === "completed" || state === "gate_passed"
                        ? "bg-green-500 text-white"
                        : state === "active"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted-foreground/20 text-muted-foreground"
                    )}
                  >
                    {state === "gate_passed" ? (
                      <ShieldCheck className="w-3 h-3" />
                    ) : state === "completed" ? (
                      <Check className="w-3 h-3" />
                    ) : state === "locked" ? (
                      <Lock className="w-2.5 h-2.5" />
                    ) : (
                      phase.id
                    )}
                  </span>
                  <span className="hidden sm:inline whitespace-nowrap">{phase.short}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{phase.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{state}</p>
                {PHASE_DEPENDENCIES[phase.id]?.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("phases.requires")}: {PHASE_DEPENDENCIES[phase.id].map(d => PHASES[d]?.short).join(", ")}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
            {idx < PHASES.length - 1 && (
              <ChevronRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface PhaseNavProps {
  currentPhase: number;
  completedPhases: number[];
  selectedPhase: number | null;
  onSelectPhase: (phaseId: number) => void;
}

const phaseIcons: Record<number, string> = {
  0: "B",
  1: "V",
  2: "Z",
  3: "S",
  4: "C",
  5: "D",
  6: "A",
  7: "L",
};

export function PhaseNav({
  currentPhase,
  completedPhases,
  selectedPhase,
  onSelectPhase,
}: PhaseNavProps) {
  const { t } = useTranslation();

  return (
    <nav className="space-y-1" data-testid="phase-nav">
      {PHASES.map((phase) => {
        const state = getPhaseState(phase.id, currentPhase, completedPhases);
        const isSelected = selectedPhase === phase.id;
        const isClickable = state !== "locked";

        return (
          <button
            key={phase.id}
            type="button"
            onClick={() => isClickable && onSelectPhase(phase.id)}
            disabled={!isClickable}
            className={cn(
              "w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors text-left",
              isSelected
                ? "bg-primary/10 text-primary font-medium"
                : isClickable
                  ? "hover-elevate"
                  : "opacity-50 cursor-not-allowed",
            )}
            data-testid={`phase-nav-${phase.id}`}
          >
            <span
              className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0",
                state === "completed"
                  ? "bg-green-500 text-white"
                  : state === "active"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {state === "completed" ? (
                <Check className="w-3.5 h-3.5" />
              ) : state === "locked" ? (
                <Lock className="w-3 h-3" />
              ) : (
                phaseIcons[phase.id]
              )}
            </span>
            <div className="min-w-0">
              <p className="font-medium text-xs leading-tight truncate">{phase.short}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Phase {phase.id}</p>
            </div>
            {state === "completed" && (
              <Badge variant="secondary" className="ml-auto text-[10px] no-default-hover-elevate no-default-active-elevate">
                {t("phases.done")}
              </Badge>
            )}
          </button>
        );
      })}
    </nav>
  );
}
