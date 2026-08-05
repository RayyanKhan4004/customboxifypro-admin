"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, DotsThree, Plus, Square } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/auth-provider";
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  IconButton,
  Input,
  PageHeader,
  Pagination,
  Select,
  Table,
  ToastHost,
  Toolbar,
  useDebouncedValue,
  useToast,
} from "@/components/ui";
import { apiDelete, apiGet, apiPost, qs } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Category, Paged, ProductListItem } from "@/lib/types";

interface Filters {
  search: string;
  status: string;
  visibility: string;
  categoryId: string;
  includeDeleted: boolean;
}

const initialFilters: Filters = {
  search: "",
  status: "",
  visibility: "",
  categoryId: "",
  includeDeleted: false,
};

export default function ProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const { toast, show, dismiss } = useToast();

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ProductListItem | null>(null);

  const debouncedSearch = useDebouncedValue(filters.search, 350);

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiGet<Category[]>("/admin/categories"),
    enabled: can("categories.manage") || can("products.read"),
  });

  const products = useQuery({
    queryKey: ["products", { page, ...filters, search: debouncedSearch, sortBy, sortDir }],
    queryFn: () =>
      apiGet<Paged<ProductListItem>>(
        `/admin/products${qs({
          page,
          limit: 20,
          search: debouncedSearch || undefined,
          status: filters.status || undefined,
          visibility: filters.visibility || undefined,
          categoryId: filters.categoryId || undefined,
          includeDeleted: filters.includeDeleted || undefined,
          sortBy: sortBy || undefined,
          sortDir,
        })}`,
      ),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["products"] });

  const publishMutation = useMutation({
    mutationFn: ({ id, publish }: { id: string; publish: boolean }) =>
      apiPost(`/admin/products/${id}/${publish ? "publish" : "unpublish"}`),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/products/${id}`),
    onSuccess: () => {
      invalidate();
      show.success("Product deleted.");
      setDeleteTarget(null);
    },
    onError: (err) => show.error(err instanceof Error ? err.message : "Delete failed."),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => apiPost(`/admin/products/${id}/restore`),
    onSuccess: () => {
      invalidate();
      show.success("Product restored.");
    },
    onError: (err) => show.error(err instanceof Error ? err.message : "Restore failed."),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => apiPost("/admin/products/bulk/delete", { ids }),
    onSuccess: () => {
      invalidate();
      setSelected([]);
      show.success("Products deleted.");
    },
    onError: (err) => show.error(err instanceof Error ? err.message : "Bulk delete failed."),
  });

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) =>
      apiPost("/admin/products/bulk/update", { ids, status }),
    onSuccess: () => {
      invalidate();
      setSelected([]);
      show.success("Products updated.");
    },
    onError: (err) => show.error(err instanceof Error ? err.message : "Bulk update failed."),
  });

  const toggleRow = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );

  const items = products.data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your catalog."
        actions={
          can("products.create") ? (
            <Button onClick={() => router.push("/products/new")}>
              <Plus size={16} />
              New product
            </Button>
          ) : undefined
        }
      />

      <Toolbar>
        <Input
          placeholder="Search products…"
          value={filters.search}
          onChange={(event) => {
            setFilters((prev) => ({ ...prev, search: event.target.value }));
            setPage(1);
          }}
          className="w-56"
        />
        <Select
          value={filters.status}
          onChange={(event) => {
            setFilters((prev) => ({ ...prev, status: event.target.value }));
            setPage(1);
          }}
          className="w-36"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </Select>
        <Select
          value={filters.visibility}
          onChange={(event) => {
            setFilters((prev) => ({ ...prev, visibility: event.target.value }));
            setPage(1);
          }}
          className="w-36"
        >
          <option value="">All visibility</option>
          <option value="public">Public</option>
          <option value="internal">Internal</option>
          <option value="hidden">Hidden</option>
        </Select>
        <Select
          value={filters.categoryId}
          onChange={(event) => {
            setFilters((prev) => ({ ...prev, categoryId: event.target.value }));
            setPage(1);
          }}
          className="w-44"
        >
          <option value="">All categories</option>
          {categories.data?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <Select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className="w-36"
        >
          <option value="updatedAt">Sort: updated</option>
          <option value="createdAt">Sort: created</option>
          <option value="name">Sort: name</option>
          <option value="publishedAt">Sort: published</option>
          <option value="featured">Sort: featured</option>
        </Select>
        <Select
          value={sortDir}
          onChange={(event) => setSortDir(event.target.value as "asc" | "desc")}
          className="w-28"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </Select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={filters.includeDeleted}
            onChange={(event) => {
              setFilters((prev) => ({ ...prev, includeDeleted: event.target.checked }));
              setPage(1);
            }}
          />
          Include deleted
        </label>
      </Toolbar>

      {selected.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
          <span>{selected.length} selected</span>
          {can("products.publish") && (
            <>
              <Button size="sm" variant="outline" onClick={() => bulkStatusMutation.mutate({ ids: selected, status: "published" })}>
                Publish
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkStatusMutation.mutate({ ids: selected, status: "draft" })}>
                Unpublish
              </Button>
            </>
          )}
          {can("products.delete") && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => bulkDeleteMutation.mutate(selected)}
            >
              Delete
            </Button>
          )}
        </div>
      )}

      <Table
        headers={[
          "",
          "Product",
          "Category",
          "Status",
          "Visibility",
          "Featured",
          "Updated",
          "",
        ]}
        loading={products.isLoading}
        empty="No products match your filters."
      >
        {items.map((product) => (
          <tr key={product.id} className="hover:bg-muted/30">
            <td className="w-8 px-2 py-2.5">
              <button
                type="button"
                onClick={() => toggleRow(product.id)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Select row"
              >
                {selected.includes(product.id) ? (
                  <CheckSquare size={16} />
                ) : (
                  <Square size={16} />
                )}
              </button>
            </td>
            <td className="px-4 py-2.5">
              <div className="flex items-center gap-3">
                {product.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image.variants?.thumbnail ?? product.image.url}
                    alt={product.name}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-muted-foreground">
                    <PackageIcon />
                  </div>
                )}
                <div>
                  <a
                    href={`/products/${product.id}`}
                    className="font-medium hover:text-primary"
                  >
                    {product.name}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {product.sku ?? product.slug}
                  </p>
                </div>
              </div>
            </td>
            <td className="px-4 py-2.5 text-muted-foreground">
              {categories.data?.find((category) => category.id === product.categoryId)
                ?.name ?? "—"}
            </td>
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
            <td className="px-4 py-2.5 text-muted-foreground">{product.visibility}</td>
            <td className="px-4 py-2.5">
              {product.featured ? (
                <Badge tone="info">Featured</Badge>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </td>
            <td className="px-4 py-2.5 text-muted-foreground">
              {formatDate(product.updatedAt)}
            </td>
            <td className="px-2 py-2.5 text-right">
              <div className="flex items-center justify-end gap-1">
                {can("products.publish") && product.status !== "published" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => publishMutation.mutate({ id: product.id, publish: true })}
                  >
                    Publish
                  </Button>
                )}
                {can("products.publish") && product.status === "published" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => publishMutation.mutate({ id: product.id, publish: false })}
                  >
                    Unpublish
                  </Button>
                )}
                {filters.includeDeleted && can("products.restore") && (
                  <IconButton
                    title="Restore"
                    onClick={() => restoreMutation.mutate(product.id)}
                  >
                    <DotsThree size={16} />
                  </IconButton>
                )}
                {can("products.delete") && (
                  <IconButton
                    title="Delete"
                    onClick={() => setDeleteTarget(product)}
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </div>
            </td>
          </tr>
        ))}
      </Table>

      <Pagination
        page={page}
        totalPages={products.data?.meta.totalPages ?? 1}
        onPage={setPage}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete product"
        message={`Soft-delete "${deleteTarget?.name}"? It can be restored later.`}
        busy={deleteMutation.isPending}
      />

      <ToastHost toast={toast} dismiss={dismiss} />
    </div>
  );
}

function PackageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14" />
    </svg>
  );
}
