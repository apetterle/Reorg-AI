import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ScenarioMetric {
  label: string;
  value: string | number;
}

export interface Scenario {
  name: string;
  subtitle?: string;
  metrics: ScenarioMetric[];
  highlighted?: boolean;
}

interface ScenarioCardsProps {
  title?: string;
  scenarios: Scenario[];
  className?: string;
}

const scenarioColors = [
  { ring: "ring-[hsl(var(--chart-4))]", header: "bg-[hsl(var(--chart-4)/0.08)]" },
  { ring: "ring-[hsl(var(--chart-1))]", header: "bg-[hsl(var(--chart-1)/0.08)]" },
  { ring: "ring-[hsl(var(--chart-2))]", header: "bg-[hsl(var(--chart-2)/0.08)]" },
];

export function ScenarioCards({ title, scenarios, className }: ScenarioCardsProps) {
  return (
    <div data-testid="scenario-cards" className={cn("", className)}>
      {title && (
        <h3 className="text-base font-semibold mb-3">{title}</h3>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {scenarios.map((scenario, idx) => {
          const color = scenarioColors[idx % scenarioColors.length];
          return (
            <Card
              key={scenario.name}
              data-testid={`scenario-card-${idx}`}
              className={cn(
                "relative",
                scenario.highlighted && "ring-2",
                scenario.highlighted && color.ring
              )}
            >
              <CardHeader className={cn("pb-2 rounded-t-md", scenario.highlighted ? color.header : "")}>
                <CardTitle className="text-sm font-bold">{scenario.name}</CardTitle>
                {scenario.subtitle && (
                  <span className="text-xs text-muted-foreground">{scenario.subtitle}</span>
                )}
                {scenario.highlighted && (
                  <span
                    data-testid={`scenario-recommended-${idx}`}
                    className="absolute top-2 right-3 text-xs font-semibold text-[hsl(var(--chart-1))]"
                  >
                    Recommended
                  </span>
                )}
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex flex-col gap-2">
                  {scenario.metrics.map((metric, mIdx) => (
                    <div key={mIdx} className="flex justify-between items-center gap-2">
                      <span className="text-xs text-muted-foreground">{metric.label}</span>
                      <span
                        data-testid={`scenario-metric-${idx}-${mIdx}`}
                        className="text-sm font-bold tabular-nums"
                      >
                        {metric.value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
