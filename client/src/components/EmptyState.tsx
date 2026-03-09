import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  "data-testid"?: string;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, "data-testid": testId }: EmptyStateProps) {
  return (
    <Card data-testid={testId || "empty-state"}>
      <CardContent className="p-12 text-center">
        <Icon className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
        <h3 className="font-semibold text-lg mb-1" data-testid="text-empty-title">{title}</h3>
        <p className="text-muted-foreground text-sm mb-4" data-testid="text-empty-description">{description}</p>
        {actionLabel && onAction && (
          <Button onClick={onAction} data-testid="button-empty-action">
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function PermissionDenied() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6" data-testid="permission-denied">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-6V4" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2" data-testid="text-permission-title">{t("errors.accessDenied")}</h2>
          <p className="text-sm text-muted-foreground" data-testid="text-permission-message">
            {t("errors.noPermission")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
