import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  LabelList,
} from "recharts";

export interface BarChartItem {
  name: string;
  value: number;
  comparisonValue?: number;
  fill?: string;
}

interface BarChartPanelProps {
  title: string;
  subtitle?: string;
  data: BarChartItem[];
  layout?: "vertical" | "horizontal";
  showComparison?: boolean;
  valueLabel?: string;
  comparisonLabel?: string;
  valueFormatter?: (value: number) => string;
  className?: string;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function BarChartPanel({
  title,
  subtitle,
  data,
  layout = "vertical",
  showComparison = false,
  valueLabel = "Value",
  comparisonLabel = "Comparison",
  valueFormatter = (v: number) => v.toLocaleString(),
  className,
}: BarChartPanelProps) {
  const chartConfig: ChartConfig = {
    value: {
      label: valueLabel,
      color: "hsl(var(--chart-1))",
    },
    ...(showComparison
      ? {
          comparisonValue: {
            label: comparisonLabel,
            color: "hsl(var(--chart-2))",
          },
        }
      : {}),
  };

  const isHorizontal = layout === "horizontal";

  return (
    <Card className={className} data-testid="bar-chart-panel">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-semibold" data-testid="bar-chart-title">
            {title}
          </CardTitle>
          {subtitle && (
            <p className="text-sm text-muted-foreground" data-testid="bar-chart-subtitle">
              {subtitle}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
          <BarChart
            data={data}
            layout={isHorizontal ? "vertical" : "horizontal"}
            margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border/40"
              horizontal={!isHorizontal}
              vertical={isHorizontal}
            />
            {isHorizontal ? (
              <>
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={valueFormatter}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={valueFormatter}
                />
              </>
            )}
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    typeof value === "number" ? valueFormatter(value) : value
                  }
                />
              }
            />
            <Bar
              dataKey="value"
              radius={[4, 4, 0, 0]}
              fill="var(--color-value)"
              data-testid="bar-chart-bar-value"
            >
              {!showComparison &&
                data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill || CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              <LabelList
                dataKey="value"
                position={isHorizontal ? "right" : "top"}
                formatter={valueFormatter}
                className="fill-foreground text-xs"
              />
            </Bar>
            {showComparison && (
              <Bar
                dataKey="comparisonValue"
                radius={[4, 4, 0, 0]}
                fill="var(--color-comparisonValue)"
                data-testid="bar-chart-bar-comparison"
              >
                <LabelList
                  dataKey="comparisonValue"
                  position={isHorizontal ? "right" : "top"}
                  formatter={valueFormatter}
                  className="fill-foreground text-xs"
                />
              </Bar>
            )}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
