import { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Upload, Eye, GitBranch, CheckSquare, FileCheck,
  ChevronLeft, ChevronRight, Loader2, AlertTriangle,
  Shield, Check, X, FileText, SkipForward, Tag,
  ShieldOff, EyeOff, BarChart3, Calendar,
} from "lucide-react";
import { FileUploadZone } from "@/components/FileUploadZone";
import { SchemaMappingTable, type ColumnMapping } from "@/components/SchemaMappingTable";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { Document as Doc } from "@shared/schema";
import { useTranslation } from "react-i18next";

interface DataUploadWizardProps {
  tenantSlug: string;
  projectId: string;
  existingDocs?: Doc[];
  onClose: () => void;
}

type WizardStep = 0 | 1 | 2 | 3 | 4;

const STEP_LABEL_KEYS = ["wizard.upload", "wizard.preview", "wizard.mapping", "wizard.validate", "wizard.stepConfirm"];
const STEP_ICONS = [Upload, Eye, GitBranch, CheckSquare, FileCheck];

const DOCUMENT_TAGS = ["finance", "tickets", "kpis", "process", "org", "policy", "contracts"] as const;
type DocumentTag = typeof DOCUMENT_TAGS[number];

interface PreviewData {
  documentId: string;
  filename: string;
  kind: string;
  previewText?: string;
  previewTables?: Array<{ name?: string; headers: string[]; rows: any[][] }>;
  warnings?: string[];
  pii: { hasPii: boolean; risk?: string; headerPii?: any; textPii?: any };
}

interface ValidationResult {
  level: "error" | "warning";
  message: string;
  suggestion?: string;
}

