"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilSimple, Plus, UserPlus } from "@phosphor-icons/react";
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
  Pagination,
  Select,
  Spinner,
  Table,
  Toolbar,
  ToastHost,
  useToast,
} from "@/components/ui";
import { apiDelete, apiGet, apiPatch, apiPost, qs } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { AdminRecord, Paged, Role } from "@/lib/types";

type ModalMode = "new" | "invite" | "edit" | null;

export default function AdminsPage() {
  const queryClient = useQueryClient();
  const { toast, show, dismiss } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editing, setEditing] = useState<AdminRecord | null>(null);
  const [form, setForm] = useState({
    email: "",
    name: "",
    roleId: "",
    password: "",
    message: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<{ inviteUrl?: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminRecord | null>(null);

  const admins = useQuery({
    queryKey: ["admins", page, search, statusFilter],
    queryFn: () =>
      apiGet<Paged<AdminRecord>>(
        `/admin/admins${qs({
          page,
          limit: 20,
          search: search || undefined,
          status: statusFilter || undefined,
        })}`,
      ),
  });
  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: () => apiGet<Role[]>("/admin/roles"),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admins"] });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (modalMode === "invite") {
        return apiPost<AdminRecord & { inviteUrl?: string }>("/admin/admins/invite", {
          email: form.email,
          name: form.name,
          roleId: form.roleId,
          message: form.message || undefined,
        });
      }
      if (modalMode === "edit" && editing) {
        return apiPatch<AdminRecord>(`/admin/admins/${editing.id}`, {
          name: form.name,
          roleId: form.roleId,
        });
      }
      return apiPost<AdminRecord>("/admin/admins", {
        email: form.email,
        name: form.name,
        roleId: form.roleId,
        password: form.password,
      });
    },
    onSuccess: (result) => {
      invalidate();
      setModalMode(null);
      setForm({ email: "", name: "", roleId: "", password: "", message: "" });
      setInviteResult(null);
      const inviteUrl = (result as AdminRecord & { inviteUrl?: string }).inviteUrl;
      if (inviteUrl) {
        setInviteResult({ inviteUrl });
        setModalMode("invite");
      } else {
        show.success("Admin saved.");
      }
    },
    onError: (err) =>
      setFormError(err instanceof Error ? err.message : "Save failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/admins/${id}`),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      show.success("Admin deleted.");
    },
    onError: (err) => {
      setDeleteTarget(null);
      show.error(err instanceof Error ? err.message : "Delete failed.");
    },
  });

  const openModal = (mode: Exclude<ModalMode, null>, admin?: AdminRecord) => {
    setFormError(null);
    setInviteResult(null);
    setEditing(admin ?? null);
    if (mode === "edit" && admin) {
      setForm({ email: admin.email, name: admin.name, roleId: admin.roleId, password: "", message: "" });
    } else {
      setForm({ email: "", name: "", roleId: "", password: "", message: "" });
    }
    setModalMode(mode);
  };

  const title =
    modalMode === "new" ? "New admin" : modalMode === "invite" ? "Invite admin" : "Edit admin";

  return (
    <div>
      <PageHeader
        title="Admins"
        description="Manage who can access the admin panel."
        actions={
          <>
            <Button variant="outline" onClick={() => openModal("invite")}>
              <UserPlus size={16} />
              Invite
            </Button>
            <Button onClick={() => openModal("new")}>
              <Plus size={16} />
              New admin
            </Button>
          </>
        }
      />

      <Toolbar>
        <Input
          placeholder="Search admins…"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className="w-56"
        />
        <Select
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
          className="w-36"
          options={[
            { value: "", label: "All statuses" },
            { value: "active", label: "Active" },
            { value: "invited", label: "Invited" },
            { value: "disabled", label: "Disabled" },
          ]}
        />
      </Toolbar>

      <Table
        headers={["Name", "Email", "Role", "Status", "Last login", ""]}
        loading={admins.isLoading}
        empty="No admins found."
      >
        {(admins.data?.data ?? []).map((admin) => (
          <tr key={admin.id} className="hover:bg-muted/30">
            <td className="px-4 py-2.5 font-medium">{admin.name}</td>
            <td className="px-4 py-2.5 text-muted-foreground">{admin.email}</td>
            <td className="px-4 py-2.5">{admin.roleName ?? admin.roleKey ?? "—"}</td>
            <td className="px-4 py-2.5">
              <Badge
                tone={admin.status === "active" ? "success" : admin.status === "invited" ? "warning" : "muted"}
              >
                {admin.status}
              </Badge>
            </td>
            <td className="px-4 py-2.5 text-muted-foreground">
              {formatDate(admin.lastLoginAt)}
            </td>
            <td className="px-2 py-2.5 text-right">
              <IconButton title="Edit" onClick={() => openModal("edit", admin)}>
                <PencilSimple size={16} />
              </IconButton>
              <IconButton title="Delete" onClick={() => setDeleteTarget(admin)}>
                <TrashIcon />
              </IconButton>
            </td>
          </tr>
        ))}
      </Table>

      <Pagination
        page={page}
        totalPages={admins.data?.meta.totalPages ?? 1}
        onPage={setPage}
      />

      <Modal
        open={modalMode !== null}
        onClose={() => setModalMode(null)}
        title={title}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalMode(null)}>
              Cancel
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name || !form.roleId}>
              {saveMutation.isPending ? <Spinner /> : null}
              Save
            </Button>
          </>
        }
      >
        {inviteResult?.inviteUrl ? (
          <div className="space-y-3">
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              Invitation created. Share this link with the admin (expires in 7 days).
            </div>
            <pre className="overflow-x-auto rounded-md border border-border bg-muted p-3 text-xs">
              {inviteResult.inviteUrl}
            </pre>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard?.writeText(inviteResult.inviteUrl ?? "");
                show.success("Copied.");
              }}
            >
              Copy link
            </Button>
          </div>
        ) : (
          <form
            id="admin-form"
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
            {modalMode !== "edit" && (
              <Field label="Email *">
                <Input
                  type="email"
                  required
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                />
              </Field>
            )}
            <Field label="Name *">
              <Input
                required
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </Field>
            <Field label="Role *">
              <Select
                required
                value={form.roleId}
                onChange={(v) => setForm((prev) => ({ ...prev, roleId: v }))}
                options={[
                  { value: "", label: "Select a role" },
                  ...(roles.data ?? [])
                    .filter((role) => role.status === "active")
                    .map((role) => ({ value: role.id, label: role.name })),
                ]}
              />
            </Field>
            {modalMode === "new" && (
              <Field label="Password *" hint="At least 12 characters.">
                <Input
                  type="password"
                  required
                  minLength={12}
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                />
              </Field>
            )}
            {modalMode === "invite" && (
              <Field label="Message">
                <Input
                  value={form.message}
                  onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                />
              </Field>
            )}
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete admin"
        message={`Delete "${deleteTarget?.name}" (${deleteTarget?.email})?`}
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
