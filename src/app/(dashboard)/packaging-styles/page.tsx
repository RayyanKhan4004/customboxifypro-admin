"use client";

import { PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Spinner,
  Textarea,
  ToastHost,
  Toggle,
  useToast,
} from "@/components/ui";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { uploadImageFile } from "@/lib/media-upload";
import type { PackagingStyle } from "@/lib/types";

type StyleForm = {
  name: string;
  slug: string;
  description: string;
  imageKey: string;
  imageUrl: string | null;
  minimumOrderQuantity: string;
  deliveryTime: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm: StyleForm = {
  name: "",
  slug: "",
  description: "",
  imageKey: "",
  imageUrl: null,
  minimumOrderQuantity: "50",
  deliveryTime: "Delivery 2 weeks",
  sortOrder: "0",
  isActive: true,
};

function toForm(style: PackagingStyle): StyleForm {
  return {
    name: style.name,
    slug: style.slug,
    description: style.description,
    imageKey: style.imageKey ?? "",
    imageUrl: style.imageUrl,
    minimumOrderQuantity: style.minimumOrderQuantity
      ? String(style.minimumOrderQuantity)
      : "",
    deliveryTime: style.deliveryTime,
    sortOrder: String(style.sortOrder),
    isActive: style.isActive,
  };
}

export default function PackagingStylesPage() {
  const queryClient = useQueryClient();
  const { toast, show, dismiss } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<PackagingStyle | null>(null);
  const [form, setForm] = useState<StyleForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PackagingStyle | null>(null);
  const [uploading, setUploading] = useState(false);

  const styles = useQuery({
    queryKey: ["packaging-styles"],
    queryFn: () => apiGet<PackagingStyle[]>("/admin/packaging-styles"),
  });
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["packaging-styles"] });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!form.name.trim()) throw new Error("Name is required.");
      const minimumOrderQuantity = form.minimumOrderQuantity.trim()
        ? Number(form.minimumOrderQuantity)
        : null;
      if (
        minimumOrderQuantity !== null &&
        (!Number.isInteger(minimumOrderQuantity) || minimumOrderQuantity < 1)
      )
        throw new Error(
          "Minimum order quantity must be a whole number greater than zero.",
        );
      const body = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        description: form.description.trim() || undefined,
        imageKey: form.imageKey.trim() || undefined,
        minimumOrderQuantity,
        deliveryTime: form.deliveryTime.trim() || undefined,
        sortOrder: Number(form.sortOrder || 0),
        isActive: form.isActive ? "true" : "false",
      };
      return editing
        ? apiPatch(`/admin/packaging-styles/${editing.id}`, body)
        : apiPost("/admin/packaging-styles", body);
    },
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      show.success("Packaging style saved.");
    },
    onError: (error) =>
      setFormError(error instanceof Error ? error.message : "Save failed."),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/packaging-styles/${id}`),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      show.success("Packaging style deleted.");
    },
    onError: (error) => {
      setDeleteTarget(null);
      show.error(error instanceof Error ? error.message : "Delete failed.");
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };
  const openEdit = (style: PackagingStyle) => {
    setEditing(style);
    setForm(toForm(style));
    setFormError(null);
    setModalOpen(true);
  };
  const uploadImage = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadImageFile(file);
      setForm((current) => ({
        ...current,
        imageKey: uploaded.key,
        imageUrl: URL.createObjectURL(file),
      }));
      show.success("Image uploaded.");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Image upload failed.",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div>
      <PageHeader
        title="Packaging styles"
        description="Manage the styles shown on the packaging styles landing page."
        actions={
          <Button onClick={openNew}>
            <PlusIcon size={16} /> New style
          </Button>
        }
      />
      {styles.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : !styles.data?.length ? (
        <div className="rounded-lg border border-border py-16 text-center text-sm text-muted-foreground">
          No packaging styles yet. Create your first one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Style</th>
                <th className="px-4 py-3">MOQ</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {styles.data.map((style) => (
                <tr
                  className="border-b border-border/60 last:border-0"
                  key={style.id}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{style.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {style.slug}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {style.minimumOrderQuantity ?? "Custom"}
                  </td>
                  <td className="px-4 py-3">
                    {style.isActive ? (
                      <Badge tone="success">Active</Badge>
                    ) : (
                      <Badge tone="muted">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <IconButton title="Edit" onClick={() => openEdit(style)}>
                      <PencilSimpleIcon size={16} />
                    </IconButton>
                    <IconButton
                      title="Delete"
                      onClick={() => setDeleteTarget(style)}
                    >
                      <TrashIcon size={16} />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.name}` : "New packaging style"}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || uploading}
            >
              {saveMutation.isPending ? <Spinner /> : null} Save
            </Button>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            saveMutation.mutate();
          }}
        >
          {formError && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {formError}
            </p>
          )}
          <Field label="Name *">
            <Input
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </Field>
          <Field label="Slug" hint="Leave blank to generate from the name.">
            <Input
              value={form.slug}
              onChange={(event) =>
                setForm((current) => ({ ...current, slug: event.target.value }))
              }
            />
          </Field>
          <Field label="Description">
            <Textarea
              rows={3}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Card image">
            <div>
              <div className="flex gap-2">
                <Input
                  aria-label="Card image key"
                  value={form.imageKey}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      imageKey: event.target.value,
                      imageUrl: null,
                    }))
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? <Spinner /> : "Upload"}
                </Button>
              </div>
              {form.imageUrl && (
                <div className="mt-3 aspect-349/240 max-w-87.5 overflow-hidden rounded-md border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="Style card preview"
                    className="h-full w-full object-cover"
                    src={form.imageUrl}
                  />
                </div>
              )}
            </div>
          </Field>
          <input
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            type="file"
            onChange={(event) => uploadImage(event.target.files?.[0])}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Minimum order quantity">
              <Input
                min="1"
                type="number"
                value={form.minimumOrderQuantity}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    minimumOrderQuantity: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Delivery time">
              <Input
                value={form.deliveryTime}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    deliveryTime: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Sort order">
              <Input
                min="0"
                type="number"
                value={form.sortOrder}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sortOrder: event.target.value,
                  }))
                }
              />
            </Field>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <Toggle
                checked={form.isActive}
                onChange={(value) =>
                  setForm((current) => ({ ...current, isActive: value }))
                }
              />{" "}
              Active
            </label>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete packaging style"
        message={`Delete "${deleteTarget?.name}"?`}
        busy={deleteMutation.isPending}
      />
      <ToastHost toast={toast} dismiss={dismiss} />
    </div>
  );
}
