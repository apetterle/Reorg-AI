import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Lightbulb, Package, FolderOpen, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SearchResults {
  documents: { id: string; filename: string; projectId: string; status: string }[];
  facts: { id: string; key: string; factType: string; projectId: string; status: string }[];
  artifacts: { id: string; type: string; phaseId: number | null; projectId: string }[];
  projects: { id: string; name: string; description: string | null; status: string }[];
}

export function GlobalSearch({ tenantSlug }: { tenantSlug: string }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/search?q=${encodeURIComponent(q)}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setIsOpen(true);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  }, [doSearch]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalResults = results
    ? results.documents.length + results.facts.length + results.artifacts.length + results.projects.length
    : 0;

  const navigateTo = (path: string) => {
    setIsOpen(false);
    setQuery("");
    setResults(null);
    navigate(path);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md" data-testid="global-search">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          data-testid="input-global-search"
          placeholder={t("search.placeholder")}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results && setIsOpen(true)}
          className="pl-9 pr-8"
        />
        {query && (
          <button
            data-testid="button-clear-search"
            onClick={() => { setQuery(""); setResults(null); setIsOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && results && (
        <div className="absolute top-full mt-1 w-full bg-popover border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto" data-testid="search-results-dropdown">
          {totalResults === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">{t("search.noResults")}</div>
          ) : (
            <>
              {results.projects.length > 0 && (
                <ResultSection title={t("search.projects")} icon={<FolderOpen className="h-3.5 w-3.5" />}>
                  {results.projects.map((p) => (
                    <ResultItem
                      key={p.id}
                      testId={`search-result-project-${p.id}`}
                      onClick={() => navigateTo(`/t/${tenantSlug}/projects/${p.id}`)}
                      label={p.name}
                      badge={p.status}
                    />
                  ))}
                </ResultSection>
              )}
              {results.documents.length > 0 && (
                <ResultSection title={t("search.documents")} icon={<FileText className="h-3.5 w-3.5" />}>
                  {results.documents.map((d) => (
                    <ResultItem
                      key={d.id}
                      testId={`search-result-doc-${d.id}`}
                      onClick={() => navigateTo(`/t/${tenantSlug}/projects/${d.projectId}`)}
                      label={d.filename}
                      badge={d.status}
                    />
                  ))}
                </ResultSection>
              )}
              {results.facts.length > 0 && (
                <ResultSection title={t("search.facts")} icon={<Lightbulb className="h-3.5 w-3.5" />}>
                  {results.facts.map((f) => (
                    <ResultItem
                      key={f.id}
                      testId={`search-result-fact-${f.id}`}
                      onClick={() => navigateTo(`/t/${tenantSlug}/projects/${f.projectId}`)}
                      label={f.key}
                      badge={f.status}
                    />
                  ))}
                </ResultSection>
              )}
              {results.artifacts.length > 0 && (
                <ResultSection title={t("search.artifacts")} icon={<Package className="h-3.5 w-3.5" />}>
                  {results.artifacts.map((a) => (
                    <ResultItem
                      key={a.id}
                      testId={`search-result-artifact-${a.id}`}
                      onClick={() => navigateTo(`/t/${tenantSlug}/projects/${a.projectId}`)}
                      label={a.type}
                      badge={a.phaseId !== null ? `Phase ${a.phaseId}` : undefined}
                    />
                  ))}
                </ResultSection>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ResultSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function ResultItem({ label, badge, testId, onClick }: { label: string; badge?: string; testId: string; onClick: () => void }) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between gap-2"
    >
      <span className="truncate">{label}</span>
      {badge && <Badge variant="secondary" className="text-[10px] shrink-0">{badge}</Badge>}
    </button>
  );
}