export function DataUploadWizard({ tenantSlug, projectId, existingDocs, onClose }: DataUploadWizardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [step, setStep] = useState<WizardStep>(0);
  const [uploadedDocIds, setUploadedDocIds] = useState<string[]>([]);
  const [docs, setDocs] = useState<Doc[]>(existingDocs || []);
  const [previews, setPreviews] = useState<Record<string, PreviewData>>({});
  const [previewLoading, setPreviewLoading] = useState(false);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [sanitizingDoc, setSanitizingDoc] = useState<string | null>(null);

  const [selectedTags, setSelectedTags] = useState<DocumentTag[]>([]);
  const [sanitizePiiOnUpload, setSanitizePiiOnUpload] = useState(true);
  const [excludedFromExtraction, setExcludedFromExtraction] = useState<Set<string>>(new Set());
  const [markedNonSensitive, setMarkedNonSensitive] = useState<Set<string>>(new Set());

  const basePath = `/api/t/${tenantSlug}/projects/${projectId}`;

  const wizardDocs = docs.filter((d) => uploadedDocIds.includes(d.id));
  const blockedDocs = wizardDocs.filter((d) => d.status === "blocked" || d.containsPii);
  const hasPiiBlocked = blockedDocs.filter((d) => !markedNonSensitive.has(d.id)).length > 0;

  const alreadyLoadedDocs = useMemo(() => {
    if (!existingDocs) return [];
    return existingDocs.filter((d) => uploadedDocIds.some((uid) => {
      const uploadedDoc = docs.find((doc) => doc.id === uid);
      return uploadedDoc && existingDocs.some((ed) => ed.filename === uploadedDoc.filename && ed.id !== uid);
    }));
  }, [existingDocs, uploadedDocIds, docs]);

  const allHeaders = Object.values(previews).flatMap(
    (p) => p.previewTables?.flatMap((t) => t.headers) || []
  );
  const uniqueHeaders = Array.from(new Set(allHeaders));

  const firstSampleRow = (() => {
    for (const p of Object.values(previews)) {
      if (p.previewTables && p.previewTables.length > 0) {
        const table = p.previewTables[0];
        if (table.rows.length > 0) {
          const row: Record<string, any> = {};
          table.headers.forEach((h, i) => {
            row[h] = table.rows[0][i];
          });
          return row;
        }
      }
    }
    return undefined;
  })();

  const toggleTag = useCallback((tag: DocumentTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const toggleExcludeFromExtraction = useCallback((docId: string) => {
    setExcludedFromExtraction((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  }, []);

  const toggleMarkNonSensitive = useCallback((docId: string) => {
    setMarkedNonSensitive((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  }, []);

  const handleFilesUploaded = useCallback(
    async (files: { file: File; documentId: string }[]) => {
      const newIds = files.map((f) => f.documentId);
      setUploadedDocIds((prev) => [...prev, ...newIds]);

      try {
        const res = await fetch(`${basePath}/documents`, { credentials: "include" });
        if (res.ok) {
          const allDocs: Doc[] = await res.json();
          setDocs(allDocs);
        }
      } catch {}

      await queryClient.invalidateQueries({
        queryKey: ["/api/t", tenantSlug, "projects", projectId, "documents"],
      });
    },
    [basePath, tenantSlug, projectId]
  );

  const loadPreviews = useCallback(async () => {
    if (uploadedDocIds.length === 0) return;
    setPreviewLoading(true);
    const results: Record<string, PreviewData> = {};

    for (const docId of uploadedDocIds) {
      try {
        const res = await fetch(`/api/documents/${docId}/preview`, { credentials: "include" });
        if (res.ok) {
          results[docId] = await res.json();
        }
      } catch {}
    }

    setPreviews(results);
    setPreviewLoading(false);
  }, [uploadedDocIds]);

  useEffect(() => {
    if (step === 1 && uploadedDocIds.length > 0 && Object.keys(previews).length === 0) {
      loadPreviews();
    }
  }, [step, uploadedDocIds, previews, loadPreviews]);

  const handleSanitize = useCallback(
    async (docId: string) => {
      setSanitizingDoc(docId);
      try {
        const res = await fetch(`/api/documents/${docId}/sanitize`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) throw new Error("Sanitization failed");

        const updatedDoc: Doc = await res.json();
        setDocs((prev) => prev.map((d) => (d.id === docId ? updatedDoc : d)));
        await queryClient.invalidateQueries({
          queryKey: ["/api/t", tenantSlug, "projects", projectId, "documents"],
        });
        toast({ title: t("wizard.documentSanitized") });

        const previewRes = await fetch(`/api/documents/${docId}/preview`, { credentials: "include" });
        if (previewRes.ok) {
          const previewData = await previewRes.json();
          setPreviews((prev) => ({ ...prev, [docId]: previewData }));
        }
      } catch (err: any) {
        toast({ title: t("wizard.sanitizationFailed"), description: err.message, variant: "destructive" });
      } finally {
        setSanitizingDoc(null);
      }
    },
    [tenantSlug, projectId, toast]
  );

  const runValidation = useCallback(() => {
    const results: ValidationResult[] = [];
    const includedMappings = mappings.filter((m) => m.included);

    if (includedMappings.length === 0) {
      results.push({
        level: "error",
        message: t("wizard.validation.noColumnsIncluded"),
        suggestion: t("wizard.validation.includeAtLeastOne"),
      });
    }

    const fieldCounts: Record<string, number> = {};
    for (const m of includedMappings) {
      fieldCounts[m.targetField] = (fieldCounts[m.targetField] || 0) + 1;
    }
    for (const [field, count] of Object.entries(fieldCounts)) {
      if (count > 1) {
        results.push({
          level: "error",
          message: t("wizard.validation.duplicateTarget", { field, count }),
          suggestion: t("wizard.validation.renameSuggestion"),
        });
      }
    }

    const numericFields = includedMappings.filter(
      (m) => m.fieldType === "number" || m.fieldType === "currency" || m.fieldType === "percentage"
    );
    if (numericFields.length === 0) {
      results.push({
        level: "warning",
        message: t("wizard.validation.noNumericFields"),
        suggestion: t("wizard.validation.numericSuggestion"),
      });
    }

    const dateFields = includedMappings.filter((m) => m.fieldType === "date");
    if (dateFields.length === 0) {
      results.push({
        level: "warning",
        message: t("wizard.validation.noDateFields"),
        suggestion: t("wizard.validation.dateSuggestion"),
      });
    }

    let totalExpectedRows = 0;
    let totalActualRows = 0;

    for (const p of Object.values(previews)) {
      if (p.previewTables) {
        for (const table of p.previewTables) {
          totalActualRows += table.rows.length;
          totalExpectedRows += table.rows.length;

          if (table.rows.length === 0) {
            results.push({
              level: "warning",
              message: t("wizard.validation.noDataRows", { filename: p.filename }),
              suggestion: t("wizard.validation.emptyOrBadFormat"),
            });
          }

          const numericColIndices: { idx: number; header: string }[] = [];
          table.headers.forEach((h, hIdx) => {
            const mapping = includedMappings.find((m) => m.sourceColumn === h);
            if (mapping && (mapping.fieldType === "number" || mapping.fieldType === "currency" || mapping.fieldType === "percentage")) {
              numericColIndices.push({ idx: hIdx, header: h });
            }
          });

          for (const col of numericColIndices) {
            const values: number[] = [];
            for (const row of table.rows) {
              const val = parseFloat(String(row[col.idx]).replace(/[^0-9.\-]/g, ""));
              if (!isNaN(val)) values.push(val);
            }

            if (values.length >= 5) {
              const mean = values.reduce((a, b) => a + b, 0) / values.length;
              const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
              const stdDev = Math.sqrt(variance);

              if (stdDev > 0) {
                const outliers = values.filter((v) => Math.abs(v - mean) > 2 * stdDev);
                if (outliers.length > 0) {
                  results.push({
                    level: "warning",
                    message: t("wizard.validation.outlierDetected", { col: col.header, count: outliers.length }),
                    suggestion: t("wizard.validation.outlierStats", { mean: mean.toFixed(2), stdDev: stdDev.toFixed(2), values: outliers.slice(0, 3).map((v) => v.toFixed(2)).join(", ") + (outliers.length > 3 ? "..." : "") }),
                  });
                }
              }
            }
          }

          const dateColIndices: { idx: number; header: string }[] = [];
          table.headers.forEach((h, hIdx) => {
            const mapping = includedMappings.find((m) => m.sourceColumn === h);
            if (mapping && mapping.fieldType === "date") {
              dateColIndices.push({ idx: hIdx, header: h });
            }
          });

          for (const col of dateColIndices) {
            const dates: Date[] = [];
            for (const row of table.rows) {
              const d = new Date(String(row[col.idx]));
              if (!isNaN(d.getTime())) dates.push(d);
            }

            if (dates.length >= 3) {
              dates.sort((a, b) => a.getTime() - b.getTime());
              const gaps: number[] = [];
              for (let i = 1; i < dates.length; i++) {
                gaps.push(dates[i].getTime() - dates[i - 1].getTime());
              }
              const medianGap = gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)];
              const largeGaps = gaps.filter((g) => g > medianGap * 2.5);

              if (largeGaps.length > 0 && medianGap > 0) {
                results.push({
                  level: "warning",
                  message: t("wizard.validation.dateGap", { col: col.header, count: largeGaps.length }),
                  suggestion: t("wizard.validation.checkMissingPeriods"),
                });
              }
            }
          }
        }
      }
    }

    if (totalExpectedRows > 0) {
      results.push({
        level: totalActualRows === totalExpectedRows ? "warning" : "warning",
        message: t("wizard.validation.rowCount", { rows: totalActualRows, files: Object.keys(previews).length }),
        suggestion: t("wizard.validation.verifyVolume"),
      });
    }

    setValidationResults(results);
  }, [mappings, previews, t]);

  useEffect(() => {
    if (step === 3) {
      runValidation();
    }
  }, [step, runValidation]);

  const handleConfirm = useCallback(async () => {
    setConfirming(true);
    try {
      await queryClient.invalidateQueries({
        queryKey: ["/api/t", tenantSlug, "projects", projectId, "documents"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["/api/t", tenantSlug, "projects", projectId, "facts"],
      });

      toast({ title: t("wizard.dataLoadedSuccess"), description: t("wizard.nDocsReady", { count: uploadedDocIds.length }) });
      onClose();
    } catch (err: any) {
      toast({ title: t("wizard.confirmationFailed"), description: err.message, variant: "destructive" });
    } finally {
      setConfirming(false);
    }
  }, [tenantSlug, projectId, uploadedDocIds, onClose, toast]);

  const canProceed = (): boolean => {
    switch (step) {
      case 0:
        return uploadedDocIds.length > 0;
      case 1:
        return !hasPiiBlocked && uploadedDocIds.length > 0;
      case 2:
        return mappings.filter((m) => m.included).length > 0;
      case 3: {
        const errors = validationResults.filter((r) => r.level === "error");
        return errors.length === 0;
      }
      case 4:
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    if (step < 4) setStep((step + 1) as WizardStep);
  };

  const goBack = () => {
    if (step > 0) setStep((step - 1) as WizardStep);
  };

  const errorCount = validationResults.filter((r) => r.level === "error").length;
  const warningCount = validationResults.filter((r) => r.level === "warning").length;

  const duplicateFilenames = useMemo(() => {
    if (!existingDocs || existingDocs.length === 0) return [];
    const uploadedFilenames = uploadedDocIds.map((uid) => docs.find((d) => d.id === uid)?.filename).filter(Boolean);
    return existingDocs.filter((ed) =>
      uploadedFilenames.includes(ed.filename) && !uploadedDocIds.includes(ed.id)
    );
  }, [existingDocs, uploadedDocIds, docs]);

  return (
    <div className="space-y-6" data-testid="data-upload-wizard">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEP_LABEL_KEYS.map((key, idx) => {
          const Icon = STEP_ICONS[idx];
          const isActive = idx === step;
          const isCompleted = idx < step;
          return (
            <div key={idx} className="flex items-center gap-1 flex-shrink-0">
              <div
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary border-primary/30"
                    : isCompleted
                      ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"
                      : "bg-muted text-muted-foreground border-transparent"
                }`}
                data-testid={`wizard-step-${idx}`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted-foreground/20 text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <Check className="w-3 h-3" /> : idx + 1}
                </span>
                <span className="whitespace-nowrap">{t(key)}</span>
              </div>
              {idx < STEP_LABEL_KEYS.length - 1 && (
                <ChevronRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      <Progress value={((step + 1) / 5) * 100} className="h-1" />

      <div className="min-h-[300px]">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-base mb-1">{t("wizard.uploadFiles")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("wizard.uploadFilesDesc")}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t("wizard.documentTags")}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {DOCUMENT_TAGS.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className={`cursor-pointer text-xs ${selectedTags.includes(tag) ? "toggle-elevate toggle-elevated" : "toggle-elevate"}`}
                    onClick={() => toggleTag(tag)}
                    data-testid={`tag-chip-${tag}`}
                  >
                    {t(`wizard.tags.${tag}`)}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 p-3 rounded-md border">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium">{t("wizard.sanitizePII")}</span>
                  <p className="text-xs text-muted-foreground">{t("wizard.autoRedactPii")}</p>
                </div>
              </div>
              <Switch
                checked={sanitizePiiOnUpload}
                onCheckedChange={setSanitizePiiOnUpload}
                data-testid="switch-sanitize-pii"
              />
            </div>

            <FileUploadZone
              uploadEndpoint={`${basePath}/documents`}
              onFilesUploaded={handleFilesUploaded}
            />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-base mb-1">{t("wizard.previewData")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("wizard.previewDataDesc")}
              </p>
            </div>

            {hasPiiBlocked && (
              <div className="flex items-start gap-3 p-4 rounded-md bg-red-500/10 border border-red-500/20" data-testid="pii-warning-banner">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-red-700 dark:text-red-300">
                    {t("wizard.piiDetected")}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {t("wizard.docsContainPii", { count: blockedDocs.filter((d) => !markedNonSensitive.has(d.id)).length })}
                  </p>
                </div>
              </div>
            )}

            {previewLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">{t("wizard.loadingPreviews")}</span>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-4">
                  {uploadedDocIds.map((docId) => {
                    const doc = docs.find((d) => d.id === docId);
                    const preview = previews[docId];
                    const isBlocked = (doc?.status === "blocked" || doc?.containsPii) && !markedNonSensitive.has(docId);
                    const isExcluded = excludedFromExtraction.has(docId);
                    const isNonSensitive = markedNonSensitive.has(docId);

                    return (
                      <Card key={docId} data-testid={`preview-card-${docId}`}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium text-sm truncate">{doc?.filename || docId}</span>
                              {preview?.kind && (
                                <Badge variant="outline" className="text-xs flex-shrink-0">{preview.kind}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                              {(doc?.status === "blocked" || doc?.containsPii) && !isNonSensitive && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleSanitize(docId)}
                                  disabled={sanitizingDoc === docId}
                                  data-testid={`button-sanitize-wizard-${docId}`}
                                >
                                  {sanitizingDoc === docId ? (
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  ) : (
                                    <Shield className="w-3 h-3 mr-1" />
                                  )}
                                  {t("wizard.sanitize")}
                                </Button>
                              )}
                              {(doc?.status === "blocked" || doc?.containsPii) && (
                                <Button
                                  variant={isNonSensitive ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => toggleMarkNonSensitive(docId)}
                                  data-testid={`button-mark-nonsensitive-${docId}`}
                                >
                                  <ShieldOff className="w-3 h-3 mr-1" />
                                  {isNonSensitive ? t("wizard.markedNonSensitive") : t("wizard.markNonSensitive")}
                                </Button>
                              )}
                              {isBlocked ? (
                                <Badge className="text-xs bg-red-500/10 text-red-700 dark:text-red-400">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  {t("wizard.piiBlocked")}
                                </Badge>
                              ) : isNonSensitive ? (
                                <Badge className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400">
                                  <ShieldOff className="w-3 h-3 mr-1" />
                                  {t("wizard.nonSensitive")}
                                </Badge>
                              ) : (
                                <Badge className="text-xs bg-green-500/10 text-green-700 dark:text-green-400">
                                  <Check className="w-3 h-3 mr-1" />
                                  {t("wizard.clean")}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between gap-4 mb-3 p-2 rounded-md bg-muted/30">
                            <div className="flex items-center gap-2">
                              <EyeOff className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{t("wizard.excludeFromExtraction")}</span>
                            </div>
                            <Switch
                              checked={isExcluded}
                              onCheckedChange={() => toggleExcludeFromExtraction(docId)}
                              data-testid={`switch-exclude-extraction-${docId}`}
                            />
                          </div>

                          {preview?.previewTables && preview.previewTables.length > 0 ? (
                            <div className="space-y-3">
                              {preview.previewTables.map((table, tIdx) => (
                                <div key={tIdx}>
                                  {table.name && (
                                    <p className="text-xs text-muted-foreground font-medium mb-1">
                                      {t("wizard.sheet")}: {table.name}
                                    </p>
                                  )}
                                  <div className="overflow-x-auto border rounded-md">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="bg-muted/50">
                                          {table.headers.map((h, hIdx) => (
                                            <th key={hIdx} className="text-left py-1.5 px-2 font-medium whitespace-nowrap">
                                              {h}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {table.rows.slice(0, 5).map((row, rIdx) => (
                                          <tr key={rIdx} className="border-t">
                                            {row.map((cell: any, cIdx: number) => (
                                              <td key={cIdx} className="py-1 px-2 whitespace-nowrap max-w-[150px] truncate">
                                                {cell !== null && cell !== undefined ? String(cell) : ""}
                                              </td>
                                            ))}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                  {table.rows.length > 5 && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {t("wizard.showingNOfM", { shown: 5, total: table.rows.length })}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : preview?.previewText ? (
                            <pre className="text-xs font-mono bg-muted/50 p-3 rounded-md whitespace-pre-wrap max-h-[150px] overflow-auto">
                              {preview.previewText.slice(0, 2000)}
                            </pre>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">{t("wizard.noPreview")}</p>
                          )}

                          {preview?.warnings && preview.warnings.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {preview.warnings.map((w, wIdx) => (
                                <div key={wIdx} className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                  {w}
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-base mb-1">{t("wizard.columnMapping")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("wizard.columnMappingDesc")}
              </p>
            </div>

            {uniqueHeaders.length > 0 ? (
              <SchemaMappingTable
                headers={uniqueHeaders}
                sampleRow={firstSampleRow}
                onMappingChange={setMappings}
                initialMappings={mappings.length > 0 ? mappings : undefined}
              />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <GitBranch className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {t("wizard.noTabularData")}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-base mb-1">{t("wizard.validationTitle")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("wizard.validationDesc")}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {errorCount > 0 && (
                <Badge className="text-xs bg-red-500/10 text-red-700 dark:text-red-400">
                  {t("wizard.nErrors", { count: errorCount })}
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge className="text-xs bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
                  <BarChart3 className="w-3 h-3 mr-1" />
                  {t("wizard.nWarnings", { count: warningCount })}
                </Badge>
              )}
              {errorCount === 0 && warningCount === 0 && (
                <Badge className="text-xs bg-green-500/10 text-green-700 dark:text-green-400">
                  <Check className="w-3 h-3 mr-1" />
                  {t("wizard.allChecksPassed")}
                </Badge>
              )}
            </div>

            {validationResults.length > 0 ? (
              <div className="space-y-2">
                {validationResults.map((result, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-md border ${
                      result.level === "error"
                        ? "bg-red-500/5 border-red-500/20"
                        : "bg-yellow-500/5 border-yellow-500/20"
                    }`}
                    data-testid={`validation-result-${idx}`}
                  >
                    {result.level === "error" ? (
                      <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{result.message}</p>
                      {result.suggestion && (
                        <p className="text-xs text-muted-foreground mt-0.5">{result.suggestion}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Check className="w-10 h-10 text-green-500 mx-auto mb-3" />
                  <p className="font-medium text-sm">{t("wizard.allValidationsPassed")}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("wizard.readyToConfirm")}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-base mb-1">{t("wizard.confirmAndLoad")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("wizard.confirmAndLoadDesc")}
              </p>
            </div>

            {duplicateFilenames.length > 0 && (
              <div className="flex items-start gap-3 p-4 rounded-md bg-yellow-500/10 border border-yellow-500/20" data-testid="idempotent-warning">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-yellow-700 dark:text-yellow-300">
                    {t("wizard.duplicateDetected")}
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    {t("wizard.duplicateDesc", { files: duplicateFilenames.map((d) => d.filename).join(", ") })}
                  </p>
                </div>
              </div>
            )}

            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-md bg-muted/50">
                    <span className="text-xs text-muted-foreground block mb-1">{t("wizard.documents")}</span>
                    <span className="text-xl font-bold" data-testid="text-confirm-doc-count">
                      {uploadedDocIds.length}
                    </span>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50">
                    <span className="text-xs text-muted-foreground block mb-1">{t("wizard.mappedFields")}</span>
                    <span className="text-xl font-bold" data-testid="text-confirm-field-count">
                      {mappings.filter((m) => m.included).length}
                    </span>
                  </div>
                </div>

                {selectedTags.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-2">{t("wizard.appliedTags")}</h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        {selectedTags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs" data-testid={`confirm-tag-${tag}`}>
                            {t(`wizard.tags.${tag}`)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-2">{t("wizard.includedDocuments")}</h4>
                  <div className="space-y-1">
                    {uploadedDocIds.map((docId) => {
                      const doc = docs.find((d) => d.id === docId);
                      const isExcluded = excludedFromExtraction.has(docId);
                      return (
                        <div key={docId} className="flex items-center gap-2 text-sm" data-testid={`confirm-doc-${docId}`}>
                          <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                          <span className="truncate">{doc?.filename || docId}</span>
                          {isExcluded && (
                            <Badge variant="outline" className="text-[10px] flex-shrink-0">
                              <EyeOff className="w-2 h-2 mr-0.5" />
                              {t("wizard.excluded")}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-[10px] ml-auto flex-shrink-0">
                            {doc?.kind || t("common.unknown")}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-2">{t("wizard.validationStatus")}</h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    {errorCount === 0 ? (
                      <Badge className="text-xs bg-green-500/10 text-green-700 dark:text-green-400">
                        <Check className="w-3 h-3 mr-1" />
                        {t("wizard.passed")}
                      </Badge>
                    ) : (
                      <Badge className="text-xs bg-red-500/10 text-red-700 dark:text-red-400">
                        {t("wizard.validation.errorsCount", { count: errorCount })}
                      </Badge>
                    )}
                    {warningCount > 0 && (
                      <Badge className="text-xs bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
                        {t("wizard.validation.warningsCount", { count: warningCount })}
                      </Badge>
                    )}
                  </div>
                </div>

                {mappings.filter((m) => m.included).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-2">{t("wizard.fieldMappingSummary")}</h4>
                      <div className="space-y-1">
                        {mappings
                          .filter((m) => m.included)
                          .map((m, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-muted-foreground">{m.sourceColumn}</span>
                              <ChevronRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                              <span className="font-medium">{m.targetField}</span>
                              <Badge variant="outline" className="text-[10px]">{m.fieldType}</Badge>
                              {m.unit && m.unit !== "none" && (
                                <Badge variant="secondary" className="text-[10px]">{m.unit}</Badge>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 pt-2 border-t">
        <div className="flex items-center gap-2">
          {step > 0 && (
            <Button variant="outline" onClick={goBack} data-testid="button-wizard-back">
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t("common.back")}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} data-testid="button-wizard-cancel">
            {t("common.cancel")}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {step === 2 && uniqueHeaders.length === 0 && (
            <Button variant="outline" onClick={goNext} data-testid="button-wizard-skip">
              <SkipForward className="w-4 h-4 mr-1" />
              {t("wizard.skip")}
            </Button>
          )}
          {step < 4 ? (
            <Button onClick={goNext} disabled={!canProceed()} data-testid="button-wizard-next">
              {t("wizard.next")}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleConfirm} disabled={confirming} data-testid="button-wizard-confirm">
              {confirming ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileCheck className="w-4 h-4 mr-2" />
              )}
              {t("wizard.confirmAndLoad")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
