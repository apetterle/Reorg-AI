import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Lock, GitCompare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DiffViewer } from "@/components/DiffViewer";
import { useState } from "react";
import type { Artifact } from "@shared/schema";

interface VersionTimelineProps {
  artifactId: string;
  tenantSlug: string;
}

export function VersionTimeline({ artifactId, tenantSlug }: VersionTimelineProps) {
  const { t } = useTranslation();
  const [compareLeft, setCompareLeft] = useState<Artifact | null>(null);
  const [compareRight, setCompareRight] = useState<Artifact | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  const { data: versions, isLoading } = useQuery<Artifact[]>({
    queryKey: ["/api/artifacts", artifactId, "versions"],
    queryFn: async () => {
      const res = await fetch(`/api/artifacts/${artifactId}/versions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load versions");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4" data-testid="version-timeline">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="w-3 h-3 rounded-full mt-1" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const sorted = [...(versions || [])].sort((a, b) => b.version - a.version);

  const handleCompareSelect = (artifact: Artifact) => {
    if (!compareLeft) {
      setCompareLeft(artifact);
    } else if (!compareRight && artifact.id !== compareLeft.id) {
      setCompareRight(artifact);
      setShowDiff(true);
    } else {
      setCompareLeft(artifact);
      setCompareRight(null);
    }
  };

  return (
    <>
      <div className="relative pl-6 py-2" data-testid="version-timeline">
        <div className="absolute left-[11px] top-0 bottom-0 w-px bg-border" />
        {sorted.length > 1 && (
          <p className="text-xs text-muted-foreground mb-3 pl-2">
            {compareLeft && !compareRight
              ? t("artifacts.selectedVersion", { version: compareLeft.version })
              : t("artifacts.compareVersions")}
          </p>
        )}
        {sorted.map((v) => (
          <div
            key={v.version}
            className={`relative flex items-start gap-3 pb-5 last:pb-0 cursor-pointer rounded px-1 -mx-1 transition-colors ${
              compareLeft?.id === v.id ? "bg-primary/10" : "hover:bg-muted/50"
            }`}
            data-testid={`version-entry-${v.version}`}
            onClick={() => sorted.length > 1 && handleCompareSelect(v)}
          >
            <div
              className={`absolute left-[-17px] top-1 w-3 h-3 rounded-full border-2 ${
                v.locked
                  ? "bg-primary border-primary"
                  : "bg-background border-muted-foreground/40"
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">v{v.version}</span>
                {v.locked && (
                  <Lock className="w-3 h-3 text-muted-foreground" />
                )}
                {sorted.length > 1 && (
                  <GitCompare className="w-3 h-3 text-muted-foreground/50" />
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(v.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground pl-2">{t("artifacts.noVersionsFound")}</p>
        )}
      </div>

      <Dialog open={showDiff} onOpenChange={(o) => {
        if (!o) {
          setShowDiff(false);
          setCompareLeft(null);
          setCompareRight(null);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="diff-dialog-title">
              <GitCompare className="w-4 h-4" />
              {t("artifacts.compareVersions")}
            </DialogTitle>
          </DialogHeader>
          {compareLeft && compareRight && (
            <DiffViewer leftArtifact={compareLeft} rightArtifact={compareRight} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
