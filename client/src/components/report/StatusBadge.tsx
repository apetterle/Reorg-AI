import { cn } from "@/lib/utils";

export type StatusLevel = "critical" | "high" | "medium" | "low" | "ok" | "above" | "info";

interface StatusBadgeProps {
  status: StatusLevel;
  label?: string;
  className?: string;
}

const statusStyles: Record<StatusLevel, { bg: string; text: string; defaultLabel: string }> = {
  critical: {
    bg: "bg-[hsl(var(--chart-5)/0.12)]",
    text: "text-[hsl(var(--chart-5))]",
    defaultLabel: "CRITICAL",
  },
  high: {
    bg: "bg-[hsl(var(--chart-4)/0.12)]",
    text: "text-[hsl(var(--chart-4))]",
    defaultLabel: "HIGH",
  },
  medium: {
    bg: "bg-[hsl(var(--chart-4)/0.12)]",
    text: "text-[hsl(var(--chart-4))]",
    defaultLabel: "MEDIUM",
  },
  low: {
    bg: "bg-[hsl(var(--chart-2)/0.12)]",
    text: "text-[hsl(var(--chart-2))]",
    defaultLabel: "LOW",
  },
  ok: {
    bg: "bg-[hsl(var(--chart-2)/0.12)]",
    text: "text-[hsl(var(--chart-2))]",
    defaultLabel: "OK",
  },
  above: {
    bg: "bg-[hsl(var(--chart-1)/0.12)]",
    text: "text-[hsl(var(--chart-1))]",
    defaultLabel: "ABOVE",
  },
  info: {
    bg: "bg-[hsl(var(--chart-3)/0.12)]",
    text: "text-[hsl(var(--chart-3))]",
    defaultLabel: "INFO",
  },
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const style = statusStyles[status] || statusStyles.info;
  const displayLabel = label || style.defaultLabel;

  return (
    <span
      data-testid={`status-badge-${status}`}
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        style.bg,
        style.text,
        className
      )}
    >
      {displayLabel}
    </span>
  );
}
