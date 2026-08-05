"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { ProductForm } from "@/components/products/product-form";
import { Button, Card, PageHeader, Spinner, ToastHost, useToast } from "@/components/ui";
import { apiGet, apiPatch } from "@/lib/api";
import type {
  Category,
  FilterDefinition,
  ProductDetail,
  ProductPayload,
} from "@/lib/types";

export function EditProductClient({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const { toast, show, dismiss } = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const product = useQuery({
    queryKey: ["product", id],
    queryFn: () => apiGet<ProductDetail>(`/admin/products/${id}`),
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiGet<Category[]>("/admin/categories"),
  });
  const filters = useQuery({
    queryKey: ["filters"],
    queryFn: () => apiGet<FilterDefinition[]>("/admin/filters"),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: ProductPayload) => apiPatch(`/admin/products/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      show.success("Product saved.");
      router.push("/products");
    },
    onError: (err) =>
      setFormError(err instanceof Error ? err.message : "Save failed."),
  });

  if (!can("products.update") && !can("products.read")) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view products.
      </p>
    );
  }

  if (product.isLoading || categories.isLoading || filters.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (!product.data) {
    return <p className="text-sm text-muted-foreground">Product not found.</p>;
  }

  if (!can("products.update")) {
    const detail = product.data;
    return (
      <div>
        <PageHeader
          title={detail.name}
          description="Read-only view."
          actions={
            <Button variant="outline" onClick={() => router.back()}>
              Back
            </Button>
          }
        />
        <Card className="space-y-3 p-5 text-sm">
          <Row label="Slug" value={detail.slug} />
          <Row label="SKU" value={detail.sku ?? "—"} />
          <Row label="Status" value={detail.status} />
          <Row label="Visibility" value={detail.visibility} />
          <Row label="MOQ" value={detail.moq ? String(detail.moq) : "—"} />
          <div>
            <p className="text-xs font-medium text-muted-foreground">Short description</p>
            <p className="mt-1">{detail.shortDescription || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Description</p>
            <p className="mt-1 whitespace-pre-wrap">{detail.description || "—"}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={product.data.name}
        description="Edit product details."
        actions={
          can("products.update") ? (
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          ) : undefined
        }
      />
      <Card className="p-0">
        <ProductForm
          initial={product.data}
          categories={categories.data ?? []}
          filters={filters.data ?? []}
          submitting={updateMutation.isPending}
          error={formError}
          onSubmit={(payload) =>
            updateMutation.mutateAsync(payload).then(() => undefined)
          }
          onCancel={() => router.back()}
        />
      </Card>
      <ToastHost toast={toast} dismiss={dismiss} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-right">{value}</p>
    </div>
  );
}
