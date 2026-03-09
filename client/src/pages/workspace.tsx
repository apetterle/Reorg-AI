import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLocation, Link, useParams } from "wouter";
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
  Building2, Plus, Users, Mail, ArrowRight, Copy, ClipboardCheck, MapPin, Users2, Settings
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AppHeader } from "@/components/AppHeader";
import { WorkspaceSideNav, type WorkspaceSection } from "@/components/WorkspaceSideNav";
import type { Company, Invite } from "@shared/schema";
import { useTranslation } from "react-i18next";

export default function WorkspacePage() {
  const { t } = useTranslation();
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params.tenantSlug;
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const sizeBandLabels: Record<string, string> = {
    startup: t("company.startup"),
    smb: t("company.smb"),
    "mid-market": t("company.midMarket"),
    enterprise: t("company.enterprise"),
  };

  const [activeSection, setActiveSection] = useState<WorkspaceSection>("companies");
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: "", industry: "", region: "", sizeBand: "", notes: "" });
  const [newInvite, setNewInvite] = useState({ email: "", role: "analyst" });
  const [creating, setCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const { data: companiesList, isLoading: loadingCompanies } = useQuery<Company[]>({
    queryKey: ["/api/t", tenantSlug, "companies"],
    queryFn: async () => {
      const res = await fetch(`/api/t/${tenantSlug}/companies`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch companies");
      return res.json();
    },
  });

  const { data: invitesList } = useQuery<Invite[]>({
    queryKey: ["/api/t", tenantSlug, "invites"],
    queryFn: async () => {
      const res = await fetch(`/api/t/${tenantSlug}/invites`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch invites");
      return res.json();
    },
  });

  const { data: members } = useQuery<any[]>({
    queryKey: ["/api/t", tenantSlug, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/t/${tenantSlug}/members`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload: any = { name: newCompany.name };
      if (newCompany.industry) payload.industry = newCompany.industry;
      if (newCompany.region) payload.region = newCompany.region;
      if (newCompany.sizeBand) payload.sizeBand = newCompany.sizeBand;
      if (newCompany.notes) payload.notes = newCompany.notes;
      const res = await apiRequest("POST", `/api/t/${tenantSlug}/companies`, payload);
      const company = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "companies"] });
      setNewCompany({ name: "", industry: "", region: "", sizeBand: "", notes: "" });
      setCompanyDialogOpen(false);
      toast({ title: t("workspace.companyCreated") });
      navigate(`/t/${tenantSlug}/c/${company.id}`);
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await apiRequest("POST", `/api/t/${tenantSlug}/invites`, newInvite);
      const invite = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "invites"] });
      setNewInvite({ email: "", role: "analyst" });
      toast({ title: t("workspace.inviteCreated"), description: `Token: ${invite.token.substring(0, 12)}...` });
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const memberCount = members?.length || 0;

  const renderCompaniesSection = () => (
    <>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-workspace-title">{t("workspace.clientCompanies")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("workspace.manageCompanies")}
          </p>
        </div>
        <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-company">
              <Plus className="w-4 h-4 mr-2" />
              {t("workspace.newCompany")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("workspace.addClientCompany")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateCompany} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>{t("company.companyName")}</Label>
                <Input
                  data-testid="input-company-name"
                  placeholder={t("company.placeholderName")}
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("company.industry")}</Label>
                  <Input
                    data-testid="input-company-industry"
                    placeholder={t("company.placeholderIndustry")}
                    value={newCompany.industry}
                    onChange={(e) => setNewCompany({ ...newCompany, industry: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("company.region")}</Label>
                  <Input
                    data-testid="input-company-region"
                    placeholder={t("company.placeholderRegion")}
                    value={newCompany.region}
                    onChange={(e) => setNewCompany({ ...newCompany, region: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("company.sizeBand")}</Label>
                <Select value={newCompany.sizeBand} onValueChange={(v) => setNewCompany({ ...newCompany, sizeBand: v })}>
                  <SelectTrigger data-testid="select-company-size-band">
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
              <div className="space-y-2">
                <Label>{t("company.notes")}</Label>
                <Textarea
                  data-testid="input-company-notes"
                  placeholder={t("company.additionalNotes")}
                  value={newCompany.notes}
                  onChange={(e) => setNewCompany({ ...newCompany, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <Button type="submit" className="w-full" disabled={creating} data-testid="button-submit-company">
                {creating ? t("common.creating") : t("workspace.addCompany")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loadingCompanies ? (
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
      ) : companiesList && companiesList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {companiesList.map((company) => (
            <Link key={company.id} href={`/t/${tenantSlug}/c/${company.id}`}>
              <Card className="cursor-pointer hover-elevate transition-all" data-testid={`card-company-${company.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate" data-testid={`text-company-name-${company.id}`}>{company.name}</h3>
                        {company.industry && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{company.industry}</p>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    {company.region && (
                      <Badge variant="secondary" className="text-xs">
                        <MapPin className="w-3 h-3 mr-1" />
                        {company.region}
                      </Badge>
                    )}
                    {company.sizeBand && (
                      <Badge variant="outline" className="text-xs">
                        <Users2 className="w-3 h-3 mr-1" />
                        {sizeBandLabels[company.sizeBand] || company.sizeBand}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1" data-testid="text-no-companies">{t("workspace.noCompaniesYet")}</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {t("workspace.addFirstCompany")}
            </p>
            <Button onClick={() => setCompanyDialogOpen(true)} data-testid="button-create-first-company">
              <Plus className="w-4 h-4 mr-2" />
              {t("workspace.addCompany")}
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );

  const renderTeamSection = () => (
    <>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-team-title">{t("workspace.teamMembers")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("workspace.membersInWorkspace", { count: memberCount })}
          </p>
        </div>
      </div>
      {members && members.length > 0 ? (
        <div className="space-y-2">
          {members.map((m: any) => (
            <Card key={m.id} data-testid={`card-member-${m.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                    {(m.user.displayName || m.user.username).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" data-testid={`text-member-name-${m.id}`}>
                      {m.user.displayName || m.user.username}
                    </p>
                    {m.user.email && (
                      <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs" data-testid={`badge-member-role-${m.id}`}>{m.role}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">{t("workspace.noTeamYet")}</h3>
            <p className="text-muted-foreground text-sm">
              {t("workspace.inviteToCollaborate")}
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );

  const renderInvitesSection = () => (
    <>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-invites-title">{t("nav.invites")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("workspace.managePendingInvites")}
          </p>
        </div>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" data-testid="button-invite-member">
              <Users className="w-4 h-4 mr-2" />
              {t("workspace.invite")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("workspace.inviteTeamMember")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateInvite} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>{t("common.email")}</Label>
                <Input
                  data-testid="input-invite-email"
                  type="email"
                  placeholder={t("workspace.emailPlaceholder")}
                  value={newInvite.email}
                  onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("common.role")}</Label>
                <Select value={newInvite.role} onValueChange={(v) => setNewInvite({ ...newInvite, role: v })}>
                  <SelectTrigger data-testid="select-invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="analyst">Analyst</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={creating} data-testid="button-send-invite">
                {creating ? t("common.sending") : t("workspace.sendInvite")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {invitesList && invitesList.length > 0 ? (
        <div className="space-y-2">
          {invitesList.map((inv) => (
            <Card key={inv.id} data-testid={`card-invite-${inv.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate" data-testid={`text-invite-email-${inv.id}`}>{inv.email}</p>
                      <p className="text-xs text-muted-foreground">{t("common.role")}: {inv.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={inv.acceptedAt ? "default" : "secondary"} className="text-xs" data-testid={`badge-invite-status-${inv.id}`}>
                      {inv.acceptedAt ? t("common.accepted") : t("common.pending")}
                    </Badge>
                    {!inv.acceptedAt && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToken(inv.token)}
                        data-testid={`button-copy-token-${inv.id}`}
                      >
                        {copiedToken === inv.token ? (
                          <ClipboardCheck className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Mail className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">{t("workspace.noInvitesYet")}</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {t("workspace.sendInvitations")}
            </p>
            <Button variant="outline" onClick={() => setInviteDialogOpen(true)} data-testid="button-send-first-invite">
              <Users className="w-4 h-4 mr-2" />
              {t("workspace.inviteMember")}
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );

  const renderSettingsSection = () => (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-settings-title">{t("workspace.workspaceSettings")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("workspace.configurePreferences")}
        </p>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              {t("workspace.settingsComingSoon")}
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "companies":
        return renderCompaniesSection();
      case "team":
        return renderTeamSection();
      case "invites":
        return renderInvitesSection();
      case "settings":
        return renderSettingsSection();
      default:
        return renderCompaniesSection();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        backHref="/dashboard"
        breadcrumbs={[{ label: tenantSlug || "" }]}
        tenantSlug={tenantSlug}
      />

      <div className="flex min-h-[calc(100vh-56px)]">
        <WorkspaceSideNav
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          companyCount={companiesList?.length}
          memberCount={members?.length}
          inviteCount={invitesList?.filter((i) => !i.acceptedAt).length}
        />

        <main className="flex-1 p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
