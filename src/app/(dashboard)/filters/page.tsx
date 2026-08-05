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
  Select,
  Spinner,
  Table,
  Textarea,
  ToastHost,
  useToast,
} from "@/components/ui";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type { FilterDefinition } from "@/lib/types";

interface FilterFormState {
  name: string;
  key: string;
  label: string;
  dataType: FilterDefinition["dataType"];
  categoryScope: string;
  options: string;
  searchable: boolean;
  filterable: boolean;
  sortable: boolean;
  required: boolean;
  multiple: boolean;
  displayOrder: string;
  validationMin: string;
  validationMax: string;
  validationPattern: string;
  validationRequired: boolean;
  isActive: boolean;
}

function emptyForm(): FilterFormState {
  return {
    name: "",
    key: "",
    label: "",
    dataType: "string",
    categoryScope: "",
    options: "",
    searchable: true,
    filterable: true,
    sortable: false,
    required: false,
    multiple: false,
    displayOrder: "0",
    validationMin: "",
    validationMax: "",
    validationPattern: "",
    validationRequired: false,
    isActive: true,
  };
}

function fromFilter(filter: FilterDefinition): FilterFormState {
  return {
    name: filter.name,
    key: filter.key,
    label: filter.label,
    dataType: filter.dataType,
    categoryScope: filter.categoryScope?.filter((scope) => scope !== "all").join(", "),
    options: (filter.options ?? []).map((option) => `${option.value}|${option.label}`).join("\n"),
    searchable: filter.searchable,
    filterable: filter.filterable,
    sortable: filter.sortable,
    required: filter.required,
    multiple: filter.multiple,
    displayOrder: String(filter.displayOrder),
    validationMin: filter.validation?.min !== undefined ? String(filter.validation.min) : "",
    validationMax: filter.validation?.max !== undefined ? String(filter.validation.max) : "",
    validationPattern: filter.validation?.pattern ?? "",
    validationRequired: filter.validation?.required ?? false,
    isActive: filter.isActive,
  };
}

function parseOptions(raw: string): { value: string; label: string }[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [value, label] = line.split("|");
      return { value: value.trim(), label: (label ?? value).trim() };
    });
}

