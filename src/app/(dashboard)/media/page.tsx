"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilSimple, UploadSimple } from "@phosphor-icons/react";
import { useRef, useState } from "react";

import {
  Badge,
  Button,
  ConfirmDialog,
  Field,
  IconButton,
  Input,
  Modal,
  PageHeader,
  Pagination,
  Select,
  Spinner,
  Toggle,
  ToastHost,
  useToast,
} from "@/components/ui";
import { apiDelete, apiGet, apiPatch, qs } from "@/lib/api";
import { formatBytes, formatDate } from "@/lib/format";
import { uploadFile } from "@/lib/media-upload";
import type { MediaItem, Paged } from "@/lib/types";

const STATUS_TONE: Record<string, "default" | "success" | "warning" | "danger" | "info" | "muted"> = {
  pending: "warning",
  processing: "info",
  ready: "success",
  failed: "danger",
};

function typeIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType === "application/pdf") return "📄";
  return "📦";
}

export default function MediaPage() {
  const queryClient = useQueryClient();
  const { toast, show, dismiss } = useToast();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [editForm, setEditForm] = useState({ alt: "", order: 0, isMain: false });
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const media = useQuery({
    queryKey: ["media", page, status],
    queryFn: () =>
      apiGet<Paged<MediaItem>>(
        `/admin/media${qs({ page, limit: 24, status: status || undefined })}`,
      ),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["media"] });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      setUploading(true);
      try {
        for (const file of files) await uploadFile(file);
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      invalidate();
      show.success("Uploaded.");
    },
    onError: (err) => show.error(err instanceof Error ? err.message : "Upload failed."),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error("No media selected");
      return apiPatch(`/admin/media/${editing._id}`, { ...editForm, order: Number(editForm.order) });
    },
    onSuccess: () => {
      invalidate();
      setEditing(null);
      show.success("Media updated.");
    },
    onError: (err) => show.error(err instanceof Error ? err.message : "Update failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/media/${id}`),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      show.success("Media deleted.");
    },
    onError: (err) => {
      setDeleteTarget(null);
      show.error(err instanceof Error ? err.message : "Delete failed.");
    },
  });

  const openEdit = (item: MediaItem) => {
    setEditing(item);
    setEditForm({ alt: item.alt, order: item.order, isMain: item.isMain });
  };

  const items = media.data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Media library"
        description="Files uploaded to storage for products and content."
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                if (files.length) uploadMutation.mutate(files);
                event.target.value = "";
              }}
            />
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Spinner /> : <UploadSimple size={16} />}
              Upload
            </Button>
          </>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <Select
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          className="w-40"
          options={[
            { value: "", label: "All statuses" },
            { value: "ready", label: "Ready" },
            { value: "processing", label: "Processing" },
            { value: "pending", label: "Pending" },
            { value: "failed", label: "Failed" },
          ]}
        />
        <span className="text-sm text-muted-foreground">
          {media.data ? `${media.data.meta.total} files` : ""}
        </span>
      </div>

      {media.isLoading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Spinner className="h-6 w-6" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-border py-16 text-center text-sm text-muted-foreground">
          No media found.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item._id} className="group rounded-lg border border-border bg-card p-3">
              <div className="flex h-32 items-center justify-center rounded-md bg-muted/50 text-5xl">
                {typeIcon(item.mimeType)}
              </div>
              <div className="mt-3 space-y-1">
                <div className="truncate text-sm font-medium" title={item.originalName}>
                  {item.originalName}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatBytes(item.sizeBytes)}</span>
                  <Badge tone={STATUS_TONE[item.status] ?? "default"}>{item.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</div>
                {item.alt && <div className="truncate text-xs text-muted-foreground">alt: {item.alt}</div>}
                <div className="flex justify-end gap-1 pt-1">
                  <IconButton title="Edit" onClick={() => openEdit(item)}>
                    <PencilSimple size={14} />
                  </IconButton>
                  <IconButton title="Delete" onClick={() => setDeleteTarget(item)}>
                    <TrashIcon />
                  </IconButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={media.data?.meta.totalPages ?? 1} onPage={setPage} />

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit media"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Spinner /> : null}
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="break-all font-mono text-xs text-muted-foreground">{editing?.key}</p>
          <Field label="Alt text">
            <Input value={editForm.alt} onChange={(event) => setEditForm((prev) => ({ ...prev, alt: event.target.value }))} />
          </Field>
          <Field label="Order">
            <Input
              type="number"
              value={editForm.order}
              onChange={(event) => setEditForm((prev) => ({ ...prev, order: Number(event.target.value) }))}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Toggle checked={editForm.isMain} onChange={(value) => setEditForm((prev) => ({ ...prev, isMain: value }))} />
            Main image
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
        title="Delete media"
        message={`Delete "${deleteTarget?.originalName}"?`}
        busy={deleteMutation.isPending}
      />

      <ToastHost toast={toast} dismiss={dismiss} />
    </div>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14" />
    </svg>
  );
}
