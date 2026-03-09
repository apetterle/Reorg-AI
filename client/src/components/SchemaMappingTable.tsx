import { useState, useMemo, useCallback, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Save, FolderOpen, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

const FIELD_TYPES = ["text", "number", "date", "currency", "percentage", "categorical"] as const;
type FieldType = typeof FIELD_TYPES[number];

const UNIT_TYPES = ["none", "%", "$", "R$", "minutes", "hours", "days", "count", "FTE", "kg", "units"] as const;
type UnitType = typeof UNIT_TYPES[number];

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  fieldType: FieldType;
  included: boolean;
  unit: UnitType;
}

interface MappingProfile {
  name: string;
  mappings: Record<string, { targetField: string; unit: string }>;
}

interface SchemaMappingTableProps {
  headers: string[];
  sampleRow?: Record<string, any>;
  onMappingChange: (mappings: ColumnMapping[]) => void;
  initialMappings?: ColumnMapping[];
}

const PROFILES_STORAGE_KEY = "reorg-mapping-profiles";

function loadProfiles(): MappingProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveProfiles(profiles: MappingProfile[]) {
  localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
}

function guessUnit(header: string, fieldType: FieldType): UnitType {
  const h = header.toLowerCase();
  if (fieldType === "percentage" || /percent|pct|%/.test(h)) return "%";
  if (fieldType === "currency" || /price|cost|valor|custo|receita|revenue|salary|salario|remuneracao/.test(h)) return "$";
  if (/minutes|min/.test(h)) return "minutes";
  if (/hours|hrs/.test(h)) return "hours";
  if (/days|dias/.test(h)) return "days";
  if (/count|qty|quantity|headcount|fte/.test(h)) return "count";
  return "none";
}

function guessFieldType(header: string, sampleValue?: any): FieldType {
  const h = header.toLowerCase();
  if (/date|data|period|ano|mes|year|month/.test(h)) return "date";
  if (/percent|pct|%/.test(h)) return "percentage";
  if (/price|cost|valor|custo|receita|revenue|salary|salario|remuneracao/.test(h)) return "currency";
  if (/count|qty|amount|total|num|quantity|headcount|fte/.test(h)) return "number";
  if (/category|type|status|level|dept|department|area|region/.test(h)) return "categorical";
  if (sampleValue !== undefined && sampleValue !== null) {
    const v = String(sampleValue).trim();
    if (/^\d+([.,]\d+)?$/.test(v)) return "number";
    if (/^\d{2}[\/\-]\d{2}[\/\-]\d{2,4}$/.test(v)) return "date";
  }
  return "text";
}

function normalizeFieldName(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
}

