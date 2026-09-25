"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CopySimple, DownloadSimple, Eye } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import {
  Badge,
  Button,
  Field,
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
import { apiGet, apiPatch, apiPost, downloadCsv, qs } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { REQUEST_STATUSES, REQUEST_TYPES } from "@/lib/types";
import type { AdminRecord, CustomerRequest, Paged } from "@/lib/types";

const STATUS_TONE: Record<
  string,
  "default" | "success" | "warning" | "danger" | "info" | "muted"
> = {
  new: "info",
  "in-review": "warning",
  quoted: "default",
  approved: "success",
  rejected: "danger",
  cancelled: "muted",
  won: "success",
  lost: "muted",
};

function readableLabel(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll(/[-_]+/g, " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function renderSpecValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">Not provided</span>;
  }
  if (Array.isArray(value)) {
    return value.length ? (
      <ul className="list-inside list-disc space-y-1">
        {value.map((item, index) => (
          <li key={index}>{renderSpecValue(item)}</li>
        ))}
      </ul>
    ) : (
      <span className="text-muted-foreground">None</span>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value);
    return entries.length ? (
      <dl className="grid gap-2 sm:grid-cols-2">
        {entries.map(([key, nestedValue]) => (
          <div key={key} className="rounded-lg bg-muted/50 px-3 py-2">
            <dt className="text-xs text-muted-foreground">{readableLabel(key)}</dt>
            <dd className="mt-0.5 break-words text-sm">{renderSpecValue(nestedValue)}</dd>
          </div>
        ))}
      </dl>
    ) : (
      <span className="text-muted-foreground">None</span>
    );
  }
  if (typeof value === "boolean") return <>{value ? "Yes" : "No"}</>;
  return <>{String(value)}</>;
}

