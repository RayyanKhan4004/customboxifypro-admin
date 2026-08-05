"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { ProductForm } from "@/components/products/product-form";
import { Card, PageHeader, Spinner } from "@/components/ui";
import { apiGet, apiPost } from "@/lib/api";
import type { Category, FilterDefinition, ProductPayload } from "@/lib/types";

export default function NewProductPage() {
  const router = useRouter();
  const { can } = useAuth();

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiGet<Category[]>("/admin/categories"),
  });
  const filters = useQuery({
    queryKey: ["filters"],
    queryFn: () => apiGet<FilterDefinition[]>("/admin/filters"),
  });

  const createMutation = useMutation({
    mutationFn: (payload: ProductPayload) => apiPost("/admin/products", payload),
    onSuccess: (result) => {
      router.push(`/products/${(result as { id: string }).id}`);
    },
  });

  if (!can("products.create")) {
    return <p className="text-sm text-muted-foreground">You do not have permission to create products.</p>;
  }

  if (categories.isLoading || filters.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="New product"
        description="Create a new catalog product."
      />
      <Card className="p-0">
        <ProductForm
          categories={categories.data ?? []}
          filters={filters.data ?? []}
          submitting={createMutation.isPending}
          error={
            createMutation.isError
              ? createMutation.error instanceof Error
                ? createMutation.error.message
                : "Save failed."
              : null
          }
          onSubmit={(payload) =>
            createMutation.mutateAsync(payload).then(() => undefined)
          }
          onCancel={() => router.back()}
        />
      </Card>
    </div>
  );
}
