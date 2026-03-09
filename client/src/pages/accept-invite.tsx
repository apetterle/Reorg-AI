import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export default function AcceptInvitePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken) {
      setToken(urlToken);
    }
  }, []);

  if (!user) {
    navigate("/auth");
    return null;
  }

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    setLoading(true);
    try {
      await apiRequest("POST", "/api/invites/accept", { token });
      toast({ title: t("invite.inviteAccepted") });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("invite.backToDashboard")}
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{t("invite.acceptInvite")}</CardTitle>
                <CardDescription>{t("invite.enterToken")}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAccept} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("invite.inviteToken")}</Label>
                <Input
                  data-testid="input-invite-token"
                  placeholder={t("invite.pasteToken")}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading} data-testid="button-accept-invite">
                {loading ? t("common.accepting") : t("invite.acceptInvite")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
