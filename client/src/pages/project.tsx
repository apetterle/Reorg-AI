import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLocation, Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Upload, FileText, Shield, AlertTriangle, Check, X,
  Play, Download, BarChart3, Eye, Trash2, RefreshCw, Pencil,
  FileSearch, Zap, CheckCircle, XCircle, Clock, ChevronRight,
  Loader2, Globe, Filter, ChevronDown, Activity,
  Layers, Target, ShieldCheck, TrendingUp, CheckSquare,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useRef, useMemo } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { PhaseProgressStepper, PhaseNav } from "@/components/PhaseProgressStepper";
import { PhaseWorkspace } from "@/components/PhaseWorkspace";
import { ArtifactDetailViewer } from "@/components/ArtifactDetailViewer";
import { DataUploadWizard } from "@/components/DataUploadWizard";
import { DataQualityIndicator } from "@/components/DataQualityIndicator";
import { EvidenceDrawer } from "@/components/EvidenceDrawer";
import { OutputCard } from "@/components/OutputCard";
import { ReportGenerator } from "@/components/ReportGenerator";
import { MetricGrid, type MetricItem } from "@/components/report/MetricGrid";
import { BarChartPanel, type BarChartItem } from "@/components/report/BarChartPanel";
import { ProjectSideNav, getSectionLabel, type ProjectSection } from "@/components/ProjectSideNav";
import { ProjectBreadcrumbs } from "@/components/Breadcrumbs";
import { PHASES } from "@shared/schema";
import type { Project, Document as Doc, Fact, Job, Artifact, Evidence, Company, PhaseGate } from "@shared/schema";
import { useTranslation } from "react-i18next";

const statusColors: Record<string, string> = {
  uploaded: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  blocked: "bg-red-500/10 text-red-700 dark:text-red-400",
  ready: "bg-green-500/10 text-green-700 dark:text-green-400",
  ingested: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  extracted: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
};

const piiColors: Record<string, string> = {
  low: "bg-green-500/10 text-green-700 dark:text-green-400",
  medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  high: "bg-red-500/10 text-red-700 dark:text-red-400",
  unknown: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
};

const factStatusIcons: Record<string, any> = {
  proposed: Clock,
  approved: CheckCircle,
  rejected: XCircle,
};

