import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shield, BarChart3, FileSearch, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function AuthPage() {
  const { login, register, user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({
    email: "",
    username: "",
    password: "",
    displayName: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  if (user) {
    navigate("/dashboard");
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(loginData.username, loginData.password);
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: t("auth.loginFailed"), description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await register(registerData);
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: t("auth.registrationFailed"), description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">ReOrg AI</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("auth.tagline")}
            </p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login" data-testid="tab-login">{t("auth.login")}</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">{t("auth.register")}</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">{t("auth.welcomeBack")}</CardTitle>
                  <CardDescription>{t("auth.signInDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-username">{t("auth.username")}</Label>
                      <Input
                        id="login-username"
                        data-testid="input-login-username"
                        placeholder={t("auth.enterUsername")}
                        value={loginData.username}
                        onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">{t("auth.password")}</Label>
                      <Input
                        id="login-password"
                        data-testid="input-login-password"
                        type="password"
                        placeholder={t("auth.enterPassword")}
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-login">
                      {isLoading ? t("auth.signingIn") : t("auth.login")}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">{t("auth.getStarted")}</CardTitle>
                  <CardDescription>{t("auth.createAccountDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-display">{t("auth.displayName")}</Label>
                      <Input
                        id="reg-display"
                        data-testid="input-register-displayname"
                        placeholder={t("auth.yourName")}
                        value={registerData.displayName}
                        onChange={(e) => setRegisterData({ ...registerData, displayName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-email">{t("common.email")}</Label>
                      <Input
                        id="reg-email"
                        data-testid="input-register-email"
                        type="email"
                        placeholder={t("auth.emailPlaceholder")}
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-username">{t("auth.username")}</Label>
                      <Input
                        id="reg-username"
                        data-testid="input-register-username"
                        placeholder={t("auth.chooseUsername")}
                        value={registerData.username}
                        onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">{t("auth.password")}</Label>
                      <Input
                        id="reg-password"
                        data-testid="input-register-password"
                        type="password"
                        placeholder={t("auth.minChars")}
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-register">
                      {isLoading ? t("auth.creatingAccount") : t("auth.register")}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-primary/5 items-center justify-center p-12">
        <div className="max-w-lg space-y-8">
          <h2 className="text-3xl font-bold tracking-tight">
            {t("auth.heroTitle")}
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {t("auth.heroDesc")}
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: FileSearch, title: t("auth.featureExtraction"), desc: t("auth.featureExtractionDesc") },
              { icon: Shield, title: t("auth.featurePII"), desc: t("auth.featurePIIDesc") },
              { icon: BarChart3, title: t("auth.featureValueScope"), desc: t("auth.featureValueScopeDesc") },
              { icon: Zap, title: t("auth.featureHITL"), desc: t("auth.featureHITLDesc") },
            ].map((feature) => (
              <div key={feature.title} className="space-y-2 p-4 rounded-md bg-background/60">
                <feature.icon className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-sm">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