export function SchemaMappingTable({
  headers,
  sampleRow,
  onMappingChange,
  initialMappings,
}: SchemaMappingTableProps) {
  const { t } = useTranslation();
  const [mappings, setMappings] = useState<ColumnMapping[]>(() => {
    if (initialMappings && initialMappings.length > 0) return initialMappings;
    return headers.map((h) => {
      const ft = guessFieldType(h, sampleRow?.[h]);
      return {
        sourceColumn: h,
        targetField: normalizeFieldName(h),
        fieldType: ft,
        included: true,
        unit: guessUnit(h, ft),
      };
    });
  });

  const [profiles, setProfiles] = useState<MappingProfile[]>(loadProfiles);
  const [profileName, setProfileName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  useEffect(() => {
    onMappingChange(mappings);
  }, [mappings, onMappingChange]);

  const conflicts = useMemo(() => {
    const included = mappings.filter((m) => m.included);
    const fieldCount: Record<string, number> = {};
    for (const m of included) {
      fieldCount[m.targetField] = (fieldCount[m.targetField] || 0) + 1;
    }
    const duplicates = new Set<string>();
    for (const [field, count] of Object.entries(fieldCount)) {
      if (count > 1) duplicates.add(field);
    }
    return duplicates;
  }, [mappings]);

  const updateMapping = useCallback(
    (idx: number, patch: Partial<ColumnMapping>) => {
      setMappings((prev) =>
        prev.map((m, i) => (i === idx ? { ...m, ...patch } : m))
      );
    },
    []
  );

  const handleSaveProfile = useCallback(() => {
    if (!profileName.trim()) return;
    const profileMappings: Record<string, { targetField: string; unit: string }> = {};
    for (const m of mappings) {
      profileMappings[m.sourceColumn] = { targetField: m.targetField, unit: m.unit };
    }
    const newProfile: MappingProfile = { name: profileName.trim(), mappings: profileMappings };
    const updated = [...profiles.filter((p) => p.name !== newProfile.name), newProfile];
    setProfiles(updated);
    saveProfiles(updated);
    setProfileName("");
    setShowSaveInput(false);
  }, [profileName, mappings, profiles]);

  const handleLoadProfile = useCallback(
    (profile: MappingProfile) => {
      setMappings((prev) =>
        prev.map((m) => {
          const saved = profile.mappings[m.sourceColumn];
          if (saved) {
            return { ...m, targetField: saved.targetField, unit: (saved.unit as UnitType) || "none" };
          }
          return m;
        })
      );
    },
    []
  );

  const handleDeleteProfile = useCallback(
    (name: string) => {
      const updated = profiles.filter((p) => p.name !== name);
      setProfiles(updated);
      saveProfiles(updated);
    },
    [profiles]
  );

  return (
    <div className="space-y-3" data-testid="schema-mapping-table">
      <div className="flex items-center gap-2 flex-wrap">
        {!showSaveInput ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSaveInput(true)}
            data-testid="button-save-profile-toggle"
          >
            <Save className="w-3 h-3 mr-1" />
            {t("wizard.saveProfile")}
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder={t("wizard.profileNamePlaceholder")}
              className="text-xs border rounded-md px-2 py-1 bg-background border-border"
              data-testid="input-profile-name"
            />
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveProfile}
              disabled={!profileName.trim()}
              data-testid="button-save-profile-confirm"
            >
              {t("common.save")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowSaveInput(false); setProfileName(""); }}
              data-testid="button-save-profile-cancel"
            >
              {t("common.cancel")}
            </Button>
          </div>
        )}

        {profiles.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <FolderOpen className="w-3 h-3" />
              {t("wizard.loadLabel")}
            </span>
            {profiles.map((p) => (
              <div key={p.name} className="flex items-center gap-0.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLoadProfile(p)}
                  data-testid={`button-load-profile-${p.name}`}
                >
                  {p.name}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteProfile(p.name)}
                  data-testid={`button-delete-profile-${p.name}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {conflicts.size > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20">
          <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            {t("wizard.duplicateTargets", { fields: Array.from(conflicts).join(", ") })}
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2 font-medium text-xs text-muted-foreground w-10">{t("wizard.include")}</th>
              <th className="text-left py-2 px-2 font-medium text-xs text-muted-foreground">{t("wizard.sourceColumn")}</th>
              <th className="text-left py-2 px-2 font-medium text-xs text-muted-foreground">{t("wizard.sample")}</th>
              <th className="text-left py-2 px-2 font-medium text-xs text-muted-foreground">{t("wizard.targetField")}</th>
              <th className="text-left py-2 px-2 font-medium text-xs text-muted-foreground">{t("common.type")}</th>
              <th className="text-left py-2 px-2 font-medium text-xs text-muted-foreground">{t("artifacts.unit")}</th>
              <th className="text-left py-2 px-2 font-medium text-xs text-muted-foreground w-10">{t("common.status")}</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((m, idx) => {
              const hasDuplicate = m.included && conflicts.has(m.targetField);
              return (
                <tr
                  key={idx}
                  className={`border-b ${!m.included ? "opacity-50" : ""}`}
                  data-testid={`mapping-row-${idx}`}
                >
                  <td className="py-2 px-2">
                    <Checkbox
                      checked={m.included}
                      onCheckedChange={(checked) =>
                        updateMapping(idx, { included: !!checked })
                      }
                      data-testid={`checkbox-include-${idx}`}
                    />
                  </td>
                  <td className="py-2 px-2">
                    <span className="font-medium text-xs">{m.sourceColumn}</span>
                  </td>
                  <td className="py-2 px-2">
                    <span className="text-xs text-muted-foreground truncate max-w-[120px] inline-block">
                      {sampleRow?.[m.sourceColumn] !== undefined
                        ? String(sampleRow[m.sourceColumn])
                        : "-"}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={m.targetField}
                      onChange={(e) => updateMapping(idx, { targetField: e.target.value })}
                      className={`text-xs border rounded-md px-2 py-1 w-full bg-background ${
                        hasDuplicate ? "border-yellow-500" : "border-border"
                      }`}
                      disabled={!m.included}
                      data-testid={`input-target-field-${idx}`}
                    />
                  </td>
                  <td className="py-2 px-2">
                    <Select
                      value={m.fieldType}
                      onValueChange={(val) => updateMapping(idx, { fieldType: val as FieldType })}
                      disabled={!m.included}
                    >
                      <SelectTrigger className="text-xs" data-testid={`select-field-type-${idx}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map((ft) => (
                          <SelectItem key={ft} value={ft}>{ft}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-2 px-2">
                    <Select
                      value={m.unit}
                      onValueChange={(val) => updateMapping(idx, { unit: val as UnitType })}
                      disabled={!m.included}
                    >
                      <SelectTrigger className="text-xs" data-testid={`select-unit-${idx}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_TYPES.map((u) => (
                          <SelectItem key={u} value={u}>{u === "none" ? "—" : u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-2 px-2">
                    {hasDuplicate ? (
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    ) : m.included ? (
                      <Badge variant="secondary" className="text-[10px]">{t("wizard.ok")}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">{t("wizard.skip")}</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("wizard.nOfMIncluded", { included: mappings.filter((m) => m.included).length, total: mappings.length })}
      </p>
    </div>
  );
}
