import { cn } from "@/lib/utils";
import { KpiCard, type KpiTrend, type KpiColorVariant } from "./KpiCard";
import { type LucideIcon } from "lucide-react";

export interface MetricItem {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: KpiTrend;
  trendLabel?: string;
  colorVariant?: KpiColorVariant;
}

interface MetricGridProps {
  metrics: MetricItem[];
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}

const columnClasses: Record<number, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5",
};

export function MetricGrid({ metrics, columns = 4, className }: MetricGridProps) {
  const cols = Math.min(columns, metrics.length);

  return (
    <div
      data-testid="metric-grid"
      className={cn("grid gap-3", columnClasses[cols] || columnClasses[4], className)}
    >
      {metrics.map((metric) => (
        <KpiCard key={metric.label} {...metric} />
      ))}
    </div>
  );
}
