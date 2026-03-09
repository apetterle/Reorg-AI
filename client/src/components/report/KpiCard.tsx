import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export type KpiTrend = "up" | "down" | "neutral";
export type KpiColorVariant = "default" | "primary" | "success" | "warning" | "danger";

interface KpiCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: KpiTrend;
  trendLabel?: string;
  colorVariant?: KpiColorVariant;
  className?: string;
}

const variantStyles: Record<KpiColorVariant, string> = {
  default: "border-l-muted-foreground/30",
  primary: "border-l-[hsl(var(--chart-1))]",
  success: "border-l-[hsl(var(--chart-2))]",
  warning: "border-l-[hsl(var(--chart-4))]",
  danger: "border-l-[hsl(var(--chart-5))]",
};

const trendIcons: Record<KpiTrend, LucideIcon> = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

const trendColors: Record<KpiTrend, string> = {
  up: "text-[hsl(var(--chart-2))]",
  down: "text-[hsl(var(--chart-5))]",
  neutral: "text-muted-foreground",
};

export function KpiCard({
  label,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  colorVariant = "default",
  className,
}: KpiCardProps) {
  const TrendIcon = trend ? trendIcons[trend] : null;

  return (
    <Card
      data-testid={`kpi-card-${label.toLowerCase().replace(/\s+/g, "-")}`}
      className={cn("relative border-l-4 rounded-none rounded-r-md", variantStyles[colorVariant], className)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex flex-col gap-1 min-w-0">
            <span
              data-testid={`kpi-label-${label.toLowerCase().replace(/\s+/g, "-")}`}
              className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
            >
              {label}
            </span>
            <span
              data-testid={`kpi-value-${label.toLowerCase().replace(/\s+/g, "-")}`}
              className="text-2xl font-bold tracking-tight leading-none"
            >
              {value}
            </span>
            {subtitle && (
              <span
                data-testid={`kpi-subtitle-${label.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-xs text-muted-foreground mt-1"
              >
                {subtitle}
              </span>
            )}
            {trend && TrendIcon && (
              <div className={cn("flex items-center gap-1 mt-1", trendColors[trend])}>
                <TrendIcon className="w-3 h-3" />
                {trendLabel && (
                  <span data-testid={`kpi-trend-${label.toLowerCase().replace(/\s+/g, "-")}`} className="text-xs font-medium">
                    {trendLabel}
                  </span>
                )}
              </div>
            )}
          </div>
          {Icon && (
            <div className="rounded-md bg-muted p-2 shrink-0">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