export default function RequestsPage() {
  const queryClient = useQueryClient();
  const { toast, show, dismiss } = useToast();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [requestType, setRequestType] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [detail, setDetail] = useState<CustomerRequest | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [note, setNote] = useState("");
  const [assignAdminId, setAssignAdminId] = useState("");

  useEffect(() => {
    const requestId = new URLSearchParams(window.location.search).get(
      "requestId",
    );
    if (!requestId) return;
    void apiGet<CustomerRequest>(`/admin/requests/${requestId}`)
      .then(setDetail)
      .catch(() => {});
  }, []);

  const requests = useQuery({
    queryKey: ["requests", page, status, requestType, search],
    queryFn: () =>
      apiGet<Paged<CustomerRequest>>(
        `/admin/requests${qs({
          page,
          limit: 20,
          status: status || undefined,
          requestType: requestType || undefined,
          search: search || undefined,
        })}`,
      ),
  });

  const admins = useQuery({
    queryKey: ["requests-admins"],
    queryFn: () => apiGet<Paged<AdminRecord>>("/admin/admins?limit=100"),
    enabled: detail !== null,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["requests"] });

  const statusMutation = useMutation({
    mutationFn: () => {
      if (!detail) throw new Error("No request selected");
      return apiPatch(`/admin/requests/${detail._id}/status`, {
        status: detail.status,
        note: statusNote || undefined,
      });
    },
    onSuccess: () => {
      invalidate();
      show.success("Status updated.");
      setStatusNote("");
    },
    onError: (err) =>
      show.error(err instanceof Error ? err.message : "Update failed."),
  });

  const noteMutation = useMutation({
    mutationFn: () => {
      if (!detail) throw new Error("No request selected");
      return apiPost(`/admin/requests/${detail._id}/notes`, { note });
    },
    onSuccess: () => {
      invalidate();
      show.success("Note added.");
      setNote("");
    },
    onError: (err) =>
      show.error(err instanceof Error ? err.message : "Note failed."),
  });

  const assignMutation = useMutation({
    mutationFn: () => {
      if (!detail) throw new Error("No request selected");
      return apiPost(`/admin/requests/${detail._id}/assign`, {
        assignedTo: assignAdminId,
      });
    },
    onSuccess: () => {
      invalidate();
      show.success("Assigned.");
    },
    onError: (err) =>
      show.error(err instanceof Error ? err.message : "Assign failed."),
  });

  const bulkMutation = useMutation({
    mutationFn: () =>
      apiPost("/admin/requests/bulk-status", {
        ids: [...selected],
        status: bulkStatus,
      }),
    onSuccess: () => {
      invalidate();
      setSelected(new Set());
      setBulkStatus("");
      show.success("Bulk update applied.");
    },
    onError: (err) =>
      show.error(err instanceof Error ? err.message : "Bulk update failed."),
  });

  const items = requests.data?.data ?? [];

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const openDetail = async (id: string) => {
    const record = await apiGet<CustomerRequest>(`/admin/requests/${id}`);
    setDetail(record);
    setStatusNote("");
    setNote("");
    setAssignAdminId(record.assignedTo ?? "");
  };

  const assigneeOptions = (admins.data?.data ?? []).filter(
    (admin) => admin.status === "active",
  );

  return (
    <div>
      <PageHeader
        title="Customer requests"
        description="Quotes, pricing and bulk-order requests from the website."
        actions={
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv("/admin/requests/export", "requests.csv")
            }
          >
            <DownloadSimple size={16} />
            Export CSV
          </Button>
        }
      />

      <Toolbar>
        <Input
          placeholder="Search name, email, product…"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className="w-56"
        />
        <Select
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          className="w-36"
          options={[
            { value: "", label: "All statuses" },
            ...REQUEST_STATUSES.map((value) => ({ value, label: value })),
          ]}
        />
        <Select
          value={requestType}
          onChange={(v) => {
            setRequestType(v);
            setPage(1);
          }}
          className="w-40"
          options={[
            { value: "", label: "All types" },
            ...REQUEST_TYPES.map((value) => ({ value, label: value })),
          ]}
        />
      </Toolbar>

      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            {selected.size} selected
          </span>
          <Select
            value={bulkStatus}
            onChange={setBulkStatus}
            className="w-40"
            options={[
              { value: "", label: "Set status…" },
              ...REQUEST_STATUSES.map((value) => ({ value, label: value })),
            ]}
          />
          <Button
            disabled={!bulkStatus || bulkMutation.isPending}
            onClick={() => bulkMutation.mutate()}
          >
            Apply
          </Button>
        </div>
      )}

      <Table
        headers={[
          "",
          "Request",
          "Customer",
          "Product",
          "Status",
          "Assigned",
          "Created",
          "",
        ]}
        loading={requests.isLoading}
        empty="No requests found."
      >
        {items.map((request) => (
          <tr key={request._id} className="hover:bg-muted/30">
            <td className="px-2 py-2.5">
              <input
                type="checkbox"
                checked={selected.has(request._id)}
                onChange={() => toggle(request._id)}
                className="h-4 w-4 accent-[var(--primary)]"
              />
            </td>
            <td className="px-2 py-2.5">
              <div className="text-xs text-muted-foreground">
                #{request._id.slice(-6)}
              </div>
              <div className="text-xs">{request.requestType}</div>
            </td>
            <td className="px-4 py-2.5">
              <div>{request.contact.name}</div>
              <div className="text-xs text-muted-foreground">
                {request.contact.email}
              </div>
            </td>
            <td className="px-4 py-2.5">
              {request.productName ?? "—"}
              {request.quantity != null && (
                <div className="text-xs text-muted-foreground">
                  Qty: {request.quantity}
                </div>
              )}
            </td>
            <td className="px-4 py-2.5">
              <Badge tone={STATUS_TONE[request.status] ?? "default"}>
                {request.status}
              </Badge>
            </td>
            <td className="px-4 py-2.5 text-muted-foreground">
              {request.assignedAt ? formatDate(request.assignedAt) : "—"}
            </td>
            <td className="px-4 py-2.5 text-muted-foreground">
              {formatDate(request.createdAt)}
            </td>
            <td className="px-2 py-2.5 text-right">
              <Button variant="outline" onClick={() => openDetail(request._id)}>
                <Eye size={14} />
                View
              </Button>
            </td>
          </tr>
        ))}
      </Table>

      <Pagination
        page={page}
        totalPages={requests.data?.meta.totalPages ?? 1}
        onPage={setPage}
      />

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? `Request #${detail._id.slice(-6)}` : "Request"}
        wide
        footer={
          <Button variant="outline" onClick={() => setDetail(null)}>
            Close
          </Button>
        }
      >
        {detail && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[detail.status] ?? "default"}>
                {detail.status}
              </Badge>
              <Badge tone="info">{detail.requestType}</Badge>
              <span className="text-xs text-muted-foreground">
                Submitted {formatDate(detail.createdAt)}
              </span>
            </div>
            {detail.conversationSkipReason && (
              <p className="text-xs text-muted-foreground">
                WhatsApp conversation not linked: {detail.conversationSkipReason.replaceAll("_", " ")}.
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Customer">
                <div className="text-sm">{detail.contact.name}</div>
                <div className="text-sm text-muted-foreground">
                  {detail.contact.email}
                </div>
                {detail.contact.phone && (
                  <div className="text-sm text-muted-foreground">
                    {detail.contact.phone}
                  </div>
                )}
                {detail.contact.company && (
                  <div className="text-sm text-muted-foreground">
                    {detail.contact.company}
                  </div>
                )}
              </Field>
              <Field label="Product">
                <div className="text-sm">{detail.productName ?? "—"}</div>
                <div className="text-sm text-muted-foreground">
                  {detail.quantity != null
                    ? `Quantity: ${detail.quantity}`
                    : ""}
                </div>
              </Field>
            </div>

            {Object.keys(detail.specs ?? {}).length > 0 && (
              <Field label="Specifications">
                <div className="space-y-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        void navigator.clipboard
                          .writeText(JSON.stringify(detail.specs))
                          .then(() => show.success("Raw specifications copied."))
                          .catch(() => show.error("Could not copy specifications."));
                      }}
                    >
                      <CopySimple size={15} /> Copy raw
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void navigator.clipboard
                          .writeText(JSON.stringify(detail.specs, null, 2))
                          .then(() => show.success("Formatted specifications copied."))
                          .catch(() => show.error("Could not copy specifications."));
                      }}
                    >
                      <CopySimple size={15} /> Copy formatted
                    </Button>
                  </div>
                  <dl className="grid gap-3 rounded-xl border border-border bg-muted/30 p-3 sm:grid-cols-2">
                    {Object.entries(detail.specs).map(([key, value]) => (
                      <div key={key} className="min-w-0 space-y-1">
                        <dt className="text-xs font-medium text-muted-foreground">
                          {readableLabel(key)}
                        </dt>
                        <dd className="break-words text-sm">
                          {renderSpecValue(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </Field>
            )}

            {detail.notes && (
              <Field label="Notes">
                <p className="text-sm whitespace-pre-wrap">{detail.notes}</p>
              </Field>
            )}

            {detail.attachments.length > 0 && (
              <Field
                label="Attachments"
                tooltip="Reference artwork uploaded with this customer request."
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {detail.attachments.map((key, index) => {
                    const url = detail.attachmentUrls?.[key];
                    return url ? (
                      <a
                        key={`${key}-${index}`}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="overflow-hidden rounded-md border border-border hover:border-primary"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Customer attachment ${index + 1}`}
                          className="aspect-square w-full object-cover"
                        />
                      </a>
                    ) : (
                      <div
                        key={`${key}-${index}`}
                        className="rounded-md border border-border p-3 text-xs text-muted-foreground"
                      >
                        Attachment {index + 1} is unavailable.
                      </div>
                    );
                  })}
                </div>
              </Field>
            )}

            <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <Field label="Change status">
                <Select
                  value={detail.status}
                  onChange={(v) =>
                    setDetail({
                      ...detail,
                      status: v as CustomerRequest["status"],
                    })
                  }
                  options={REQUEST_STATUSES.map((value) => ({
                    value,
                    label: value,
                  }))}
                />
                <div className="mt-2 flex gap-2">
                  <Input
                    placeholder="Optional note"
                    value={statusNote}
                    onChange={(event) => setStatusNote(event.target.value)}
                  />
                  <Button
                    onClick={() => statusMutation.mutate()}
                    disabled={statusMutation.isPending}
                  >
                    {statusMutation.isPending ? <Spinner /> : null}
                    Save
                  </Button>
                </div>
              </Field>
              <Field label="Assign to">
                <div className="flex gap-2">
                  <Select
                    value={assignAdminId}
                    onChange={setAssignAdminId}
                    options={[
                      { value: "", label: "Unassigned" },
                      ...assigneeOptions.map((admin) => ({
                        value: admin.id,
                        label: admin.name,
                      })),
                    ]}
                  />
                  <Button
                    onClick={() => assignMutation.mutate()}
                    disabled={assignMutation.isPending || !assignAdminId}
                  >
                    {assignMutation.isPending ? <Spinner /> : null}
                    Assign
                  </Button>
                </div>
              </Field>
            </div>

            <div className="border-t border-border pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Staff notes
              </p>
              {detail.staffNotes.length === 0 && (
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              )}
              {detail.staffNotes.map((staffNote, index) => (
                <div
                  key={index}
                  className="mb-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm"
                >
                  <div className="text-xs text-muted-foreground">
                    {formatDate(staffNote.createdAt)}
                  </div>
                  {staffNote.text}
                </div>
              ))}
              <div className="mt-3 flex gap-2">
                <Input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Add a staff note"
                />
                <Button
                  onClick={() => noteMutation.mutate()}
                  disabled={noteMutation.isPending || !note}
                >
                  {noteMutation.isPending ? <Spinner /> : null}
                  Add
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ToastHost toast={toast} dismiss={dismiss} />
    </div>
  );
}
