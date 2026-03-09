import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface TimelineWave {
  label: string;
  period: string;
  items: string[];
  milestones?: string[];
}

interface TimelineRoadmapProps {
  title?: string;
  waves: TimelineWave[];
  className?: string;
}

const waveColors = [
  { border: "border-[hsl(var(--chart-1))]", bg: "bg-[hsl(var(--chart-1)/0.08)]", dot: "bg-[hsl(var(--chart-1))]" },
  { border: "border-[hsl(var(--chart-3))]", bg: "bg-[hsl(var(--chart-3)/0.08)]", dot: "bg-[hsl(var(--chart-3))]" },
  { border: "border-[hsl(var(--chart-2))]", bg: "bg-[hsl(var(--chart-2)/0.08)]", dot: "bg-[hsl(var(--chart-2))]" },
];

export function TimelineRoadmap({ title, waves, className }: TimelineRoadmapProps) {
  return (
    <Card data-testid="timeline-roadmap" className={cn("", className)}>
      {title && (
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn(title ? "" : "pt-4")}>
        <div className="relative">
          <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />

          <div className="flex flex-col gap-6">
            {waves.map((wave, idx) => {
              const color = waveColors[idx % waveColors.length];
              return (
                <div key={wave.label} className="relative pl-8" data-testid={`timeline-wave-${idx}`}>
                  <div className={cn("absolute left-1.5 top-1 w-3 h-3 rounded-full border-2 border-background", color.dot)} />

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold">{wave.label}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", color.bg)}>
                        {wave.period}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      {wave.items.map((item, itemIdx) => (
                        <div
                          key={itemIdx}
                          data-testid={`timeline-item-${idx}-${itemIdx}`}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                          {item}
                        </div>
                      ))}
                    </div>

                    {wave.milestones && wave.milestones.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {wave.milestones.map((ms, msIdx) => (
                          <span
                            key={msIdx}
                            data-testid={`timeline-milestone-${idx}-${msIdx}`}
                            className={cn("text-xs px-2 py-0.5 rounded-md font-medium", color.bg)}
                          >
                            {ms}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
