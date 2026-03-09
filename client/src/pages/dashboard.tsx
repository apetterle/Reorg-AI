import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Users, FolderOpen, ArrowRight } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AppHeader } from "@/components/AppHeader";
import type { Tenant } from "@shared/schema";
import { useTranslation } from "react-i18next";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTenantName, setNewTenantName] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: tenants, isLoading } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
  });

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName.trim()) return;
    setCreating(true);
    try {
      await apiRequest("POST", "/api/tenants", { name: newTenantName });
      await queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      setNewTenantName("");
      setCreateOpen(false);
      toast({ title: t("workspace.workspaceCreated") });
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("workspace.workspaces")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("workspace.selectOrCreate")}
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-workspace">
                <Plus className="w-4 h-4 mr-2" />
                {t("workspace.newWorkspace")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("workspace.createWorkspace")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTenant} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>{t("workspace.workspaceName")}</Label>
                  <Input
                    data-testid="input-workspace-name"
                    placeholder={t("company.placeholderName")}
                    value={newTenantName}
                    onChange={(e) => setNewTenantName(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={creating} data-testid="button-submit-workspace">
                  {creating ? t("common.creating") : t("workspace.createWorkspace")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-32 mb-3" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : tenants && tenants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants.map((tenant) => (
              <Link key={tenant.id} href={`/t/${tenant.slug}`}>
                <Card className="cursor-pointer hover-elevate transition-all" data-testid={`card-workspace-${tenant.slug}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{tenant.name}</h3>
                          <p className="text-xs text-muted-foreground">/{tenant.slug}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground mt-1" />
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
              <h3 className="font-semibold text-lg mb-1">{t("workspace.noWorkspacesYet")}</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {t("workspace.createFirstWorkspace")}
              </p>
              <Button onClick={() => setCreateOpen(true)} data-testid="button-create-first-workspace">
                <Plus className="w-4 h-4 mr-2" />
                {t("workspace.createWorkspace")}
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
