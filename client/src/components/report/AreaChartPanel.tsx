import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export interface AreaChartSeries {
  dataKey: string;
  label: string;
  color?: string;
  strokeDasharray?: string;
}

interface AreaChartPanelProps {
  title: string;
  subtitle?: string;
  data: Record<string, unknown>[];
  xAxisKey: string;
  series: AreaChartSeries[];
  valueFormatter?: (value: number) => string;
  showLegend?: boolean;
  stacked?: boolean;
  className?: string;
}

const DEFAULT_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function AreaChartPanel({
  title,
  subtitle,
  data,
  xAxisKey,
  series,
  valueFormatter = (v: number) => v.toLocaleString(),
  showLegend = true,
  stacked = false,
  className,
}: AreaChartPanelProps) {
  const chartConfig: ChartConfig = series.reduce(
    (acc, s, i) => ({
      ...acc,
      [s.dataKey]: {
        label: s.label,
        color: s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      },
    }),
    {} as ChartConfig
  );

  return (
    <Card className={className} data-testid="area-chart-panel">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-semibold" data-testid="area-chart-title">
            {title}
          </CardTitle>
          {subtitle && (
            <p className="text-sm text-muted-foreground" data-testid="area-chart-subtitle">
              {subtitle}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
          >
            <defs>
              {series.map((s, i) => {
                const color = s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
                return (
                  <linearGradient
                    key={s.dataKey}
                    id={`gradient-${s.dataKey}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border/40"
              vertical={false}
            />
            <XAxis
              dataKey={xAxisKey}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={valueFormatter}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    typeof value === "number" ? valueFormatter(value) : value
                  }
                />
              }
            />
            {showLegend && (
              <ChartLegend content={<ChartLegendContent />} />
            )}
            {series.map((s, i) => {
              const color = s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
              return (
                <Area
                  key={s.dataKey}
                  type="monotone"
                  dataKey={s.dataKey}
                  stackId={stacked ? "stack" : undefined}
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray={s.strokeDasharray}
                  fill={`url(#gradient-${s.dataKey})`}
                  dot={false}
                  data-testid={`area-chart-series-${s.dataKey}`}
                />
              );
            })}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
