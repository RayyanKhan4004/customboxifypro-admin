"use client";

import { PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

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
import type { Industry } from "@/lib/types";

type IndustryForm = {
  bestFor: string;
  description: string;
  imageKey: string;
  imageUrl: string | null;
  isActive: boolean;
  name: string;
  slug: string;
  sortOrder: string;
  specifications: string[];
};

const emptyForm: IndustryForm = {
  name: "",
  slug: "",
  description: "",
  bestFor: "",
  imageKey: "",
  imageUrl: null,
  specifications: [""],
  sortOrder: "0",
  isActive: true,
};

function toForm(industry: Industry): IndustryForm {
  return {
    name: industry.name,
    slug: industry.slug,
    description: industry.description,
    bestFor: industry.bestFor,
    imageKey: industry.imageKey ?? "",
    imageUrl: industry.imageUrl,
    specifications: industry.specifications.length
      ? industry.specifications
      : [""],
    sortOrder: String(industry.sortOrder),
    isActive: industry.isActive,
  };
}

export default function IndustriesPage() {
  const queryClient = useQueryClient();
  const { toast, show, dismiss } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<Industry | null>(null);
  const [form, setForm] = useState<IndustryForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Industry | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(
    () => () => {
      if (form.imageUrl?.startsWith("blob:"))
        URL.revokeObjectURL(form.imageUrl);
    },
    [form.imageUrl],
  );

  const industries = useQuery({
    queryKey: ["industries"],
    queryFn: () => apiGet<Industry[]>("/admin/industries"),
  });
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["industries"] });

  const saveMutation = useMutation({
    mutationFn: () => {
      const specifications = form.specifications
        .map((item) => item.trim())
        .filter(Boolean);
      if (!form.name.trim() || specifications.length === 0)
        throw new Error("Name and at least one specification are required.");
      const body = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        description: form.description.trim() || undefined,
        bestFor: form.bestFor.trim() || undefined,
        imageKey: form.imageKey.trim() || undefined,
        specifications,
        sortOrder: Number(form.sortOrder || 0),
        isActive: form.isActive ? "true" : "false",
      };
      return editing
        ? apiPatch(`/admin/industries/${editing.id}`, body)
        : apiPost("/admin/industries", body);
    },
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      show.success("Industry saved.");
    },
    onError: (error) =>
      setFormError(error instanceof Error ? error.message : "Save failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/industries/${id}`),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      show.success("Industry deleted.");
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
  const openEdit = (industry: Industry) => {
    setEditing(industry);
    setForm(toForm(industry));
    setFormError(null);
    setModalOpen(true);
  };
  const updateSpecification = (index: number, value: string) =>
    setForm((current) => ({
      ...current,
      specifications: current.specifications.map((item, itemIndex) =>
        itemIndex === index ? value : item,
      ),
    }));
  const removeSpecification = (index: number) =>
    setForm((current) => ({
      ...current,
      specifications: current.specifications.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
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
        title="Industries"
        description="Manage the industry cards prepared for the customer website."
        actions={
          <Button onClick={openNew}>
            <Plus size={16} /> New industry
          </Button>
        }
      />
      <TableContent
        items={industries.data ?? []}
        loading={industries.isLoading}
        onDelete={setDeleteTarget}
        onEdit={openEdit}
      />
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.name}` : "New industry"}
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
          <Field label="Best for">
            <Input
              value={form.bestFor}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  bestFor: event.target.value,
                }))
              }
            />
          </Field>
          <Field
            label="Card image"
            hint="Upload an image or keep the saved media key."
          >
            <div>
              <div className="flex gap-2">
                <Input
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
              {form.imageUrl ? (
                <div className="mt-3 aspect-[349/240] max-w-87.5 overflow-hidden rounded-md border border-border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="Industry card preview"
                    className="h-full w-full object-cover"
                    src={form.imageUrl}
                  />
                </div>
              ) : (
                <div className="mt-3 flex aspect-[349/240] max-w-87.5 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                  Image preview appears here
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
          <Field label="Specifications *">
            <div className="space-y-2">
              {form.specifications.map((specification, index) => (
                <div className="flex gap-2" key={`${index}-${specification}`}>
                  <Input
                    value={specification}
                    onChange={(event) =>
                      updateSpecification(index, event.target.value)
                    }
                  />
                  <IconButton
                    title="Remove specification"
                    type="button"
                    onClick={() => removeSpecification(index)}
                    disabled={form.specifications.length === 1}
                  >
                    <Trash size={16} />
                  </IconButton>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    specifications: [...current.specifications, ""],
                  }))
                }
                disabled={form.specifications.length >= 8}
              >
                <Plus size={14} /> Add specification
              </Button>
            </div>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
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
        title="Delete industry"
        message={`Delete "${deleteTarget?.name}"?`}
        busy={deleteMutation.isPending}
      />
      <ToastHost toast={toast} dismiss={dismiss} />
    </div>
  );
}

function TableContent({
  items,
  loading,
  onDelete,
  onEdit,
}: {
  items: Industry[];
  loading: boolean;
  onDelete: (industry: Industry) => void;
  onEdit: (industry: Industry) => void;
}) {
  if (loading)
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  if (!items.length)
    return (
      <div className="rounded-lg border border-border py-16 text-center text-sm text-muted-foreground">
        No industries yet. Create your first one.
      </div>
    );
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="border-b border-border text-left text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Industry</th>
            <th className="px-4 py-3">Slug</th>
            <th className="px-4 py-3">Sort</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {items.map((industry) => (
            <tr
              className="border-b border-border/60 last:border-0"
              key={industry.id}
            >
              <td className="px-4 py-3">
                <p className="font-medium">{industry.name}</p>
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {industry.description}
                </p>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {industry.slug}
              </td>
              <td className="px-4 py-3">{industry.sortOrder}</td>
              <td className="px-4 py-3">
                {industry.isActive ? (
                  <Badge tone="success">Active</Badge>
                ) : (
                  <Badge tone="muted">Inactive</Badge>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <IconButton title="Edit" onClick={() => onEdit(industry)}>
                  <PencilSimple size={16} />
                </IconButton>
                <IconButton title="Delete" onClick={() => onDelete(industry)}>
                  <Trash size={16} />
                </IconButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