const jobStatusColors: Record<string, string> = {
  queued: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  running: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  succeeded: "bg-green-500/10 text-green-700 dark:text-green-400",
  failed: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export default function ProjectPage() {
  const params = useParams<{ tenantSlug: string; projectId: string; companyId?: string }>();
  const { tenantSlug, projectId, companyId } = params;
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useWebSocket(projectId, tenantSlug);

  const [activeSection, setActiveSection] = useState<ProjectSection>("overview");
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [selectedFact, setSelectedFact] = useState<Fact | null>(null);
  const [evidenceDrawerOpen, setEvidenceDrawerOpen] = useState(false);
  const [editingFact, setEditingFact] = useState<Fact | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editConfidence, setEditConfidence] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [minConfidence, setMinConfidence] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null);
  const [phaseRunning, setPhaseRunning] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState<Record<string, boolean>>({});
  const [auditActionFilter, setAuditActionFilter] = useState<string>("all");
  const [viewingArtifact, setViewingArtifact] = useState<Artifact | null>(null);
  const [selectedFacts, setSelectedFacts] = useState<Set<string>>(new Set());
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const basePath = `/api/t/${tenantSlug}/projects/${projectId}`;

  const { data: project, isLoading: loadingProject } = useQuery<Project>({
    queryKey: ["/api/t", tenantSlug, "projects", projectId],
    queryFn: async () => {
      const res = await fetch(`${basePath}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const { data: company } = useQuery<Company>({
    queryKey: ["/api/t", tenantSlug, "companies", companyId],
    queryFn: async () => {
      const res = await fetch(`/api/t/${tenantSlug}/companies/${companyId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!companyId,
  });

  const { data: docs, isLoading: loadingDocs } = useQuery<Doc[]>({
    queryKey: ["/api/t", tenantSlug, "projects", projectId, "documents"],
    queryFn: async () => {
      const res = await fetch(`${basePath}/documents`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: factsList, isLoading: loadingFacts } = useQuery<Fact[]>({
    queryKey: ["/api/t", tenantSlug, "projects", projectId, "facts"],
    queryFn: async () => {
      const res = await fetch(`${basePath}/facts`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: jobsList } = useQuery<Job[]>({
    queryKey: ["/api/t", tenantSlug, "projects", projectId, "jobs"],
    queryFn: async () => {
      const res = await fetch(`${basePath}/jobs`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: outputs } = useQuery<Artifact[]>({
    queryKey: ["/api/t", tenantSlug, "projects", projectId, "outputs"],
    queryFn: async () => {
      const res = await fetch(`${basePath}/outputs`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: runsData } = useQuery<any[]>({
    queryKey: ["/api/t", tenantSlug, "projects", projectId, "runs"],
    queryFn: async () => {
      const res = await fetch(`${basePath}/runs`, { credentials: "include" });
      if (!res.ok) return jobsList || [];
      return res.json();
    },
    enabled: activeSection === "runs-logs",
  });

  const { data: auditData } = useQuery<any[]>({
    queryKey: ["/api/t", tenantSlug, "projects", projectId, "audit"],
    queryFn: async () => {
      const res = await fetch(`${basePath}/audit`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: activeSection === "audit",
  });

  const { data: projectGates } = useQuery<PhaseGate[]>({
    queryKey: ["/api/t", tenantSlug, "projects", projectId, "gates"],
    queryFn: async () => {
      const res = await fetch(`${basePath}/gates`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const gatePassedPhases = useMemo(
    () => (projectGates || []).filter((g) => g.decision === "passed").map((g) => g.phaseId),
    [projectGates]
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`${basePath}/documents`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) {
          const err = await res.text();
          throw new Error(err);
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId, "documents"] });
      toast({ title: t("project.filesUploaded") });
    } catch (err: any) {
      toast({ title: t("project.uploadFailed"), description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePreview = async (docId: string) => {
    setPreviewDoc(docId);
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const res = await fetch(`/api/documents/${docId}/preview`, { credentials: "include" });
      if (!res.ok) throw new Error("Preview failed");
      const data = await res.json();
      setPreviewData(data);
    } catch (err: any) {
      setPreviewDoc(null);
      toast({ title: t("project.previewFailed"), description: err.message, variant: "destructive" });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSanitize = async (docId: string) => {
    setActionLoading(`sanitize-${docId}`);
    try {
      await apiRequest("POST", `/api/documents/${docId}/sanitize`);
      await queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId, "documents"] });
      toast({ title: t("project.documentSanitized") });
    } catch (err: any) {
      toast({ title: t("project.sanitizeFailed"), description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    setActionLoading(`delete-${docId}`);
    try {
      await apiRequest("DELETE", `/api/documents/${docId}`);
      await queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId, "documents"] });
      toast({ title: t("project.documentDeleted") });
    } catch (err: any) {
      toast({ title: t("project.deleteFailed"), description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
      setDeleteConfirmDoc(null);
    }
  };

  const runJob = async (type: string) => {
    try {
      await apiRequest("POST", `${basePath}/run/${type}`);
      await queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId, "jobs"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId, "documents"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId, "facts"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId, "outputs"] });
      toast({ title: t("project.jobTypeStarted", { type }) });
    } catch (err: any) {
      toast({ title: t("project.jobFailed"), description: err.message, variant: "destructive" });
    }
  };

  const handleApproveFact = async (factId: string) => {
    setActionLoading(`approve-${factId}`);
    try {
      await apiRequest("POST", `/api/facts/${factId}/approve`);
      await queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId, "facts"] });
      toast({ title: t("project.factApproved") });
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectFact = async (factId: string) => {
    setActionLoading(`reject-${factId}`);
    try {
      await apiRequest("POST", `/api/facts/${factId}/reject`);
      await queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId, "facts"] });
      toast({ title: t("project.factRejected") });
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditFact = async () => {
    if (!editingFact) return;
    try {
      const updateData: any = {};
      if (editValue) {
        try {
          updateData.valueJson = JSON.parse(editValue);
        } catch {
          updateData.valueJson = { text: editValue };
        }
      }
      if (editUnit) updateData.unit = editUnit;
      if (editConfidence) updateData.confidence = parseFloat(editConfidence);

      await apiRequest("PATCH", `/api/facts/${editingFact.id}`, updateData);
      await queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId, "facts"] });
      setEditingFact(null);
      toast({ title: t("project.factUpdated") });
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    }
  };

  const openEvidenceDrawer = (fact: Fact) => {
    setSelectedFact(fact);
    setEvidenceDrawerOpen(true);
  };

  const handleExport = async (format: string) => {
    try {
      const res = await fetch(`${basePath}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project?.name || "export"}-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: t("project.exportDownloaded") });
    } catch (err: any) {
      toast({ title: t("project.exportFailed"), description: err.message, variant: "destructive" });
    }
  };

  const toggleFactSelection = (factId: string) => {
    setSelectedFacts((prev) => {
      const next = new Set(prev);
      if (next.has(factId)) next.delete(factId);
      else next.add(factId);
      return next;
    });
  };

  const toggleDocSelection = (docId: string) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const handleBulkApproveFacts = async () => {
    if (selectedFacts.size === 0) return;
    setBulkLoading("bulk-approve");
    try {
      await apiRequest("POST", `${basePath}/facts/bulk-approve`, { factIds: Array.from(selectedFacts) });
      await queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId, "facts"] });
      toast({ title: t("project.nFactsApproved", { count: selectedFacts.size }) });
      setSelectedFacts(new Set());
    } catch (err: any) {
      toast({ title: t("project.bulkApproveFailed"), description: err.message, variant: "destructive" });
    } finally {
      setBulkLoading(null);
    }
  };

  const handleBulkRejectFacts = async () => {
    if (selectedFacts.size === 0) return;
    setBulkLoading("bulk-reject");
    try {
      await apiRequest("POST", `${basePath}/facts/bulk-reject`, { factIds: Array.from(selectedFacts) });
      await queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId, "facts"] });
      toast({ title: t("project.nFactsRejected", { count: selectedFacts.size }) });
      setSelectedFacts(new Set());
    } catch (err: any) {
      toast({ title: t("project.bulkRejectFailed"), description: err.message, variant: "destructive" });
    } finally {
      setBulkLoading(null);
    }
  };

  const handleBulkDeleteDocs = async () => {
    if (selectedDocs.size === 0) return;
    setBulkLoading("bulk-delete-docs");
    try {
      await apiRequest("POST", `${basePath}/documents/bulk-delete`, { documentIds: Array.from(selectedDocs) });
      await queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId, "documents"] });
      toast({ title: t("project.nDocsDeleted", { count: selectedDocs.size }) });
      setSelectedDocs(new Set());
    } catch (err: any) {
      toast({ title: t("project.bulkDeleteFailed"), description: err.message, variant: "destructive" });
    } finally {
      setBulkLoading(null);
      setBulkDeleteConfirm(false);
    }
  };

  const filteredFacts = (factsList || []).filter((f) => {
    if (statusFilter !== "all" && f.status !== statusFilter) return false;
    if (typeFilter !== "all" && f.factType !== typeFilter) return false;
    if (minConfidence > 0 && (f.confidence || 0) < minConfidence) return false;
    return true;
  });

  const approvedCount = (factsList || []).filter((f) => f.status === "approved").length;
  const proposedCount = (factsList || []).filter((f) => f.status === "proposed").length;
  const readyDocs = (docs || []).filter((d) => d.status === "ready" || d.status === "ingested" || d.status === "extracted").length;
  const blockedDocs = (docs || []).filter((d) => d.status === "blocked").length;

  const completedPhases: number[] = [];
  const projectCurrentPhase = project?.currentPhase ?? 0;
  if (projectCurrentPhase > 0) {
    for (let i = 0; i < projectCurrentPhase; i++) {
      completedPhases.push(i);
    }
  }

  const handleRunPhase = async (phaseId: number) => {
    setPhaseRunning(true);
    try {
      await apiRequest("POST", `${basePath}/phases/${phaseId}/run`);
      await queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId, "jobs"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId, "outputs"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId] });
      toast({ title: t("project.phaseJobStarted", { id: phaseId }) });
    } catch (err: any) {
      toast({ title: t("project.phaseRunFailed"), description: err.message, variant: "destructive" });
    } finally {
      setPhaseRunning(false);
    }
  };

  const [outputPhaseFilter, setOutputPhaseFilter] = useState<string>("all");

  const groupedOutputs = useMemo(() => {
    if (!outputs) return {};
    const filtered = outputPhaseFilter === "all"
      ? outputs
      : outputs.filter((a) => String(a.phaseId) === outputPhaseFilter);
    const groups: Record<string, Artifact[]> = {};
    for (const a of filtered) {
      const key = a.phaseId !== null && a.phaseId !== undefined
        ? `${t("phases.phaseN", { id: a.phaseId })}: ${t(`phases.phaseShort${a.phaseId}`, { defaultValue: t("common.unknown") })}`
        : t("common.general");
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    }
    return groups;
  }, [outputs, outputPhaseFilter, t]);

  const filteredAuditEvents = useMemo(() => {
    if (!auditData) return [];
    if (auditActionFilter === "all") return auditData;
    return auditData.filter((e: any) => e.action === auditActionFilter);
  }, [auditData, auditActionFilter]);

  const auditActions = useMemo(() => {
    if (!auditData) return [];
    return Array.from(new Set(auditData.map((e: any) => e.action)));
  }, [auditData]);

  const outputsDashboardMetrics = useMemo((): MetricItem[] => {
    const totalArtifacts = outputs?.length || 0;
    const phasesWithArtifacts = new Set((outputs || []).map((a) => a.phaseId).filter((p) => p !== null && p !== undefined));
    const totalDocs = docs?.length || 0;
    const readyOrProcessed = (docs || []).filter((d) => d.status === "ready" || d.status === "ingested" || d.status === "extracted").length;
    const dataQualityScore = totalDocs > 0 ? Math.round((readyOrProcessed / totalDocs) * 100) : 0;

    return [
      {
        label: t("project.totalArtifacts"),
        value: totalArtifacts,
        subtitle: t("project.acrossPhases", { count: phasesWithArtifacts.size }),
        icon: Layers,
        colorVariant: "primary",
      },
      {
        label: t("project.currentPhase"),
        value: `P${projectCurrentPhase}`,
        subtitle: t(`phases.phaseName${projectCurrentPhase}`, { defaultValue: t("common.unknown") }),
        icon: Target,
        colorVariant: "success",
      },
      {
        label: t("project.phasesCompleted"),
        value: completedPhases.length,
        subtitle: t("project.ofTotal", { total: PHASES.length }),
        icon: CheckCircle,
        trend: completedPhases.length > 0 ? "up" : "neutral",
        trendLabel: completedPhases.length > 0 ? `${Math.round((completedPhases.length / PHASES.length) * 100)}%` : "0%",
        colorVariant: "warning",
      },
      {
        label: t("project.dataQuality"),
        value: `${dataQualityScore}%`,
        subtitle: t("project.docsProcessed", { ready: readyOrProcessed, total: totalDocs }),
        icon: ShieldCheck,
        trend: dataQualityScore >= 80 ? "up" : dataQualityScore >= 50 ? "neutral" : "down",
        colorVariant: dataQualityScore >= 80 ? "success" : dataQualityScore >= 50 ? "warning" : "danger",
      },
    ];
  }, [outputs, docs, projectCurrentPhase, completedPhases, t]);

  const phaseProgressChartData = useMemo((): BarChartItem[] => {
    return PHASES.map((phase) => {
      const isCompleted = completedPhases.includes(phase.id);
      const isActive = phase.id === projectCurrentPhase;
      const phaseArtifacts = (outputs || []).filter((a) => a.phaseId === phase.id);
      return {
        name: t(`phases.phaseShort${phase.id}`),
        value: phaseArtifacts.length,
        fill: isCompleted
          ? "hsl(var(--chart-2))"
          : isActive
            ? "hsl(var(--chart-1))"
            : "hsl(var(--muted-foreground) / 0.3)",
      };
    });
  }, [outputs, completedPhases, projectCurrentPhase, t]);

  const perPhaseArtifactSummaries = useMemo(() => {
    if (!outputs || outputs.length === 0) return [];
    const phaseMap = new Map<number, { phaseId: number; phaseName: string; artifacts: Artifact[]; keyMetrics: { label: string; value: string }[] }>();

    for (const artifact of outputs) {
      const pid = artifact.phaseId ?? -1;
      if (!phaseMap.has(pid)) {
        phaseMap.set(pid, {
          phaseId: pid,
          phaseName: pid >= 0 ? (t(`phases.phaseName${pid}`, { defaultValue: t("phases.phaseN", { id: pid }) })) : t("common.general"),
          artifacts: [],
          keyMetrics: [],
        });
      }
      phaseMap.get(pid)!.artifacts.push(artifact);
    }

    Array.from(phaseMap.values()).forEach((entry) => {
      const metrics: { label: string; value: string }[] = [];
      for (const art of entry.artifacts) {
        const data = art.dataJson as any;
        if (!data) continue;
        if (data.roi_percentage) metrics.push({ label: "ROI", value: `${data.roi_percentage}%` });
        if (data.total_investment) metrics.push({ label: t("project.investment"), value: typeof data.total_investment === "number" ? `R$ ${(data.total_investment / 1000).toFixed(0)}k` : String(data.total_investment) });
        if (data.payback_months) metrics.push({ label: t("project.payback"), value: `${data.payback_months} mo` });
        if (data.automation_percentage) metrics.push({ label: t("project.automation"), value: `${data.automation_percentage}%` });
        if (data.total_facts) metrics.push({ label: t("project.facts"), value: String(data.total_facts) });
        if (data.avg_confidence) metrics.push({ label: t("project.confidence"), value: `${(data.avg_confidence * 100).toFixed(0)}%` });
        if (data.npv) metrics.push({ label: t("artifacts.npv"), value: typeof data.npv === "number" ? `R$ ${(data.npv / 1000).toFixed(0)}k` : String(data.npv) });
        if (data.headcount_before && data.headcount_after) metrics.push({ label: t("project.headcount"), value: `${data.headcount_before} → ${data.headcount_after}` });
        if (data.processes?.length) metrics.push({ label: t("project.processes"), value: String(data.processes.length) });
        if (data.use_cases?.length) metrics.push({ label: t("project.useCases"), value: String(data.use_cases.length) });
        if (data.tools?.length) metrics.push({ label: t("project.tools"), value: String(data.tools.length) });
        if (data.scenarios?.length) metrics.push({ label: t("project.scenarios"), value: String(data.scenarios.length) });
        if (data.waves?.length) metrics.push({ label: t("project.waves"), value: String(data.waves.length) });
      }
      const uniqueMetrics = metrics.reduce((acc, m) => {
        if (!acc.find((x) => x.label === m.label)) acc.push(m);
        return acc;
      }, [] as { label: string; value: string }[]);
      entry.keyMetrics = uniqueMetrics.slice(0, 4);
    });

    return Array.from(phaseMap.values()).sort((a, b) => a.phaseId - b.phaseId);
  }, [outputs, t]);

  if (loadingProject) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-4 w-96" />
      </div>
    );
  }

  const sectionLabel = activeSection !== "overview" ? t(getSectionLabel(activeSection)) : undefined;

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return renderOverview();
      case "data-intake":
        return renderDataIntake();
      case "data-room":
        return renderDataRoom();
      case "phases":
        return renderPhases();
      case "outputs":
        return renderOutputs();
      case "runs-logs":
        return renderRunsLogs();
      case "audit":
        return renderAudit();
      case "settings":
        return renderSettings();
      default:
        return renderOverview();
    }
  };

  const renderOverview = () => (
    <div className="space-y-6" data-testid="section-overview">
      <DataQualityIndicator
        documents={docs || []}
        facts={factsList || []}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">{t("project.documents")}</span>
            </div>
            <span className="text-2xl font-bold" data-testid="text-doc-count">{docs?.length || 0}</span>
            {blockedDocs > 0 && (
              <span className="text-xs text-red-500 ml-2">{blockedDocs} {t("common.blocked").toLowerCase()}</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileSearch className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">{t("project.facts")}</span>
            </div>
            <span className="text-2xl font-bold" data-testid="text-fact-count">{factsList?.length || 0}</span>
            <span className="text-xs text-muted-foreground ml-2">{proposedCount} {t("common.pending").toLowerCase()}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">{t("common.approved")}</span>
            </div>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-approved-count">
              {approvedCount}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">{t("project.artifacts")}</span>
            </div>
            <span className="text-2xl font-bold" data-testid="text-artifact-count">{outputs?.length || 0}</span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("project.phaseProgress")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {PHASES.map((phase) => {
                const isCompleted = completedPhases.includes(phase.id);
                const isActive = phase.id === projectCurrentPhase;
                return (
                  <div key={phase.id} className="flex items-center gap-2 text-sm">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                      isCompleted ? "bg-green-500 text-white" : isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {isCompleted ? <Check className="w-3 h-3" /> : phase.id}
                    </span>
                    <span className={isCompleted ? "text-green-600 dark:text-green-400" : isActive ? "text-primary font-medium" : "text-muted-foreground"}>
                      {t(`phases.phaseShort${phase.id}`)}
                    </span>
                    {isCompleted && <Badge variant="secondary" className="text-[10px] ml-auto no-default-hover-elevate no-default-active-elevate">{t("project.done")}</Badge>}
                    {isActive && <Badge variant="secondary" className="text-[10px] ml-auto bg-primary/10 text-primary no-default-hover-elevate no-default-active-elevate">{t("project.active")}</Badge>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("project.processingPipeline")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-blue-500/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t("project.ingest")}</p>
                <p className="text-xs text-muted-foreground">{readyDocs} {t("common.ready").toLowerCase()}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => runJob("ingest")} disabled={readyDocs === 0} data-testid="button-run-ingest">
                <Play className="w-3 h-3 mr-1" /> {t("project.run")}
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-purple-500/10 flex items-center justify-center">
                <FileSearch className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t("project.extract")}</p>
                <p className="text-xs text-muted-foreground">{t("project.discoverFacts")}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => runJob("extract")} data-testid="button-run-extract">
                <Play className="w-3 h-3 mr-1" /> {t("project.run")}
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-green-500/10 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t("phases.phaseShort1")}</p>
                <p className="text-xs text-muted-foreground">{approvedCount} {t("common.approved").toLowerCase()}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => runJob("valuescope")} disabled={approvedCount === 0} data-testid="button-run-valuescope">
                <Play className="w-3 h-3 mr-1" /> {t("project.run")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {jobsList && jobsList.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("project.recentJobs")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {jobsList.slice(0, 5).map((job) => (
              <div key={job.id} className="flex items-center justify-between gap-4" data-testid={`overview-job-${job.id}`}>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${jobStatusColors[job.status] || ""}`}>{job.status}</Badge>
                  <span className="text-sm">{job.type}</span>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(job.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderDataIntake = () => (
    <div className="space-y-4" data-testid="section-data-intake">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("project.dataUploadWizard")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataUploadWizard
            tenantSlug={tenantSlug!}
            projectId={projectId!}
            existingDocs={docs}
            onClose={() => {
              setActiveSection("data-room");
              queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId, "documents"] });
            }}
          />
        </CardContent>
      </Card>
    </div>
  );

  const renderDataRoom = () => (
    <div className="space-y-4" data-testid="section-data-room">
      {showWizard ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("project.dataUploadWizard")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DataUploadWizard
              tenantSlug={tenantSlug!}
              projectId={projectId!}
              existingDocs={docs}
              onClose={() => {
                setShowWizard(false);
                queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId, "documents"] });
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-lg font-semibold">{t("project.dataRoom")}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {selectedDocs.size > 0 && (
                <>
                  <span className="text-xs text-muted-foreground">{t("project.nSelected", { count: selectedDocs.size })}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (docs) {
                        setSelectedDocs(new Set(docs.map((d) => d.id)));
                      }
                    }}
                    data-testid="button-select-all-docs"
                  >
                    <CheckSquare className="w-4 h-4 mr-2" />
                    {t("common.selectAll")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDocs(new Set())}
                    data-testid="button-deselect-all-docs"
                  >
                    {t("common.clearSelection")}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setBulkDeleteConfirm(true)}
                    disabled={bulkLoading === "bulk-delete-docs"}
                    data-testid="button-bulk-delete-docs"
                  >
                    {bulkLoading === "bulk-delete-docs" ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    {t("common.deleteSelected")}
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={() => setShowWizard(true)} data-testid="button-open-wizard">
                <Zap className="w-4 h-4 mr-2" />
                {t("project.dataWizard")}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                accept=".xlsx,.xls,.csv,.pdf,.docx,.doc,.pptx,.ppt,.txt,.json,.xml"
                data-testid="input-file-upload"
              />
              <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} data-testid="button-upload">
                {uploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {uploading ? t("project.uploading") : t("project.uploadFiles")}
              </Button>
            </div>
          </div>

          {loadingDocs ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : docs && docs.length > 0 ? (
            <div className="space-y-2">
              {docs.map((doc) => (
                <Card key={doc.id} data-testid={`card-document-${doc.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Checkbox
                          checked={selectedDocs.has(doc.id)}
                          onCheckedChange={() => toggleDocSelection(doc.id)}
                          data-testid={`checkbox-doc-${doc.id}`}
                          className="flex-shrink-0"
                        />
                        <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{doc.filename}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {doc.kind && (
                              <span className="text-xs text-muted-foreground">{doc.kind}</span>
                            )}
                            {doc.sizeBytes && (
                              <span className="text-xs text-muted-foreground">
                                {(doc.sizeBytes / 1024).toFixed(1)} KB
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                        <Badge className={`text-xs ${statusColors[doc.status] || ""}`}>
                          {doc.status}
                        </Badge>
                        <Badge className={`text-xs ${piiColors[doc.piiRisk || "unknown"]}`}>
                          {doc.status === "blocked" && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {t("project.pii")}: {doc.piiRisk}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePreview(doc.id)}
                            data-testid={`button-preview-${doc.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {doc.status === "blocked" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSanitize(doc.id)}
                              disabled={actionLoading === `sanitize-${doc.id}`}
                              data-testid={`button-sanitize-${doc.id}`}
                            >
                              {actionLoading === `sanitize-${doc.id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Shield className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirmDoc(doc.id)}
                            disabled={actionLoading === `delete-${doc.id}`}
                            data-testid={`button-delete-doc-${doc.id}`}
                          >
                            {actionLoading === `delete-${doc.id}` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Upload className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-1">{t("project.noDocumentsYet")}</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {t("project.uploadToStart")}
                </p>
                <Button onClick={() => fileInputRef.current?.click()} data-testid="button-upload-first">
                  <Upload className="w-4 h-4 mr-2" />
                  {t("project.uploadFiles")}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );

  const renderPhases = () => (
    <div className="space-y-4" data-testid="section-phases">
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
        <Card className="lg:self-start">
          <CardContent className="p-3">
            <PhaseNav
              currentPhase={projectCurrentPhase}
              completedPhases={completedPhases}
              selectedPhase={selectedPhase}
              onSelectPhase={setSelectedPhase}
            />
          </CardContent>
        </Card>
        <div>
          {selectedPhase !== null ? (
            <PhaseWorkspace
              phaseId={selectedPhase}
              completedPhases={completedPhases}
              currentPhase={projectCurrentPhase}
              artifacts={outputs || []}
              jobs={jobsList || []}
              onRunPhase={handleRunPhase}
              onViewArtifact={(a) => setViewingArtifact(a)}
              runningJob={phaseRunning}
              tenantSlug={tenantSlug!}
              projectId={projectId!}
            />
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-1" data-testid="text-select-phase">{t("project.selectAPhase")}</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {t("project.selectAPhaseDesc")}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );

  const renderOutputs = () => (
    <div className="space-y-4" data-testid="section-outputs">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold">{t("project.outputsAndReports")}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={outputPhaseFilter} onValueChange={setOutputPhaseFilter}>
            <SelectTrigger className="w-36" data-testid="select-output-phase-filter">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue placeholder={t("project.filterByPhase")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("project.allPhases")}</SelectItem>
              {PHASES.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  P{p.id}: {t(`phases.phaseShort${p.id}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {outputs && outputs.length > 0 && (
        <div className="space-y-4" data-testid="outputs-dashboard">
          <MetricGrid metrics={outputsDashboardMetrics} columns={4} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BarChartPanel
              title={t("project.artifactsByPhase")}
              subtitle={t("project.completedActiveLocked")}
              data={phaseProgressChartData}
              layout="vertical"
              valueFormatter={(v) => String(v)}
            />

            <Card data-testid="card-phase-summaries">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold" data-testid="text-phase-summaries-title">{t("project.phaseSummaries")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {perPhaseArtifactSummaries.length > 0 ? (
                  perPhaseArtifactSummaries.map((entry) => (
                    <div
                      key={entry.phaseId}
                      className="flex items-start justify-between gap-3 p-3 rounded-md bg-muted/40"
                      data-testid={`phase-summary-${entry.phaseId}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{entry.phaseName}</span>
                          <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
                            {entry.artifacts.length} artifact{entry.artifacts.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        {entry.keyMetrics.length > 0 && (
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            {entry.keyMetrics.map((m) => (
                              <span key={m.label} className="text-xs text-muted-foreground">
                                <span className="font-medium">{m.label}:</span> {m.value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <TrendingUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">{t("project.noSummaries")}</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Separator />
        </div>
      )}

      <ReportGenerator
        tenantSlug={tenantSlug!}
        projectId={projectId!}
        projectName={project?.name || "export"}
        hasOutputs={(outputs?.length || 0) > 0}
      />

      {outputs && outputs.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedOutputs).map(([groupName, groupArtifacts]) => (
            <div key={groupName} data-testid={`output-group-${groupName}`}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">{groupName}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {groupArtifacts.map((artifact) => (
                  <OutputCard
                    key={artifact.id}
                    artifact={artifact}
                    tenantSlug={tenantSlug}
                    projectId={projectId}
                    onView={(a) => setViewingArtifact(a)}
                    onDownload={(a) => handleExport("json")}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1" data-testid="text-no-outputs">{t("project.noOutputsYet")}</h3>
            <p className="text-muted-foreground text-sm">
              {t("project.noOutputsDesc")}
            </p>
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{t("project.factsAndEvidence")}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32" data-testid="select-fact-status-filter">
              <SelectValue placeholder={t("common.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("project.allStatus")}</SelectItem>
              <SelectItem value="proposed">{t("project.proposed")}</SelectItem>
              <SelectItem value="approved">{t("common.approved")}</SelectItem>
              <SelectItem value="rejected">{t("common.rejected")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32" data-testid="select-fact-type-filter">
              <SelectValue placeholder={t("common.type")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("project.allTypes")}</SelectItem>
              <SelectItem value="numeric">{t("project.numeric")}</SelectItem>
              <SelectItem value="textual">{t("project.textual")}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 min-w-[180px]">
            <span className="text-xs text-muted-foreground whitespace-nowrap">{t("project.minConfidence")}</span>
            <Slider
              value={[minConfidence * 100]}
              onValueChange={([v]) => setMinConfidence(v / 100)}
              max={100}
              step={5}
              className="w-24"
              data-testid="slider-confidence"
            />
            <span className="text-xs font-medium w-8" data-testid="text-min-confidence">{(minConfidence * 100).toFixed(0)}%</span>
          </div>
        </div>

        {selectedFacts.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">{t("project.nSelected", { count: selectedFacts.size })}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const proposedIds = filteredFacts.filter((f) => f.status === "proposed").map((f) => f.id);
                setSelectedFacts(new Set(proposedIds));
              }}
              data-testid="button-select-all-proposed-facts"
            >
              <CheckSquare className="w-4 h-4 mr-2" />
              {t("project.selectAllProposed")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedFacts(new Set())}
              data-testid="button-deselect-all-facts"
            >
              {t("common.clearSelection")}
            </Button>
            <Button
              size="sm"
              onClick={handleBulkApproveFacts}
              disabled={bulkLoading === "bulk-approve"}
              data-testid="button-bulk-approve-facts"
            >
              {bulkLoading === "bulk-approve" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              {t("common.approveSelected")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkRejectFacts}
              disabled={bulkLoading === "bulk-reject"}
              data-testid="button-bulk-reject-facts"
            >
              {bulkLoading === "bulk-reject" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              {t("common.rejectSelected")}
            </Button>
          </div>
        )}

        {loadingFacts ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : filteredFacts.length > 0 ? (
          <div className="space-y-2">
            {filteredFacts.map((fact) => {
              const StatusIcon = factStatusIcons[fact.status] || Clock;
              const statusColor =
                fact.status === "approved"
                  ? "text-green-600 dark:text-green-400"
                  : fact.status === "rejected"
                    ? "text-red-600 dark:text-red-400"
                    : "text-yellow-600 dark:text-yellow-400";

              return (
                <Card key={fact.id} data-testid={`card-fact-${fact.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Checkbox
                          checked={selectedFacts.has(fact.id)}
                          onCheckedChange={() => toggleFactSelection(fact.id)}
                          data-testid={`checkbox-fact-${fact.id}`}
                          className="flex-shrink-0 mt-0.5"
                        />
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => openEvidenceDrawer(fact)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <StatusIcon className={`w-4 h-4 ${statusColor}`} />
                          <span className="font-medium text-sm truncate">{fact.key}</span>
                          <Badge variant="secondary" className="text-xs">{fact.factType}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {typeof fact.valueJson === "object"
                            ? JSON.stringify(fact.valueJson)
                            : String(fact.valueJson)}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          {fact.unit && (
                            <span className="text-xs text-muted-foreground">{t("project.unit")}: {fact.unit}</span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {t("evidence.confidence")}: {((fact.confidence || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {fact.status === "proposed" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleApproveFact(fact.id)}
                              disabled={actionLoading === `approve-${fact.id}`}
                              data-testid={`button-approve-${fact.id}`}
                            >
                              {actionLoading === `approve-${fact.id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                              ) : (
                                <Check className="w-4 h-4 text-green-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRejectFact(fact.id)}
                              disabled={actionLoading === `reject-${fact.id}`}
                              data-testid={`button-reject-${fact.id}`}
                            >
                              {actionLoading === `reject-${fact.id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                              ) : (
                                <X className="w-4 h-4 text-red-600" />
                              )}
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingFact(fact);
                            setEditValue(JSON.stringify(fact.valueJson));
                            setEditUnit(fact.unit || "");
                            setEditConfidence(String(fact.confidence || 0.5));
                          }}
                          data-testid={`button-edit-${fact.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEvidenceDrawer(fact)}
                          data-testid={`button-evidence-${fact.id}`}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <FileSearch className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-1">{t("project.noFactsFound")}</h3>
              <p className="text-muted-foreground text-sm">
                {t("project.noFactsDesc")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  const renderRunsLogs = () => {
    const jobs = runsData || jobsList || [];
    return (
      <div className="space-y-4" data-testid="section-runs-logs">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">{t("project.runsAndLogs")}</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId, "runs"] });
              queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId, "jobs"] });
            }}
            data-testid="button-refresh-runs"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("project.refresh")}
          </Button>
        </div>

        {jobs.length > 0 ? (
          <div className="space-y-2">
            {jobs.map((job: any) => {
              const isExpanded = expandedJobs[job.id];
              const steps = job.steps || [];
              return (
                <Card key={job.id} data-testid={`card-run-${job.id}`}>
                  <CardContent className="p-4">
                    <div
                      className="flex items-center justify-between gap-4 cursor-pointer"
                      onClick={() => setExpandedJobs(prev => ({ ...prev, [job.id]: !prev[job.id] }))}
                      data-testid={`button-expand-run-${job.id}`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-xs ${jobStatusColors[job.status] || ""}`}>
                          {job.status}
                        </Badge>
                        <span className="text-sm font-medium">{job.type}</span>
                        {job.progress && (
                          <span className="text-xs text-muted-foreground">{job.progress}%</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {new Date(job.createdAt).toLocaleString()}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                    {job.errorMessage && (
                      <p className="text-xs text-red-500 mt-2">{job.errorMessage}</p>
                    )}
                    {isExpanded && steps.length > 0 && (
                      <div className="mt-3 space-y-1.5 pl-4 border-l-2 border-muted">
                        {steps.map((step: any, idx: number) => (
                          <div key={step.id || idx} className="flex items-center gap-2 text-xs" data-testid={`step-${step.id || idx}`}>
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                              step.status === "completed" || step.status === "succeeded"
                                ? "bg-green-500 text-white"
                                : step.status === "running"
                                  ? "bg-blue-500 text-white"
                                  : step.status === "failed"
                                    ? "bg-red-500 text-white"
                                    : "bg-muted text-muted-foreground"
                            }`}>
                              {step.status === "completed" || step.status === "succeeded" ? (
                                <Check className="w-2.5 h-2.5" />
                              ) : step.status === "failed" ? (
                                <X className="w-2.5 h-2.5" />
                              ) : step.status === "running" ? (
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <Clock className="w-2.5 h-2.5" />
                              )}
                            </span>
                            <span className="font-medium">{step.step || step.name || `Step ${idx + 1}`}</span>
                            <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">{step.status}</Badge>
                            {step.errorMessage && (
                              <span className="text-red-500 truncate">{step.errorMessage}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {isExpanded && steps.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-3 pl-4">{t("project.noStepDetails")}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Activity className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-1" data-testid="text-no-runs">{t("project.noRunsYet")}</h3>
              <p className="text-muted-foreground text-sm">
                {t("project.noRunsDesc")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderAudit = () => (
    <div className="space-y-4" data-testid="section-audit">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold">{t("project.auditLog")}</h2>
        <div className="flex items-center gap-2">
          <Select value={auditActionFilter} onValueChange={setAuditActionFilter}>
            <SelectTrigger className="w-40" data-testid="select-audit-filter">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue placeholder={t("project.filterByAction")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("project.allActions")}</SelectItem>
              {auditActions.map((action: string) => (
                <SelectItem key={action} value={action}>{action}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/t", tenantSlug, "projects", projectId, "audit"] })}
            data-testid="button-refresh-audit"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("project.refresh")}
          </Button>
        </div>
      </div>

      {filteredAuditEvents.length > 0 ? (
        <div className="space-y-2">
          {filteredAuditEvents.map((event: any) => (
            <Card key={event.id} data-testid={`card-audit-${event.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">{event.action}</Badge>
                    <span className="text-sm">{event.entityType}</span>
                    {event.entityId && (
                      <span className="text-xs text-muted-foreground font-mono">{event.entityId.slice(0, 8)}...</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.createdAt).toLocaleString()}
                  </span>
                </div>
                {event.userId && (
                  <p className="text-xs text-muted-foreground mt-1">{t("project.userLabel")}: {event.userId.slice(0, 8)}...</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1" data-testid="text-no-audit">{t("project.noAuditEvents")}</h3>
            <p className="text-muted-foreground text-sm">
              {t("project.noAuditDesc")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-4" data-testid="section-settings">
      <h2 className="text-lg font-semibold">{t("project.projectSettings")}</h2>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">{t("project.projectName")}</Label>
            <p className="text-sm font-medium" data-testid="text-project-name">{project?.name}</p>
          </div>
          <Separator />
          <div>
            <Label className="text-xs text-muted-foreground">{t("project.description")}</Label>
            <p className="text-sm" data-testid="text-project-description">{project?.description || t("project.noDescription")}</p>
          </div>
          <Separator />
          <div>
            <Label className="text-xs text-muted-foreground">{t("project.client")}</Label>
            <p className="text-sm" data-testid="text-project-client">{project?.clientName || t("project.notSpecified")}</p>
          </div>
          <Separator />
          <div>
            <Label className="text-xs text-muted-foreground">{t("project.outputLanguage")}</Label>
            <p className="text-sm" data-testid="text-project-language">{project?.outputLanguage}</p>
          </div>
          <Separator />
          <div>
            <Label className="text-xs text-muted-foreground">{t("common.status")}</Label>
            <Badge variant="secondary" className="text-xs mt-1" data-testid="badge-project-status">{project?.status}</Badge>
          </div>
          <Separator />
          <div>
            <Label className="text-xs text-muted-foreground">{t("project.currentPhase")}</Label>
            <p className="text-sm" data-testid="text-project-phase">{t("phases.phaseN", { id: projectCurrentPhase })}: {t(`phases.phaseShort${projectCurrentPhase}`, { defaultValue: t("common.unknown") })}</p>
          </div>
          <Separator />
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => handleExport("json")} data-testid="button-export-json">
              <Download className="w-4 h-4 mr-2" />
              {t("project.exportJson")}
            </Button>
            <Button variant="outline" onClick={() => handleExport("md")} data-testid="button-export-md">
              <Download className="w-4 h-4 mr-2" />
              {t("project.exportMarkdown")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="flex items-center justify-between gap-4 px-6 h-14">
          <div className="flex items-center gap-3">
            <Link href={companyId ? `/t/${tenantSlug}/c/${companyId}` : `/t/${tenantSlug}`}>
              <Button variant="ghost" size="icon" data-testid="button-back-workspace">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold text-sm leading-tight">{project?.name}</h1>
              <ProjectBreadcrumbs
                tenantSlug={tenantSlug!}
                companyName={company?.name}
                companyId={companyId}
                projectName={project?.name}
                projectId={projectId}
                currentSection={sectionLabel}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <Globe className="w-3 h-3 mr-1" />
              {project?.outputLanguage}
            </Badge>
            <Button variant="outline" size="sm" onClick={logout} data-testid="button-logout">
              {t("common.signOut")}
            </Button>
          </div>
        </div>
        <div className="px-6 pb-2">
          <PhaseProgressStepper
            currentPhase={projectCurrentPhase}
            completedPhases={completedPhases}
            gatePassedPhases={gatePassedPhases}
            onPhaseClick={(phaseId) => {
              setSelectedPhase(phaseId);
              setActiveSection("phases");
            }}
          />
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-112px)]">
        <ProjectSideNav
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          docCount={docs?.length}
          factCount={factsList?.length}
          outputCount={outputs?.length}
          jobCount={jobsList?.length}
        />

        <main className="flex-1 p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>

      <Dialog open={previewDoc !== null} onOpenChange={(o) => !o && setPreviewDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              {t("project.safePreview")}
              <Badge variant="secondary" className="text-xs">{t("project.redacted")}</Badge>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            {previewLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">{t("project.loadingPreview")}</span>
              </div>
            ) : previewData ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{previewData.filename}</span>
                  <Badge variant="outline" className="text-xs">{previewData.kind}</Badge>
                </div>
                <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/50 p-4 rounded-md" data-testid="text-preview-content">
                  {previewData.preview}
                </pre>
                {previewData.truncated && (
                  <p className="text-xs text-muted-foreground mt-2">{t("project.contentTruncated")}</p>
                )}
              </div>
            ) : null}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <EvidenceDrawer
        fact={selectedFact}
        open={evidenceDrawerOpen}
        onClose={() => {
          setEvidenceDrawerOpen(false);
          setSelectedFact(null);
        }}
      />

      <AlertDialog open={deleteConfirmDoc !== null} onOpenChange={(o) => !o && setDeleteConfirmDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("project.deleteDocument")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("project.deleteDocumentDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmDoc && handleDeleteDoc(deleteConfirmDoc)}
              disabled={actionLoading?.startsWith("delete-") || false}
              data-testid="button-confirm-delete"
            >
              {actionLoading?.startsWith("delete-") ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteConfirm} onOpenChange={(o) => !o && setBulkDeleteConfirm(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("project.deleteBulkTitle", { count: selectedDocs.size })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("project.deleteBulkDesc", { count: selectedDocs.size })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-delete">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteDocs}
              disabled={bulkLoading === "bulk-delete-docs"}
              data-testid="button-confirm-bulk-delete"
            >
              {bulkLoading === "bulk-delete-docs" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {t("project.deleteAll")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ArtifactDetailViewer
        artifact={viewingArtifact}
        open={viewingArtifact !== null}
        onOpenChange={(open) => { if (!open) setViewingArtifact(null); }}
      />

      <Dialog open={editingFact !== null} onOpenChange={(o) => !o && setEditingFact(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("project.editFact")}</DialogTitle>
          </DialogHeader>
          {editingFact && (
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>{t("project.valueJson")}</Label>
                <Input
                  data-testid="input-edit-value"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("project.unit")}</Label>
                <Input
                  data-testid="input-edit-unit"
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("project.confidenceLabel")}</Label>
                <Input
                  data-testid="input-edit-confidence"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={editConfidence}
                  onChange={(e) => setEditConfidence(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleEditFact} data-testid="button-save-edit">
                {t("project.saveChanges")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
