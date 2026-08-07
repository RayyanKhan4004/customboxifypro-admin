"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilSimple, Plus } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

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
import type { Role } from "@/lib/types";

interface RoleFormState {
  name: string;
  key: string;
  description: string;
  permissions: string[];
  status: "active" | "inactive";
}

function emptyForm(): RoleFormState {
  return { name: "", key: "", description: "", permissions: [], status: "active" };
}

function fromRole(role: Role): RoleFormState {
  return {
    name: role.name,
    key: role.key,
    description: role.description,
    permissions: [...role.permissions],
    status: role.status,
  };
}

function groupPermissions(permissions: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const permission of permissions) {
    const [section] = permission.split(".");
    groups[section] ??= [];
    groups[section].push(permission);
  }
  return groups;
}

export default function RolesPage() {
  const queryClient = useQueryClient();
  const { toast, show, dismiss } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState<RoleFormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: () => apiGet<Role[]>("/admin/roles"),
  });
  const permissions = useQuery({
    queryKey: ["role-permissions"],
    queryFn: () => apiGet<{ permissions: string[] }>("/admin/roles/permissions"),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["roles"] });

  const permissionGroups = useMemo(
    () => groupPermissions(permissions.data?.permissions ?? []),
    [permissions.data],
  );

  const saveMutation = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        name: form.name,
        description: form.description || undefined,
        permissions: form.permissions,
      };
      if (editing) {
        if (form.status) body.status = form.status;
        return apiPatch(`/admin/roles/${editing.id}`, body);
      }
      return apiPost("/admin/roles", { ...body, key: form.key });
    },
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
      setForm(emptyForm());
      setEditing(null);
      show.success("Role saved.");
    },
    onError: (err) =>
      setFormError(err instanceof Error ? err.message : "Save failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/roles/${id}`),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      show.success("Role deleted.");
    },
    onError: (err) => {
      setDeleteTarget(null);
      show.error(err instanceof Error ? err.message : "Delete failed.");
    },
  });

  const togglePermission = (permission: string) =>
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((value) => value !== permission)
        : [...prev.permissions, permission],
    }));

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditing(role);
    setForm(fromRole(role));
    setFormError(null);
    setModalOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Roles"
        description="Control what admins can do."
        actions={
          <Button onClick={openNew}>
            <Plus size={16} />
            New role
          </Button>
        }
      />

      <Table
        headers={["Name", "Key", "Permissions", "Admins", "Status", ""]}
        loading={roles.isLoading}
        empty="No roles defined."
      >
        {(roles.data ?? []).map((role) => (
          <tr key={role.id} className="hover:bg-muted/30">
            <td className="px-4 py-2.5 font-medium">
              {role.name}
              {role.isSystem && <Badge tone="info" className="ml-2">System</Badge>}
            </td>
            <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
              {role.key}
            </td>
            <td className="px-4 py-2.5 text-muted-foreground">
              {role.permissions.length} permissions
            </td>
            <td className="px-4 py-2.5">{role.adminCount}</td>
            <td className="px-4 py-2.5">
              <Badge tone={role.status === "active" ? "success" : "muted"}>
                {role.status}
              </Badge>
            </td>
            <td className="px-2 py-2.5 text-right">
              <IconButton title="Edit" onClick={() => openEdit(role)}>
                <PencilSimple size={16} />
              </IconButton>
              <IconButton
                title="Delete"
                onClick={() => setDeleteTarget(role)}
                disabled={role.isSystem}
              >
                <TrashIcon />
              </IconButton>
            </td>
          </tr>
        ))}
      </Table>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.name}` : "New role"}
        wide
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
          id="role-form"
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
              <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            </Field>
            <Field label="Key *" hint={editing ? "Read-only." : "Lowercase, e.g. sales."}>
              <Input
                value={form.key}
                disabled={Boolean(editing)}
                onChange={(event) => setForm((prev) => ({ ...prev, key: event.target.value }))}
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(v) => setForm((prev) => ({ ...prev, status: v as RoleFormState["status"] }))}
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
            </Field>
          </div>
          <Field label="Description">
            <Textarea
              rows={2}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </Field>

          <div className="space-y-4 border-t border-border pt-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Permissions
            </p>
            {Object.entries(permissionGroups).map(([group, groupPermissions]) => (
              <div key={group}>
                <p className="mb-1 text-xs font-medium text-muted-foreground">{group}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {groupPermissions.map((permission) => (
                    <label
                      key={permission}
                      className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(permission)}
                        onChange={() => togglePermission(permission)}
                        className="h-4 w-4 accent-[var(--primary)]"
                      />
                      <span className="font-mono text-xs">{permission}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete role"
        message={`Delete "${deleteTarget?.name}"? Roles assigned to admins cannot be deleted.`}
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