export default function FiltersPage() {
  const queryClient = useQueryClient();
  const { toast, show, dismiss } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FilterDefinition | null>(null);
  const [form, setForm] = useState<FilterFormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FilterDefinition | null>(null);

  const filters = useQuery({
    queryKey: ["filters"],
    queryFn: () => apiGet<FilterDefinition[]>("/admin/filters"),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["filters"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name,
        label: form.label,
        dataType: form.dataType,
        categoryScope: form.categoryScope ? form.categoryScope.split(",").map((s) => s.trim()).filter(Boolean) : ["all"],
        options: parseOptions(form.options),
        searchable: form.searchable,
        filterable: form.filterable,
        sortable: form.sortable,
        required: form.required,
        multiple: form.multiple,
        displayOrder: form.displayOrder !== "" ? Number(form.displayOrder) : undefined,
        isActive: form.isActive,
        validation: {
          min: form.validationMin !== "" ? Number(form.validationMin) : undefined,
          max: form.validationMax !== "" ? Number(form.validationMax) : undefined,
          pattern: form.validationPattern || undefined,
          required: form.validationRequired || undefined,
        },
      };
      return editing
        ? apiPatch(`/admin/filters/${editing.id}`, body)
        : apiPost("/admin/filters", { ...body, key: form.key });
    },
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
      setForm(emptyForm());
      setEditing(null);
      show.success("Filter saved.");
    },
    onError: (err) =>
      setFormError(err instanceof Error ? err.message : "Save failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/filters/${id}`),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      show.success("Filter deleted.");
    },
    onError: (err) => {
      setDeleteTarget(null);
      show.error(err instanceof Error ? err.message : "Delete failed.");
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (filter: FilterDefinition) => {
    setEditing(filter);
    setForm(fromFilter(filter));
    setFormError(null);
    setModalOpen(true);
  };

  const set = <K extends keyof FilterFormState>(key: K, value: FilterFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div>
      <PageHeader
        title="Filters"
        description="Dynamic product attributes validated against these definitions."
        actions={
          <Button onClick={openNew}>
            <Plus size={16} />
            New filter
          </Button>
        }
      />

      <Table
        headers={["Name", "Key", "Data type", "Filterable", "Status", ""]}
        loading={filters.isLoading}
        empty="No filters defined."
      >
        {(filters.data ?? []).map((filter) => (
          <tr key={filter.id} className="hover:bg-muted/30">
            <td className="px-4 py-2.5 font-medium">{filter.name}</td>
            <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
              {filter.key}
            </td>
            <td className="px-4 py-2.5 text-muted-foreground">{filter.dataType}</td>
            <td className="px-4 py-2.5">
              {filter.filterable ? (
                <Badge tone="info">Yes</Badge>
              ) : (
                <span className="text-muted-foreground">No</span>
              )}
            </td>
            <td className="px-4 py-2.5">
              {filter.isActive ? (
                <Badge tone="success">Active</Badge>
              ) : (
                <Badge tone="muted">Inactive</Badge>
              )}
            </td>
            <td className="px-2 py-2.5 text-right">
              <IconButton title="Edit" onClick={() => openEdit(filter)}>
                <PencilSimple size={16} />
              </IconButton>
              <IconButton title="Delete" onClick={() => setDeleteTarget(filter)}>
                <TrashIcon />
              </IconButton>
            </td>
          </tr>
        ))}
      </Table>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.name}` : "New filter"}
        wide
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name || !form.key}>
              {saveMutation.isPending ? <Spinner /> : null}
              Save
            </Button>
          </>
        }
      >
        <form
          id="filter-form"
          onSubmit={(event) => {
            event.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-4"
        >
          {formError && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {formError}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Name *">
              <Input value={form.name} onChange={(event) => set("name", event.target.value)} />
            </Field>
            <Field label="Key *" hint={editing ? "Read-only after creation." : "Lowercase, e.g. material."}>
              <Input
                value={form.key}
                disabled={Boolean(editing)}
                onChange={(event) => set("key", event.target.value)}
              />
            </Field>
            <Field label="Label *">
              <Input value={form.label} onChange={(event) => set("label", event.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Data type">
              <Select
                value={form.dataType}
                onChange={(event) => set("dataType", event.target.value as FilterFormState["dataType"])}
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="enum">Enum</option>
                <option value="multiselect">Multiselect</option>
              </Select>
            </Field>
            <Field label="Display order">
              <Input
                type="number"
                min="0"
                value={form.displayOrder}
                onChange={(event) => set("displayOrder", event.target.value)}
              />
            </Field>
            <Field label="Category scope" hint="Comma separated category IDs, or leave empty for all.">
              <Input
                value={form.categoryScope}
                onChange={(event) => set("categoryScope", event.target.value)}
              />
            </Field>
          </div>
          <Field
            label="Options"
            hint="One per line: value|label (for enum / multiselect)."
          >
            <Textarea
              rows={4}
              value={form.options}
              onChange={(event) => set("options", event.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <ToggleField label="Searchable" checked={form.searchable} onChange={(v) => set("searchable", v)} />
            <ToggleField label="Filterable" checked={form.filterable} onChange={(v) => set("filterable", v)} />
            <ToggleField label="Sortable" checked={form.sortable} onChange={(v) => set("sortable", v)} />
            <ToggleField label="Required" checked={form.required} onChange={(v) => set("required", v)} />
            <ToggleField label="Multiple" checked={form.multiple} onChange={(v) => set("multiple", v)} />
            <ToggleField label="Active" checked={form.isActive} onChange={(v) => set("isActive", v)} />
          </div>
          <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <Field label="Validation min">
              <Input type="number" value={form.validationMin} onChange={(event) => set("validationMin", event.target.value)} />
            </Field>
            <Field label="Validation max">
              <Input type="number" value={form.validationMax} onChange={(event) => set("validationMax", event.target.value)} />
            </Field>
            <Field label="Validation pattern">
              <Input value={form.validationPattern} onChange={(event) => set("validationPattern", event.target.value)} />
            </Field>
            <div className="flex items-end pb-2">
              <ToggleField label="Validation required" checked={form.validationRequired} onChange={(v) => set("validationRequired", v)} />
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete filter"
        message={`Delete "${deleteTarget?.name}"? Products referencing this attribute will keep their data but it will no longer be validated.`}
        busy={deleteMutation.isPending}
      />

      <ToastHost toast={toast} dismiss={dismiss} />
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[var(--primary)]"
      />
    </label>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14" />
    </svg>
  );
}
