import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import WorkspacePage from "@/pages/workspace";
import ProjectPage from "@/pages/project";
import CompanyHubPage from "@/pages/company-hub";
import AcceptInvitePage from "@/pages/accept-invite";
import LandingPage from "@/pages/landing";
import { Loader2 } from "lucide-react";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/dashboard">
        <AuthGuard>
          <Dashboard />
        </AuthGuard>
      </Route>
      <Route path="/invite">
        <AuthGuard>
          <AcceptInvitePage />
        </AuthGuard>
      </Route>
      <Route path="/t/:tenantSlug/c/:companyId/projects/:projectId">
        <AuthGuard>
          <ProjectPage />
        </AuthGuard>
      </Route>
      <Route path="/t/:tenantSlug/c/:companyId">
        <AuthGuard>
          <CompanyHubPage />
        </AuthGuard>
      </Route>
      <Route path="/t/:tenantSlug/projects/:projectId">
        <AuthGuard>
          <ProjectPage />
        </AuthGuard>
      </Route>
      <Route path="/t/:tenantSlug">
        <AuthGuard>
          <WorkspacePage />
        </AuthGuard>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
