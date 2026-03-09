import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Globe } from "lucide-react";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useTranslation } from "react-i18next";
import { changeLanguage, supportedLanguages } from "@/i18n";

interface BreadcrumbEntry {
  label: string;
  href?: string;
}

interface AppHeaderProps {
  breadcrumbs?: BreadcrumbEntry[];
  backHref?: string;
  actions?: React.ReactNode;
  tenantSlug?: string;
}

export function AppHeader({ breadcrumbs, backHref, actions, tenantSlug }: AppHeaderProps) {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();

  return (
    <header
      className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50"
      data-testid="app-header"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-6 h-14">
        <div className="flex items-center gap-3">
          {backHref && (
            <Link href={backHref}>
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          )}
          <Link href="/dashboard">
            <div className="flex items-center gap-2 cursor-pointer" data-testid="link-home">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-bold">R</span>
              </div>
              <span className="font-semibold text-lg tracking-tight">ReOrg AI</span>
            </div>
          </Link>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <>
              <span className="text-muted-foreground text-sm">/</span>
              <Breadcrumb data-testid="app-breadcrumbs">
                <BreadcrumbList>
                  {breadcrumbs.map((crumb, idx) => {
                    const isLast = idx === breadcrumbs.length - 1;
                    return (
                      <BreadcrumbItem key={idx}>
                        {idx > 0 && <BreadcrumbSeparator />}
                        {isLast || !crumb.href ? (
                          <BreadcrumbPage data-testid={`breadcrumb-${idx}`}>{crumb.label}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild>
                            <Link href={crumb.href} data-testid={`breadcrumb-${idx}`}>
                              {crumb.label}
                            </Link>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    );
                  })}
                </BreadcrumbList>
              </Breadcrumb>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {tenantSlug && <GlobalSearch tenantSlug={tenantSlug} />}
          {actions}
          <div className="flex items-center gap-1" data-testid="language-switcher">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <Select value={i18n.language} onValueChange={(v) => changeLanguage(v)}>
              <SelectTrigger className="w-[100px] border-0 bg-transparent shadow-none focus:ring-0" data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {supportedLanguages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code} data-testid={`select-language-${lang.code}`}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-muted-foreground" data-testid="text-username">
            {user?.displayName || user?.username}
          </span>
          <Button variant="outline" size="sm" onClick={logout} data-testid="button-logout">
            {t("common.signOut")}
          </Button>
        </div>
      </div>
    </header>
  );
}
