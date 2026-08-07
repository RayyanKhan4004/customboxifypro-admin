"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DownloadSimple, UploadSimple } from "@phosphor-icons/react";
import { useRef, useState } from "react";

import {
  Badge,
  Button,
  Card,
  Field,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Table,
  ToastHost,
  useToast,
} from "@/components/ui";
import {
  apiGet,
  apiPost,
  apiUpload,
  downloadCsv,
  type QueryString,
  qs,
} from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { BulkImport, Paged } from "@/lib/types";

type ImportStatus = BulkImport["status"];

const statusTone: Record<ImportStatus, "muted" | "info" | "success" | "danger" | "warning"> = {
  queued: "warning",
  processing: "info",
  completed: "success",
  failed: "danger",
  cancelled: "muted",
};

interface ImportErrors {
  errors: { row?: number; field?: string; code: string; message: string }[];
  errorCount: number;
  successCount: number;
}

export default function BulkImportsPage() {
  const queryClient = useQueryClient();
  const { toast, show, dismiss } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"draft" | "all-or-nothing">("draft");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validateResult, setValidateResult] = useState<{
    valid: boolean;
    totalRows: number;
    errorCount: number;
  } | null>(null);
  const [errorsFor, setErrorsFor] = useState<BulkImport | null>(null);

  const imports = useQuery({
    queryKey: ["bulk-imports", page, statusFilter],
    queryFn: () =>
      apiGet<Paged<BulkImport>>(
        `/admin/bulk-imports${qs({ page, limit: 20, status: statusFilter } as QueryString)}`,
      ),
    refetchInterval: (query) => {
      const data = query.state.data as Paged<BulkImport> | undefined;
      const active = data?.data?.some(
        (item) => item.status === "queued" || item.status === "processing",
      );
      return active ? 3000 : false;
    },
  });

  const errorsQuery = useQuery({
    queryKey: ["bulk-import-errors", errorsFor?._id],
    queryFn: () => apiGet<ImportErrors>(`/admin/bulk-imports/${errorsFor?._id}/errors`),
    enabled: Boolean(errorsFor),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["bulk-imports"] });

  const retryMutation = useMutation({
    mutationFn: (id: string) => apiPost(`/admin/bulk-imports/${id}/retry`),
    onSuccess: () => {
      invalidate();
      show.success("Import re-queued.");
    },
    onError: (err) => show.error(err instanceof Error ? err.message : "Retry failed."),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiPost(`/admin/bulk-imports/${id}/cancel`),
    onSuccess: () => {
      invalidate();
      show.success("Import cancelled.");
    },
    onError: (err) => show.error(err instanceof Error ? err.message : "Cancel failed."),
  });

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile) return;
    setUploading(true);
    setValidateResult(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("mode", mode);
      await apiUpload("/admin/bulk-imports", formData);
      show.success("Import queued.");
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = "";
      invalidate();
    } catch (err) {
      show.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleValidate = async () => {
    if (!selectedFile) return;
    setValidating(true);
    setValidateResult(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const result = await apiUpload<{
        valid: boolean;
        totalRows: number;
        errorCount: number;
      }>("/admin/bulk-imports/validate", formData);
      setValidateResult(result);
    } catch (err) {
      show.error(err instanceof Error ? err.message : "Validation failed.");
    } finally {
      setValidating(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Bulk imports"
        description="Import products from a CSV file. Download the template to get the right columns."
        actions={
          <Button variant="outline" onClick={() => downloadCsv("/admin/bulk-imports/template", "products-import-template.csv")}>
            <DownloadSimple size={16} />
            Download template
          </Button>
        }
      />

      <Card className="mb-6 p-5">
        <form onSubmit={handleUpload} className="flex flex-wrap items-end gap-4">
          <Field label="CSV file">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls,.zip"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              className="text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-sm file:text-foreground hover:file:bg-secondary"
            />
          </Field>
          <Field label="Mode">
            <Select
              value={mode}
              onChange={(v) => setMode(v as "draft" | "all-or-nothing")}
              options={[
                { value: "draft", label: "Draft (import valid rows)" },
                { value: "all-or-nothing", label: "All or nothing" },
              ]}
            />
          </Field>
          <Button
            type="button"
            variant="outline"
            disabled={!selectedFile || validating}
            onClick={handleValidate}
          >
            {validating ? <Spinner /> : null}
            Validate
          </Button>
          <Button type="submit" disabled={!selectedFile || uploading}>
            {uploading ? <Spinner /> : null}
            <UploadSimple size={16} />
            Import
          </Button>
        </form>
        {validateResult && (
          <div
            className={
              validateResult.valid
                ? "mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"
                : "mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300"
            }
          >
            {validateResult.valid
              ? `Valid — ${validateResult.totalRows} rows look good.`
              : `Invalid — ${validateResult.errorCount} of ${validateResult.totalRows} rows have errors. Fix them before importing.`}
          </div>
        )}
      </Card>

      <div className="mb-4 flex items-center gap-2">
        <Select
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
          className="w-44"
          options={[
            { value: "", label: "All statuses" },
            { value: "queued", label: "Queued" },
            { value: "processing", label: "Processing" },
            { value: "completed", label: "Completed" },
            { value: "failed", label: "Failed" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
      </div>

      <Table
        headers={["File", "Mode", "Status", "Progress", "Result", "Created", ""]}
        loading={imports.isLoading}
        empty="No imports yet."
      >
        {(imports.data?.data ?? []).map((importItem) => (
          <tr key={importItem._id} className="hover:bg-muted/30">
            <td className="max-w-[220px] truncate px-4 py-2.5 font-medium">
              {importItem.fileName}
            </td>
            <td className="px-4 py-2.5 text-muted-foreground">{importItem.mode}</td>
            <td className="px-4 py-2.5">
              <Badge tone={statusTone[importItem.status]}>{importItem.status}</Badge>
            </td>
            <td className="px-4 py-2.5 text-muted-foreground">
              {importItem.totalRows > 0
                ? `${importItem.processedRows} / ${importItem.totalRows}`
                : "—"}
            </td>
            <td className="px-4 py-2.5 text-muted-foreground">
              <span className="text-emerald-400">{importItem.successCount} ok</span>
              {importItem.errorCount > 0 && (
                <span className="ml-1 text-red-400">{importItem.errorCount} err</span>
              )}
            </td>
            <td className="px-4 py-2.5 text-muted-foreground">
              {formatDate(importItem.createdAt)}
            </td>
            <td className="px-2 py-2.5 text-right">
              <div className="flex items-center justify-end gap-1">
                {importItem.errorCount > 0 && (
                  <Button size="sm" variant="outline" onClick={() => setErrorsFor(importItem)}>
                    Errors
                  </Button>
                )}
                {importItem.errorCount > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      downloadCsv(`/admin/bulk-imports/${importItem._id}/error-file`, "import-errors.csv")
                    }
                  >
                    <DownloadSimple size={14} />
                  </Button>
                )}
                {(importItem.status === "queued" || importItem.status === "processing") && (
                  <Button size="sm" variant="outline" onClick={() => cancelMutation.mutate(importItem._id)}>
                    Cancel
                  </Button>
                )}
                {(importItem.status === "failed" || importItem.status === "cancelled") && (
                  <Button size="sm" variant="outline" onClick={() => retryMutation.mutate(importItem._id)}>
                    Retry
                  </Button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </Table>

      <Modal
        open={Boolean(errorsFor)}
        onClose={() => setErrorsFor(null)}
        title={`Errors · ${errorsFor?.fileName ?? ""}`}
        wide
      >
        {errorsQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {errorsQuery.data?.errorCount ?? 0} errors,{" "}
              {errorsQuery.data?.successCount ?? 0} succeeded.
            </p>
            <div className="max-h-[50vh] overflow-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Field</th>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(errorsQuery.data?.errors ?? []).map((error, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2">{error.row ?? "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs">{error.field ?? "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {error.code}
                      </td>
                      <td className="px-3 py-2">{error.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      <ToastHost toast={toast} dismiss={dismiss} />
    </div>
  );
}
