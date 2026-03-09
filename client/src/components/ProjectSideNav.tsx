import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Upload, FolderOpen, Layers, FileOutput,
  Activity, Shield, Settings,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export type ProjectSection =
  | "overview"
  | "data-intake"
  | "data-room"
  | "phases"
  | "outputs"
  | "runs-logs"
  | "audit"
  | "settings";

interface NavItem {
  id: ProjectSection;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string | number;
}

interface ProjectSideNavProps {
  activeSection: ProjectSection;
  onSectionChange: (section: ProjectSection) => void;
  docCount?: number;
  factCount?: number;
  outputCount?: number;
  jobCount?: number;
}

export function ProjectSideNav({
  activeSection,
  onSectionChange,
  docCount,
  factCount,
  outputCount,
  jobCount,
}: ProjectSideNavProps) {
  const { t } = useTranslation();
  const items: NavItem[] = [
    { id: "overview", label: t("nav.overview"), icon: LayoutDashboard },
    { id: "data-intake", label: t("nav.dataIntake"), icon: Upload },
    { id: "data-room", label: t("nav.dataRoom"), icon: FolderOpen, badge: docCount },
    { id: "phases", label: t("nav.phases"), icon: Layers },
    { id: "outputs", label: t("nav.outputs"), icon: FileOutput, badge: outputCount },
    { id: "runs-logs", label: t("nav.runsLogs"), icon: Activity, badge: jobCount },
    { id: "audit", label: t("nav.audit"), icon: Shield },
    { id: "settings", label: t("nav.settings"), icon: Settings },
  ];

  return (
    <nav
      className="w-[220px] flex-shrink-0 border-r bg-background"
      data-testid="project-side-nav"
    >
      <div className="sticky top-[112px] py-4 px-3 space-y-1">
        {items.map((item) => {
          const isActive = activeSection === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors text-left",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover-elevate text-muted-foreground",
              )}
              data-testid={`nav-${item.id}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate flex-1">{item.label}</span>
              {item.badge !== undefined && Number(item.badge) > 0 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] ml-auto no-default-hover-elevate no-default-active-elevate"
                  data-testid={`badge-nav-${item.id}`}
                >
                  {item.badge}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

const sectionKeys: Record<ProjectSection, string> = {
  overview: "nav.overview",
  "data-intake": "nav.dataIntake",
  "data-room": "nav.dataRoom",
  phases: "nav.phases",
  outputs: "nav.outputs",
  "runs-logs": "nav.runsLogs",
  audit: "nav.audit",
  settings: "nav.settings",
};

export function getSectionLabel(section: ProjectSection): string {
  return sectionKeys[section];
}
