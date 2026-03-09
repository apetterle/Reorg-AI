import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StackTool {
  name: string;
  cost?: string;
  decision?: "build" | "buy" | "partner";
}

export interface StackLayer {
  name: string;
  description?: string;
  tools: StackTool[];
}

interface StackDiagramProps {
  title?: string;
  layers: StackLayer[];
  className?: string;
}

const layerColors = [
  { bg: "bg-[hsl(var(--chart-1)/0.06)]", border: "border-l-[hsl(var(--chart-1))]", badge: "bg-[hsl(var(--chart-1)/0.12)] text-[hsl(var(--chart-1))]" },
  { bg: "bg-[hsl(var(--chart-3)/0.06)]", border: "border-l-[hsl(var(--chart-3))]", badge: "bg-[hsl(var(--chart-3)/0.12)] text-[hsl(var(--chart-3))]" },
  { bg: "bg-[hsl(var(--chart-4)/0.06)]", border: "border-l-[hsl(var(--chart-4))]", badge: "bg-[hsl(var(--chart-4)/0.12)] text-[hsl(var(--chart-4))]" },
  { bg: "bg-[hsl(var(--chart-2)/0.06)]", border: "border-l-[hsl(var(--chart-2))]", badge: "bg-[hsl(var(--chart-2)/0.12)] text-[hsl(var(--chart-2))]" },
];

const decisionLabels: Record<string, string> = {
  build: "Build",
  buy: "Buy",
  partner: "Partner",
};

export function StackDiagram({ title, layers, className }: StackDiagramProps) {
  return (
    <Card data-testid="stack-diagram" className={cn("", className)}>
      {title && (
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn(title ? "" : "pt-4")}>
        <div className="flex flex-col gap-2">
          {layers.map((layer, idx) => {
            const color = layerColors[idx % layerColors.length];
            return (
              <div
                key={layer.name}
                data-testid={`stack-layer-${idx}`}
                className={cn(
                  "rounded-md border-l-4 p-3",
                  color.bg,
                  color.border
                )}
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-sm font-bold">{layer.name}</span>
                  {layer.description && (
                    <span className="text-xs text-muted-foreground">{layer.description}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {layer.tools.map((tool, tIdx) => (
                    <div
                      key={tIdx}
                      data-testid={`stack-tool-${idx}-${tIdx}`}
                      className="flex items-center gap-1.5"
                    >
                      <span className="text-xs bg-background rounded-md px-2 py-1 font-medium border">
                        {tool.name}
                      </span>
                      {tool.cost && (
                        <span className={cn("text-xs px-1.5 py-0.5 rounded-md font-medium", color.badge)}>
                          {tool.cost}
                        </span>
                      )}
                      {tool.decision && (
                        <span className="text-xs text-muted-foreground italic">
                          {decisionLabels[tool.decision]}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
