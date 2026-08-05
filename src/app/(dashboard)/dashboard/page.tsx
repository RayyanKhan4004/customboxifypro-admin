"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { useAuth } from "@/components/auth-provider";
import { Card, PageHeader, Spinner, Table, Badge } from "@/components/ui";
import { apiGet } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { AdminRecord, AuditLog, CustomerRequest, Paged, ProductListItem } from "@/lib/types";

export default function DashboardPage() {
  const { can } = useAuth();

  const products = useQuery({
    queryKey: ["dashboard", "products"],
    queryFn: () => apiGet<Paged<ProductListItem>>("/admin/products?page=1&limit=5"),
    enabled: can("products.read"),
  });
  const requests = useQuery({
    queryKey: ["dashboard", "requests"],
    queryFn: () => apiGet<Paged<CustomerRequest>>("/admin/requests?page=1&limit=5"),
    enabled: can("requests.read"),
  });
  const admins = useQuery({
    queryKey: ["dashboard", "admins"],
    queryFn: () => apiGet<Paged<AdminRecord>>("/admin/admins?page=1&limit=1"),
    enabled: can("admins.read"),
  });
  const audit = useQuery({
    queryKey: ["dashboard", "audit"],
    queryFn: () => apiGet<Paged<AuditLog>>("/admin/audit-logs?page=1&limit=6"),
    enabled: can("audit-logs.read"),
  });

  const stats: { label: string; value: number | null; link?: string; permission?: string }[] = [
    { label: "Products", value: products.data?.meta.total ?? null, link: "/products", permission: "products.read" },
    { label: "Requests", value: requests.data?.meta.total ?? null, link: "/requests", permission: "requests.read" },
    { label: "Admins", value: admins.data?.meta.total ?? null, link: "/admins", permission: "admins.read" },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your catalog activity." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats
          .filter((stat) => !stat.permission || can(stat.permission))
          .map((stat) => (
            <Card key={stat.label} className="p-5">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-3xl font-semibold">
                {stat.value === null ? (
                  <Spinner className="h-5 w-5 text-muted-foreground" />
                ) : (
                  stat.value
                )}
              </p>
              {stat.link && (
                <Link
                  href={stat.link}
                  className="mt-2 inline-block text-xs text-primary hover:underline"
                >
                  View all
                </Link>
              )}
            </Card>
          ))}
      </div>

      {can("products.read") && (
        <Card className="mb-6">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Recent products</h2>
            <Link href="/products" className="text-xs text-primary hover:underline">
              All products
            </Link>
          </div>
          <Table
            headers={["Name", "SKU", "Status", "Updated"]}
            loading={products.isLoading}
          >
            {(products.data?.data ?? []).map((product) => (
              <tr key={product.id} className="hover:bg-muted/30">
                <td className="px-4 py-2.5">
                  <Link href={`/products/${product.id}`} className="hover:text-primary">
                    {product.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{product.sku ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <Badge
                    tone={
                      product.status === "published"
                        ? "success"
                        : product.status === "archived"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {product.status}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{formatDate(product.updatedAt)}</td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {can("requests.read") && (
        <Card className="mb-6">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Recent requests</h2>
            <Link href="/requests" className="text-xs text-primary hover:underline">
              All requests
            </Link>
          </div>
          <Table
            headers={["Contact", "Type", "Status", "Created"]}
            loading={requests.isLoading}
          >
            {(requests.data?.data ?? []).map((request) => (
              <tr key={request._id} className="hover:bg-muted/30">
                <td className="px-4 py-2.5">
                  <Link href={`/requests?open=${request._id}`} className="hover:text-primary">
                    {request.contact.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{request.contact.email}</p>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{request.requestType}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={request.status === "new" ? "info" : "default"}>
                    {request.status}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{formatDate(request.createdAt)}</td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {can("audit-logs.read") && (
        <Card>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Recent activity</h2>
            <Link href="/audit-logs" className="text-xs text-primary hover:underline">
              All logs
            </Link>
          </div>
          <Table headers={["Action", "Resource", "When"]} loading={audit.isLoading}>
            {(audit.data?.data ?? []).map((log) => (
              <tr key={log.id} className="hover:bg-muted/30">
                <td className="px-4 py-2.5 font-mono text-xs">{log.action}</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {log.resourceType}
                  {log.resourceId ? ` · ${log.resourceId}` : ""}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{formatDate(log.createdAt)}</td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </div>
  );
}
