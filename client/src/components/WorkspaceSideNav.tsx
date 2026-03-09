import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Building2, Users, Mail, Settings, LayoutDashboard, FolderOpen,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export type WorkspaceSection =
  | "companies"
  | "team"
  | "invites"
  | "settings";

export type CompanySection =
  | "overview"
  | "projects"
  | "settings";

interface NavItem<T extends string> {
  id: T;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string | number;
}

interface WorkspaceSideNavProps {
  activeSection: WorkspaceSection;
  onSectionChange: (section: WorkspaceSection) => void;
  companyCount?: number;
  memberCount?: number;
  inviteCount?: number;
}

export function WorkspaceSideNav({
  activeSection,
  onSectionChange,
  companyCount,
  memberCount,
  inviteCount,
}: WorkspaceSideNavProps) {
  const { t } = useTranslation();

  const items: NavItem<WorkspaceSection>[] = [
    { id: "companies", label: t("nav.companies"), icon: Building2, badge: companyCount },
    { id: "team", label: t("nav.team"), icon: Users, badge: memberCount },
    { id: "invites", label: t("nav.invites"), icon: Mail, badge: inviteCount },
    { id: "settings", label: t("nav.settings"), icon: Settings },
  ];

  return (
    <nav
      className="w-[220px] flex-shrink-0 border-r bg-background"
      data-testid="workspace-side-nav"
    >
      <div className="sticky top-[56px] py-4 px-3 space-y-1">
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

interface CompanySideNavProps {
  activeSection: CompanySection;
  onSectionChange: (section: CompanySection) => void;
  projectCount?: number;
}

export function CompanySideNav({
  activeSection,
  onSectionChange,
  projectCount,
}: CompanySideNavProps) {
  const { t } = useTranslation();

  const items: NavItem<CompanySection>[] = [
    { id: "overview", label: t("nav.overview"), icon: LayoutDashboard },
    { id: "projects", label: t("nav.projects"), icon: FolderOpen, badge: projectCount },
    { id: "settings", label: t("nav.settings"), icon: Settings },
  ];

  return (
    <nav
      className="w-[220px] flex-shrink-0 border-r bg-background"
      data-testid="company-side-nav"
    >
      <div className="sticky top-[56px] py-4 px-3 space-y-1">
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
