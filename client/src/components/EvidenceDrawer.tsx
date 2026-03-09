import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, Link2, ChevronDown, ChevronUp,
  CheckCircle, Clock, XCircle, ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Fact, Evidence } from "@shared/schema";

interface EvidenceDrawerProps {
  fact: Fact | null;
  open: boolean;
  onClose: () => void;
}

export function EvidenceDrawer({ fact, open, onClose }: EvidenceDrawerProps) {
  const { t } = useTranslation();
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(false);
  const [snippets, setSnippets] = useState<Record<string, string>>({});
  const [expandedSnippets, setExpandedSnippets] = useState<Record<string, boolean>>({});
  const [snippetLoading, setSnippetLoading] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const factStatusConfig: Record<string, { icon: any; color: string; label: string }> = {
    proposed: { icon: Clock, color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400", label: t("evidence.proposed") },
    approved: { icon: CheckCircle, color: "bg-green-500/10 text-green-700 dark:text-green-400", label: t("evidence.approved") },
    rejected: { icon: XCircle, color: "bg-red-500/10 text-red-700 dark:text-red-400", label: t("evidence.rejected") },
  };

  useEffect(() => {
    if (!fact || !open) return;
    setEvidenceList([]);
    setSnippets({});
    setExpandedSnippets({});
    setLoading(true);

    fetch(`/api/facts/${fact.id}/evidence`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(t("evidence.failedToLoad"));
        return res.json();
      })
      .then((data: Evidence[]) => {
        setEvidenceList(data);
      })
      .catch((err) => {
        toast({ title: t("common.error"), description: err.message, variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [fact?.id, open]);

  const loadSnippet = async (evidenceId: string) => {
    if (snippets[evidenceId]) {
      setExpandedSnippets((prev) => ({ ...prev, [evidenceId]: !prev[evidenceId] }));
      return;
    }
    setSnippetLoading((prev) => ({ ...prev, [evidenceId]: true }));
    try {
      const res = await fetch(`/api/evidence/${evidenceId}/snippet`, { credentials: "include" });
      if (!res.ok) throw new Error(t("evidence.failedToLoadSnippet"));
      const data = await res.json();
      setSnippets((prev) => ({ ...prev, [evidenceId]: data.snippet || t("evidence.noSnippet") }));
      setExpandedSnippets((prev) => ({ ...prev, [evidenceId]: true }));
    } catch (err: any) {
      toast({ title: t("evidence.snippetError"), description: err.message, variant: "destructive" });
    } finally {
      setSnippetLoading((prev) => ({ ...prev, [evidenceId]: false }));
    }
  };

  if (!fact) return null;

  const statusCfg = factStatusConfig[fact.status] || factStatusConfig.proposed;
  const StatusIcon = statusCfg.icon;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg" data-testid="evidence-drawer">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            {t("evidence.evidenceLineage")}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-2">
          <div className="space-y-4">
            <Card data-testid={`evidence-drawer-fact-${fact.id}`}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{fact.key}</span>
                  <Badge variant="secondary" className="text-xs">{fact.factType}</Badge>
                  <Badge className={`text-xs ${statusCfg.color}`} data-testid={`pill-status-${fact.id}`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusCfg.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {typeof fact.valueJson === "object"
                    ? JSON.stringify(fact.valueJson)
                    : String(fact.valueJson)}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  {fact.unit && <span>{t("evidence.unit")}: {fact.unit}</span>}
                  <span>{t("evidence.confidence")}: {((fact.confidence || 0) * 100).toFixed(0)}%</span>
                  {fact.phaseId !== null && fact.phaseId !== undefined && (
                    <Badge variant="secondary" className="text-[10px]">{t("evidence.phase")} {fact.phaseId}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Separator />

            <div>
              <h4 className="text-sm font-medium mb-2">
                {t("evidence.evidenceChain")} ({evidenceList.length})
              </h4>

              {loading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : evidenceList.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="text-no-evidence">
                  {t("evidence.noEvidenceLinked")}
                </p>
              ) : (
                <div className="space-y-2">
                  {evidenceList.map((ev) => {
                    const ref = ev.refJson as any;
                    const isExpanded = expandedSnippets[ev.id];
                    const isLoadingSnippet = snippetLoading[ev.id];

                    return (
                      <Card key={ev.id} data-testid={`evidence-item-${ev.id}`}>
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant="secondary" className="text-[10px]" data-testid={`chip-kind-${ev.id}`}>
                                {ev.kind}
                              </Badge>
                              {ev.documentId && (
                                <Badge variant="secondary" className="text-[10px]" data-testid={`chip-doc-${ev.id}`}>
                                  <FileText className="w-2.5 h-2.5 mr-0.5" />
                                  doc
                                </Badge>
                              )}
                              {ref?.page && (
                                <Badge variant="secondary" className="text-[10px]">
                                  p.{ref.page}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => loadSnippet(ev.id)}
                              disabled={isLoadingSnippet}
                              data-testid={`button-snippet-${ev.id}`}
                            >
                              {isLoadingSnippet ? (
                                <span className="w-4 h-4 animate-spin border-2 border-current border-t-transparent rounded-full inline-block" />
                              ) : isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                          </div>

                          {isExpanded && snippets[ev.id] && (
                            <div
                              className="text-xs bg-muted/50 rounded-md p-2 font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto"
                              data-testid={`snippet-content-${ev.id}`}
                            >
                              {snippets[ev.id]}
                            </div>
                          )}

                          <span className="text-[10px] text-muted-foreground">
                            {new Date(ev.createdAt).toLocaleString()}
                          </span>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
