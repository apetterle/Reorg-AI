import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLocation, Link, useParams } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  FolderOpen, Plus, ArrowRight, Globe, Building2, MapPin, Users2, Pencil, X, Check, StickyNote, Loader2, Settings
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AppHeader } from "@/components/AppHeader";
import { CompanySideNav, type CompanySection } from "@/components/WorkspaceSideNav";
import type { Company, Project } from "@shared/schema";

export default function CompanyHubPage() {
  const { t } = useTranslation();
  const params = useParams<{ tenantSlug: string; companyId: string }>();
  const { tenantSlug, companyId } = params;
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const sizeBandLabels: Record<string, string> = {
    startup: t("company.startup"),
    smb: t("company.smb"),
    "mid-market": t("company.midMarket"),
    enterprise: t("company.enterprise"),
  };

  const langLabels: Record<string, string> = {
    en: t("project.english"),
    "pt-BR": t("project.portugueseBR"),
    es: t("project.spanish"),
  };

  const [activeSection, setActiveSection] = useState<CompanySection>("overview");
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", description: "", outputLanguage: "en" });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", industry: "", region: "", sizeBand: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const { data: company, isLoading: loadingCompany } = useQuery<Company>({
    queryKey: ["/api/t", tenantSlug, "companies", companyId],
    queryFn: async () => {
      const res = await fetch(`/api/t/${tenantSlug}/companies/${companyId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const { data: projects, isLoading: loadingProjects } = useQuery<Project[]>({
    queryKey: ["/api/t", tenantSlug, "companies", companyId, "projects"],
    queryFn: async () => {
      const res = await fetch(`/api/t/${tenantSlug}/companies/${companyId}/projects`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
  });

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await apiRequest("POST", `/api/t/${tenantSlug}/companies/${companyId}/projects`, newProject);
      const project = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "companies", companyId, "projects"] });
      setNewProject({ name: "", description: "", outputLanguage: "en" });
      setProjectDialogOpen(false);
      toast({ title: t("project.projectCreated") });
      navigate(`/t/${tenantSlug}/c/${companyId}/projects/${project.id}`);
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const startEditing = () => {
    if (!company) return;
    setEditForm({
      name: company.name,
      industry: company.industry || "",
      region: company.region || "",
      sizeBand: company.sizeBand || "",
      notes: company.notes || "",
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string | undefined> = {};
      if (editForm.name) payload.name = editForm.name;
      payload.industry = editForm.industry || undefined;
      payload.region = editForm.region || undefined;
      payload.sizeBand = editForm.sizeBand || undefined;
      payload.notes = editForm.notes || undefined;

      await apiRequest("PATCH", `/api/t/${tenantSlug}/companies/${companyId}`, payload);
      await queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "companies", companyId] });
      await queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "companies"] });
      setEditing(false);
      toast({ title: t("company.companyUpdated") });
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loadingCompany) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader
          backHref={`/t/${tenantSlug}`}
          tenantSlug={tenantSlug}
          breadcrumbs={[
            { label: tenantSlug || "", href: `/t/${tenantSlug}` },
            { label: t("common.loading") },
          ]}
        />
        <div className="flex min-h-[calc(100vh-56px)]">
          <CompanySideNav activeSection="overview" onSectionChange={() => {}} />
          <main className="flex-1 p-6">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-4 w-96 mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-32 mb-3" />
                    <Skeleton className="h-4 w-48" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">{t("company.notFound")}</h2>
          <Link href={`/t/${tenantSlug}`}>
            <Button variant="outline" data-testid="button-back-workspace">{t("company.backToWorkspace")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const renderOverviewSection = () => (
    <>
      <Card className="mb-8" data-testid="card-company-details">
        <CardContent className="p-6">
          {editing ? (
            <div className="space-y-4" data-testid="form-edit-company">
              <div className="flex items-center justify-between gap-4 mb-2">
                <h2 className="text-lg font-semibold">{t("company.editCompany")}</h2>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={cancelEditing} data-testid="button-cancel-edit">
                    <X className="w-4 h-4" />
                  </Button>
                  <Button size="icon" onClick={handleSaveEdit} disabled={saving} data-testid="button-save-edit">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("company.companyName")}</Label>
                  <Input
                    data-testid="input-edit-company-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("company.industry")}</Label>
                  <Input
                    data-testid="input-edit-industry"
                    placeholder={t("company.placeholderIndustry")}
                    value={editForm.industry}
                    onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("company.region")}</Label>
                  <Input
                    data-testid="input-edit-region"
                    placeholder={t("company.placeholderRegion")}
                    value={editForm.region}
                    onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("company.sizeBand")}</Label>
                  <Select value={editForm.sizeBand} onValueChange={(v) => setEditForm({ ...editForm, sizeBand: v })}>
                    <SelectTrigger data-testid="select-edit-size-band">
                      <SelectValue placeholder={t("company.selectSize")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="startup">{t("company.startup")}</SelectItem>
                      <SelectItem value="smb">{t("company.smb")}</SelectItem>
                      <SelectItem value="mid-market">{t("company.midMarket")}</SelectItem>
                      <SelectItem value="enterprise">{t("company.enterprise")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("company.notes")}</Label>
                <Textarea
                  data-testid="input-edit-notes"
                  placeholder={t("company.additionalNotesShort")}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="resize-none"
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight" data-testid="text-company-name">{company.name}</h1>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {company.industry && (
                        <Badge variant="secondary" className="text-xs" data-testid="badge-industry">
                          {company.industry}
                        </Badge>
                      )}
                      {company.region && (
                        <Badge variant="outline" className="text-xs" data-testid="badge-region">
                          <MapPin className="w-3 h-3 mr-1" />
                          {company.region}
                        </Badge>
                      )}
                      {company.sizeBand && (
                        <Badge variant="outline" className="text-xs" data-testid="badge-size-band">
                          <Users2 className="w-3 h-3 mr-1" />
                          {sizeBandLabels[company.sizeBand] || company.sizeBand}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={startEditing} data-testid="button-edit-company">
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
              {company.notes && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground mt-2" data-testid="text-company-notes">
                  <StickyNote className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>{company.notes}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-1">{t("company.quickStats")}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t("company.projectsInCompany", { count: projects?.length || 0 })}
        </p>
        {projects && projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.slice(0, 4).map((project) => (
              <Link key={project.id} href={`/t/${tenantSlug}/c/${companyId}/projects/${project.id}`}>
                <Card className="cursor-pointer hover-elevate transition-all" data-testid={`card-project-${project.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <FolderOpen className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="font-medium truncate" data-testid={`text-project-name-${project.id}`}>{project.name}</span>
                      <Badge variant="outline" className="text-xs ml-auto" data-testid={`badge-status-${project.id}`}>{project.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );

  const renderProjectsSection = () => (
    <>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold">{t("nav.projects")}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("company.projectsInCompany", { count: projects?.length || 0 })}
          </p>
        </div>
        <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-project">
              <Plus className="w-4 h-4 mr-2" />
              {t("project.newProject")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("project.createProject")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateProject} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>{t("project.projectName")}</Label>
                <Input
                  data-testid="input-project-name"
                  placeholder={t("project.placeholderName")}
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("project.description")}</Label>
                <Input
                  data-testid="input-project-description"
                  placeholder={t("project.placeholderDesc")}
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("project.outputLanguage")}</Label>
                <Select
                  value={newProject.outputLanguage}
                  onValueChange={(v) => setNewProject({ ...newProject, outputLanguage: v })}
                >
                  <SelectTrigger data-testid="select-project-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">{t("project.english")}</SelectItem>
                    <SelectItem value="pt-BR">{t("project.portugueseBR")}</SelectItem>
                    <SelectItem value="es">{t("project.spanish")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={creating} data-testid="button-submit-project">
                {creating ? t("common.creating") : t("project.createProject")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loadingProjects ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-32 mb-3" />
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project) => (
            <Link key={project.id} href={`/t/${tenantSlug}/c/${companyId}/projects/${project.id}`}>
              <Card className="cursor-pointer hover-elevate transition-all" data-testid={`card-project-${project.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                        <FolderOpen className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate" data-testid={`text-project-name-${project.id}`}>{project.name}</h3>
                        {project.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{project.description}</p>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <Badge variant="secondary" className="text-xs">
                      <Globe className="w-3 h-3 mr-1" />
                      {langLabels[project.outputLanguage] || project.outputLanguage}
                    </Badge>
                    <Badge variant="outline" className="text-xs" data-testid={`badge-status-${project.id}`}>{project.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderOpen className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">{t("company.noProjectsYet")}</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {t("company.createFirstProject", { name: company.name })}
            </p>
            <Button onClick={() => setProjectDialogOpen(true)} data-testid="button-create-first-project">
              <Plus className="w-4 h-4 mr-2" />
              {t("project.createProject")}
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );

  const renderSettingsSection = () => (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-company-settings-title">{t("company.companySettings")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("company.configureSettings", { name: company.name })}
        </p>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              {t("company.settingsComingSoon")}
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return renderOverviewSection();
      case "projects":
        return renderProjectsSection();
      case "settings":
        return renderSettingsSection();
      default:
        return renderOverviewSection();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        backHref={`/t/${tenantSlug}`}
        tenantSlug={tenantSlug}
        breadcrumbs={[
          { label: tenantSlug || "", href: `/t/${tenantSlug}` },
          { label: company.name },
        ]}
      />

      <div className="flex min-h-[calc(100vh-56px)]">
        <CompanySideNav
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          projectCount={projects?.length}
        />

        <main className="flex-1 p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
