import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";

interface GaugeChartProps {
  title: string;
  subtitle?: string;
  value: number;
  maxValue?: number;
  label?: string;
  suffix?: string;
  color?: string;
  trackColor?: string;
  className?: string;
}

export function GaugeChart({
  title,
  subtitle,
  value,
  maxValue = 100,
  label,
  suffix = "%",
  color = "hsl(var(--chart-1))",
  trackColor = "hsl(var(--muted))",
  className,
}: GaugeChartProps) {
  const clampedValue = Math.min(Math.max(value, 0), maxValue);
  const percentage = (clampedValue / maxValue) * 100;
  const remaining = maxValue - clampedValue;

  const gaugeData = [
    { name: "value", value: clampedValue },
    { name: "remaining", value: remaining },
  ];

  const chartConfig: ChartConfig = {
    value: {
      label: label || title,
      color,
    },
    remaining: {
      label: "Remaining",
      color: trackColor,
    },
  };

  return (
    <Card className={className} data-testid="gauge-chart">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-0">
        <div>
          <CardTitle className="text-base font-semibold" data-testid="gauge-chart-title">
            {title}
          </CardTitle>
          {subtitle && (
            <p className="text-sm text-muted-foreground" data-testid="gauge-chart-subtitle">
              {subtitle}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center pb-4">
        <ChartContainer config={chartConfig} className="aspect-square h-[180px] w-[180px]">
          <PieChart>
            <Pie
              data={gaugeData}
              cx="50%"
              cy="50%"
              startAngle={210}
              endAngle={-30}
              innerRadius="70%"
              outerRadius="90%"
              paddingAngle={0}
              dataKey="value"
              strokeWidth={0}
              data-testid="gauge-chart-arc"
            >
              <Cell fill={color} />
              <Cell fill={trackColor} />
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="flex flex-col items-center -mt-24" data-testid="gauge-chart-value-display">
          <span className="text-3xl font-bold tabular-nums" data-testid="gauge-chart-value">
            {Math.round(percentage)}
            <span className="text-lg font-medium text-muted-foreground">{suffix}</span>
          </span>
          {label && (
            <span className="text-sm text-muted-foreground mt-1" data-testid="gauge-chart-label">
              {label}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
