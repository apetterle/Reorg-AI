import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowRight, ArrowDown } from "lucide-react";

export interface ProcessStep {
  label: string;
  description?: string;
  automated?: boolean;
}

export interface ProcessFlow {
  processName: string;
  before: ProcessStep[];
  after: ProcessStep[];
}

interface ProcessFlowDiagramProps {
  title?: string;
  flows: ProcessFlow[];
  className?: string;
}

function StepItem({ step, variant }: { step: ProcessStep; variant: "before" | "after" }) {
  const bgColor = variant === "before"
    ? "bg-[hsl(var(--chart-5)/0.06)] border-[hsl(var(--chart-5)/0.15)]"
    : step.automated
      ? "bg-[hsl(var(--chart-1)/0.06)] border-[hsl(var(--chart-1)/0.15)]"
      : "bg-[hsl(var(--chart-2)/0.06)] border-[hsl(var(--chart-2)/0.15)]";

  return (
    <div className={cn("rounded-md border p-2 text-center", bgColor)}>
      <div className="text-xs font-medium">{step.label}</div>
      {step.description && (
        <div className="text-xs text-muted-foreground mt-0.5">{step.description}</div>
      )}
      {step.automated && variant === "after" && (
        <span className="inline-block mt-1 text-xs font-semibold text-[hsl(var(--chart-1))]">AI</span>
      )}
    </div>
  );
}

export function ProcessFlowDiagram({ title, flows, className }: ProcessFlowDiagramProps) {
  return (
    <Card data-testid="process-flow-diagram" className={cn("", className)}>
      {title && (
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn(title ? "" : "pt-4")}>
        <div className="flex flex-col gap-6">
          {flows.map((flow, fIdx) => (
            <div key={fIdx} data-testid={`process-flow-${fIdx}`}>
              <div className="text-sm font-bold mb-2">{flow.processName}</div>
              <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--chart-5))] mb-2 text-center">
                    AS-IS
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {flow.before.map((step, sIdx) => (
                      <div key={sIdx} className="flex flex-col items-center gap-1">
                        <StepItem step={step} variant="before" />
                        {sIdx < flow.before.length - 1 && (
                          <ArrowDown className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center pt-8">
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--chart-2))] mb-2 text-center">
                    TO-BE
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {flow.after.map((step, sIdx) => (
                      <div key={sIdx} className="flex flex-col items-center gap-1">
                        <StepItem step={step} variant="after" />
                        {sIdx < flow.after.length - 1 && (
                          <ArrowDown className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
