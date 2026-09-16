"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { ProductForm } from "@/components/products/product-form";
import { Card, PageHeader, Spinner } from "@/components/ui";
import { apiGet, apiPost } from "@/lib/api";
import type { Category, ProductPayload } from "@/lib/types";

export default function NewProductPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = useAuth();

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiGet<Category[]>("/admin/categories"),
  });

  const createMutation = useMutation({
    mutationFn: (payload: ProductPayload) =>
      apiPost<{ id: string }>("/admin/products", payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      router.push(`/products/${result.id}`);
    },
  });

  if (!can("products.create")) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to create products.
      </p>
    );
  }

  if (categories.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (categories.isError)
    return (
      <p role="alert" className="text-sm text-destructive">
        {categories.error.message}
      </p>
    );

  return (
    <div>
      <PageHeader
        title="New product"
        description="Create a new catalog product."
      />
      <Card className="p-0">
        <ProductForm
          categories={categories.data ?? []}
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
