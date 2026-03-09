import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, FileText, Loader2, Briefcase, Code, ShieldCheck, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReportGeneratorProps {
  tenantSlug: string;
  projectId: string;
  projectName: string;
  hasOutputs: boolean;
}

type ReportTemplate = "executive" | "technical" | "compliance";
type ExportFormat = "json" | "md" | "html";

export function ReportGenerator({ tenantSlug, projectId, projectName, hasOutputs }: ReportGeneratorProps) {
  const { t } = useTranslation();
  const [template, setTemplate] = useState<ReportTemplate>("executive");
  const [format, setFormat] = useState<ExportFormat>("html");
  const [exporting, setExporting] = useState(false);
  const [citations, setCitations] = useState(true);
  const [footnotes, setFootnotes] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const { toast } = useToast();

  const isCompliance = template === "compliance";

  const handleTemplateChange = (t: ReportTemplate) => {
    setTemplate(t);
    if (t === "compliance") {
      setCitations(true);
      setFootnotes(true);
    }
  };

  const handlePreview = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/projects/${projectId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "html", template, citations, footnotes }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(t("reports.previewFailed"));
      const html = await res.text();
      setPreviewHtml(html);
      setPreviewOpen(true);
    } catch (err: any) {
      toast({ title: t("reports.previewFailed"), description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/projects/${projectId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, template, citations, footnotes }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(t("reports.exportFailed"));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName}-${template}-report.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: t("reports.reportDownloaded") });
    } catch (err: any) {
      toast({ title: t("reports.exportFailed"), description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Card data-testid="report-generator">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {t("reports.reportGenerator")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleTemplateChange("executive")}
              className={`p-3 rounded-md border text-left transition-colors ${
                template === "executive"
                  ? "border-primary/30 bg-primary/5"
                  : "border-border"
              }`}
              data-testid="button-template-executive"
            >
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="w-4 h-4" />
                <span className="text-sm font-medium">{t("reports.executive")}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("reports.executiveDesc")}
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleTemplateChange("technical")}
              className={`p-3 rounded-md border text-left transition-colors ${
                template === "technical"
                  ? "border-primary/30 bg-primary/5"
                  : "border-border"
              }`}
              data-testid="button-template-technical"
            >
              <div className="flex items-center gap-2 mb-1">
                <Code className="w-4 h-4" />
                <span className="text-sm font-medium">{t("reports.technical")}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("reports.technicalDesc")}
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleTemplateChange("compliance")}
              className={`p-3 rounded-md border text-left transition-colors ${
                template === "compliance"
                  ? "border-primary/30 bg-primary/5"
                  : "border-border"
              }`}
              data-testid="select-compliance-report"
            >
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-sm font-medium">{t("reports.compliance")}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("reports.complianceDesc")}
              </p>
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch
                  id="toggle-citations"
                  checked={citations}
                  onCheckedChange={(v) => {
                    if (!isCompliance) setCitations(v);
                  }}
                  disabled={isCompliance}
                  data-testid="toggle-citations"
                />
                <Label htmlFor="toggle-citations" className="text-sm">
                  {t("reports.citationsAppendix")}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="toggle-footnotes"
                  checked={footnotes}
                  onCheckedChange={(v) => {
                    if (!isCompliance) setFootnotes(v);
                  }}
                  disabled={isCompliance}
                  data-testid="toggle-footnotes"
                />
                <Label htmlFor="toggle-footnotes" className="text-sm">
                  {t("reports.evidenceFootnotes")}
                </Label>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <SelectTrigger className="w-28" data-testid="select-export-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="html">HTML</SelectItem>
                <SelectItem value="md">Markdown</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={!hasOutputs || exporting}
              data-testid="button-preview-report"
            >
              <Eye className="w-4 h-4 mr-2" />
              {t("reports.preview")}
            </Button>

            <Button
              onClick={handleExport}
              disabled={!hasOutputs || exporting}
              data-testid="button-generate-report"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {exporting ? t("reports.generating") : t("reports.generateReport")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{t("reports.reportPreview")}</DialogTitle>
          </DialogHeader>
          <div
            className="prose dark:prose-invert max-w-none text-sm"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
            data-testid="report-preview-content"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
