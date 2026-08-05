"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import {
  Badge,
  Button,
  Input,
  PageHeader,
  Pagination,
  Table,
  Toolbar,
} from "@/components/ui";
import { apiGet, qs } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { AuditLog, Paged } from "@/lib/types";

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [actorId, setActorId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const logs = useQuery({
    queryKey: ["audit-logs", page, action, resourceType, actorId, from, to],
    queryFn: () =>
      apiGet<Paged<AuditLog>>(
        `/admin/audit-logs${qs({
          page,
          limit: 20,
          action: action || undefined,
          resourceType: resourceType || undefined,
          actorId: actorId || undefined,
          from: from || undefined,
          to: to || undefined,
        })}`,
      ),
  });

  const resetAnd = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        title="Audit logs"
        description="A record of actions taken in the admin panel."
      />

      <Toolbar>
        <Input
          placeholder="Action (e.g. product.created)"
          value={action}
          onChange={(event) => resetAnd(setAction, event.target.value)}
          className="w-52"
        />
        <Input
          placeholder="Resource type"
          value={resourceType}
          onChange={(event) => resetAnd(setResourceType, event.target.value)}
          className="w-40"
        />
        <Input
          placeholder="Actor ID"
          value={actorId}
          onChange={(event) => resetAnd(setActorId, event.target.value)}
          className="w-40"
        />
        <Input type="date" value={from} onChange={(event) => resetAnd(setFrom, event.target.value)} className="w-40" />
        <Input type="date" value={to} onChange={(event) => resetAnd(setTo, event.target.value)} className="w-40" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setAction(""); setResourceType(""); setActorId(""); setFrom(""); setTo(""); setPage(1);
          }}
        >
          Clear
        </Button>
      </Toolbar>

      <Table
        headers={["When", "Actor", "Action", "Resource", "Resource ID", "Request ID"]}
        loading={logs.isLoading}
        empty="No audit logs found."
      >
        {(logs.data?.data ?? []).map((log) => (
          <tr key={log.id} className="hover:bg-muted/30">
            <td className="px-4 py-2.5 text-muted-foreground">{formatDate(log.createdAt)}</td>
            <td className="px-4 py-2.5">
              <span className="font-mono text-xs">{log.actorId ?? "system"}</span>
              <span className="ml-2 text-xs text-muted-foreground">{log.actorType}</span>
            </td>
            <td className="px-4 py-2.5">
              <Badge tone="default">{log.action}</Badge>
            </td>
            <td className="px-4 py-2.5 text-muted-foreground">{log.resourceType}</td>
            <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
              {log.resourceId ?? "—"}
            </td>
            <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
              {log.requestId ?? "—"}
            </td>
          </tr>
        ))}
      </Table>

      <Pagination page={page} totalPages={logs.data?.meta.totalPages ?? 1} onPage={setPage} />
    </div>
  );
}
