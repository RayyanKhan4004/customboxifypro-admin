"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilSimple, Plus } from "@phosphor-icons/react";
import { useState } from "react";

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
  Table,
  Textarea,
  ToastHost,
  useToast,
} from "@/components/ui";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type { Category } from "@/lib/types";

interface CategoryFormState {
  name: string;
  slug: string;
  description: string;
  parentId: string;
  sortOrder: string;
  isActive: boolean;
  seoTitle: string;
  seoDescription: string;
}

const empty: CategoryFormState = {
  name: "",
  slug: "",
  description: "",
  parentId: "",
  sortOrder: "0",
  isActive: true,
  seoTitle: "",
  seoDescription: "",
};

function fromCategory(category: Category): CategoryFormState {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description,
    parentId: category.parentId ?? "",
    sortOrder: String(category.sortOrder),
    isActive: category.isActive,
    seoTitle: category.seo?.title ?? "",
    seoDescription: category.seo?.description ?? "",
  };
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const { toast, show, dismiss } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryFormState>(empty);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiGet<Category[]>("/admin/categories"),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["categories"] });

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name,
        slug: form.slug || undefined,
        description: form.description || undefined,
        parentId: form.parentId || undefined,
        sortOrder: form.sortOrder !== "" ? Number(form.sortOrder) : undefined,
        isActive: form.isActive ? "true" : "false",
        ...(form.seoTitle || form.seoDescription
          ? { seo: { title: form.seoTitle || undefined, description: form.seoDescription || undefined } }
          : {}),
      };
      return editing
        ? apiPatch(`/admin/categories/${editing.id}`, body)
        : apiPost("/admin/categories", body);
    },
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
      setForm(empty);
      setEditing(null);
      show.success("Category saved.");
    },
    onError: (err) =>
      setFormError(err instanceof Error ? err.message : "Save failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/categories/${id}`),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      show.success("Category deleted.");
    },
    onError: (err) => {
      setDeleteTarget(null);
      show.error(err instanceof Error ? err.message : "Delete failed.");
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setForm(fromCategory(category));
    setFormError(null);
    setModalOpen(true);
  };

  const categoriesList = categories.data ?? [];
  const roots = categoriesList
    .filter((category) => !category.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const rows = roots.flatMap((root) => {
    const children = categoriesList
      .filter((category) => category.parentId === root.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return [root, ...children];
  });

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Organize your catalog into categories and subcategories."
        actions={
          <Button onClick={openNew}>
            <Plus size={16} />
            New category
          </Button>
        }
      />

      <Table
        headers={["Name", "Slug", "Parent", "Sort", "Status", ""]}
        loading={categories.isLoading}
        empty="No categories yet. Create your first one."
      >
        {rows.map((category) => (
          <tr key={category.id} className="hover:bg-muted/30">
            <td className="px-4 py-2.5 font-medium">
              {category.parentId ? <span className="ml-4">— </span> : null}
              {category.name}
            </td>
            <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
              {category.slug}
            </td>
            <td className="px-4 py-2.5 text-muted-foreground">
              {category.parentId
                ? categoriesList.find((parent) => parent.id === category.parentId)
                    ?.name ?? "—"
                : "—"}
            </td>
            <td className="px-4 py-2.5 text-muted-foreground">{category.sortOrder}</td>
            <td className="px-4 py-2.5">
              {category.isActive ? (
                <Badge tone="success">Active</Badge>
              ) : (
                <Badge tone="muted">Inactive</Badge>
              )}
            </td>
            <td className="px-2 py-2.5 text-right">
              <IconButton title="Edit" onClick={() => openEdit(category)}>
                <PencilSimple size={16} />
              </IconButton>
              <IconButton title="Delete" onClick={() => setDeleteTarget(category)}>
                <TrashIcon />
              </IconButton>
            </td>
          </tr>
        ))}
      </Table>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.name}` : "New category"}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name}>
              {saveMutation.isPending ? <Spinner /> : null}
              Save
            </Button>
          </>
        }
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            saveMutation.mutate();
          }}
          id="category-form"
          className="space-y-4"
        >
          {formError && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {formError}
            </p>
          )}
          <Field label="Name *">
            <Input
              required
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </Field>
          <Field label="Slug" hint="Leave blank to auto-generate.">
            <Input
              value={form.slug}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
            />
          </Field>
          <Field label="Parent category">
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={form.parentId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, parentId: event.target.value }))
              }
            >
              <option value="">None (top level)</option>
              {roots
                .filter((root) => root.id !== editing?.id)
                .map((root) => (
                  <option key={root.id} value={root.id}>
                    {root.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Sort order">
            <Input
              type="number"
              min="0"
              value={form.sortOrder}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, sortOrder: event.target.value }))
              }
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, isActive: event.target.checked }))
              }
              className="h-4 w-4 accent-[var(--primary)]"
            />
            Active
          </label>
          <Field label="Description">
            <Textarea
              rows={3}
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </Field>
          <Field label="SEO title">
            <Input
              value={form.seoTitle}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, seoTitle: event.target.value }))
              }
            />
          </Field>
          <Field label="SEO description">
            <Textarea
              rows={2}
              value={form.seoDescription}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, seoDescription: event.target.value }))
              }
            />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete category"
        message={`Delete "${deleteTarget?.name}"? Categories with subcategories cannot be deleted.`}
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
