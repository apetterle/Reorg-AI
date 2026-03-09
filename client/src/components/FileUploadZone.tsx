import { useState, useRef, useCallback } from "react";
import { Upload, FileText, X, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const SUPPORTED_EXTENSIONS = [
  ".xlsx", ".xls", ".csv", ".pdf", ".docx", ".doc",
  ".pptx", ".ppt", ".txt", ".json", ".xml",
];
const MAX_FILE_SIZE = 50 * 1024 * 1024;

interface UploadedFile {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  documentId?: string;
}

interface FileUploadZoneProps {
  onFilesUploaded: (files: { file: File; documentId: string }[]) => void;
  uploadEndpoint: string;
  disabled?: boolean;
}

function isSupported(filename: string): boolean {
  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext);
}

export function FileUploadZone({ onFilesUploaded, uploadEndpoint, disabled }: FileUploadZoneProps) {
  const { t } = useTranslation();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles);
    const entries: UploadedFile[] = arr.map((file) => {
      if (!isSupported(file.name)) {
        return { file, status: "error" as const, error: t("wizard.unsupportedFile") };
      }
      if (file.size > MAX_FILE_SIZE) {
        return { file, status: "error" as const, error: t("wizard.fileTooLarge") };
      }
      return { file, status: "pending" as const };
    });
    setFiles((prev) => [...prev, ...entries]);
  }, [t]);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles, disabled]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
      }
      if (inputRef.current) inputRef.current.value = "";
    },
    [addFiles]
  );

  const uploadAll = useCallback(async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    const results: { file: File; documentId: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== "pending") continue;

      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: "uploading" as const } : f))
      );

      try {
        const formData = new FormData();
        formData.append("file", files[i].file);
        const res = await fetch(uploadEndpoint, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || t("wizard.uploadFailed"));
        }
        const doc = await res.json();
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "success" as const, documentId: doc.id } : f
          )
        );
        results.push({ file: files[i].file, documentId: doc.id });
      } catch (err: any) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "error" as const, error: err.message } : f
          )
        );
      }
    }

    setIsUploading(false);
    if (results.length > 0) {
      onFilesUploaded(results);
    }
  }, [files, uploadEndpoint, onFilesUploaded, t]);

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const successCount = files.filter((f) => f.status === "success").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  return (
    <div className="space-y-4" data-testid="file-upload-zone">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/20 hover-elevate",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        data-testid="dropzone"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleInputChange}
          accept={SUPPORTED_EXTENSIONS.join(",")}
          data-testid="input-file-upload-wizard"
        />
        <Upload className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="font-medium text-sm mb-1">
          {isDragOver ? t("wizard.dropFilesHere") : t("wizard.dragAndDrop")}
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          {t("wizard.browseSupports")}
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {t("wizard.filesSelected", { count: files.length })}
              {successCount > 0 && ` ${t("wizard.nUploaded", { count: successCount })}`}
              {errorCount > 0 && ` ${t("wizard.nFailed", { count: errorCount })}`}
            </p>
            {pendingCount > 0 && (
              <Button onClick={uploadAll} disabled={isUploading} data-testid="button-upload-all">
                {isUploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {t("wizard.uploadNFiles", { count: pendingCount })}
              </Button>
            )}
          </div>

          <div className="space-y-1">
            {files.map((f, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 rounded-md border p-2"
                data-testid={`upload-file-${idx}`}
              >
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{f.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(f.file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {f.status === "pending" && (
                    <Badge variant="secondary" className="text-xs">{t("common.pending")}</Badge>
                  )}
                  {f.status === "uploading" && (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  )}
                  {f.status === "success" && (
                    <Badge className="text-xs bg-green-500/10 text-green-700 dark:text-green-400">{t("wizard.uploaded")}</Badge>
                  )}
                  {f.status === "error" && (
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                      <span className="text-xs text-red-500 max-w-[120px] truncate">{f.error}</span>
                    </div>
                  )}
                  {(f.status === "pending" || f.status === "error") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                      data-testid={`button-remove-file-${idx}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
