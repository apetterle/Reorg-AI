import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface ComparisonItem {
  label: string;
  before: string | number;
  after: string | number;
}

interface ComparisonPanelProps {
  title?: string;
  beforeLabel?: string;
  afterLabel?: string;
  items: ComparisonItem[];
  className?: string;
}

export function ComparisonPanel({
  title,
  beforeLabel = "AS-IS",
  afterLabel = "TO-BE",
  items,
  className,
}: ComparisonPanelProps) {
  return (
    <Card data-testid="comparison-panel" className={cn("", className)}>
      {title && (
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn(title ? "" : "pt-4")}>
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
          <div
            data-testid="comparison-before-header"
            className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--chart-5))] text-center"
          >
            {beforeLabel}
          </div>
          <div />
          <div
            data-testid="comparison-after-header"
            className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--chart-2))] text-center"
          >
            {afterLabel}
          </div>

          {items.map((item) => (
            <div key={item.label} className="contents">
              <div
                data-testid={`comparison-before-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                className="rounded-md bg-[hsl(var(--chart-5)/0.08)] p-3 text-center"
              >
                <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                <div className="text-sm font-bold">{item.before}</div>
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>

              <div
                data-testid={`comparison-after-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                className="rounded-md bg-[hsl(var(--chart-2)/0.08)] p-3 text-center"
              >
                <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                <div className="text-sm font-bold">{item.after}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
