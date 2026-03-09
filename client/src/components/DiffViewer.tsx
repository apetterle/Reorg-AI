import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Artifact } from "@shared/schema";

interface DiffViewerProps {
  leftArtifact: Artifact;
  rightArtifact: Artifact;
}

function toLines(obj: unknown): string[] {
  try {
    return JSON.stringify(obj, null, 2).split("\n");
  } catch {
    return [String(obj)];
  }
}

interface DiffLine {
  type: "same" | "added" | "removed";
  content: string;
  side: "left" | "right" | "both";
}

function computeDiff(leftLines: string[], rightLines: string[]): DiffLine[] {
  const result: DiffLine[] = [];
  const maxLen = Math.max(leftLines.length, rightLines.length);

  for (let i = 0; i < maxLen; i++) {
    const left = i < leftLines.length ? leftLines[i] : undefined;
    const right = i < rightLines.length ? rightLines[i] : undefined;

    if (left === right) {
      result.push({ type: "same", content: left!, side: "both" });
    } else {
      if (left !== undefined) {
        result.push({ type: "removed", content: left, side: "left" });
      }
      if (right !== undefined) {
        result.push({ type: "added", content: right, side: "right" });
      }
    }
  }

  return result;
}

export function DiffViewer({ leftArtifact, rightArtifact }: DiffViewerProps) {
  const { t } = useTranslation();
  const diffLines = useMemo(() => {
    const leftLines = toLines(leftArtifact.dataJson);
    const rightLines = toLines(rightArtifact.dataJson);
    return computeDiff(leftLines, rightLines);
  }, [leftArtifact.dataJson, rightArtifact.dataJson]);

  return (
    <div data-testid="diff-viewer" className="overflow-auto">
      <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
        <span>v{leftArtifact.version} ({t("artifacts.old")})</span>
        <span>{t("artifacts.vs")}</span>
        <span>v{rightArtifact.version} ({t("artifacts.new")})</span>
      </div>
      <div className="font-mono text-xs border rounded-md overflow-hidden">
        {diffLines.map((line, idx) => (
          <div
            key={idx}
            className={`px-3 py-0.5 whitespace-pre ${
              line.type === "removed"
                ? "bg-red-500/10 text-red-700 dark:text-red-400"
                : line.type === "added"
                  ? "bg-green-500/10 text-green-700 dark:text-green-400"
                  : ""
            }`}
          >
            <span className="select-none mr-2 text-muted-foreground/50">
              {line.type === "removed" ? "-" : line.type === "added" ? "+" : " "}
            </span>
            {line.content}
          </div>
        ))}
      </div>
    </div>
  );
}
