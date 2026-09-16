"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import {
  ImagePicker,
  type ImagePickerValue,
} from "@/components/products/image-picker";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
  Toggle,
} from "@/components/ui";
import type { Category, ProductDetail, ProductPayload } from "@/lib/types";

interface FormState {
  name: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  status: "draft" | "published" | "archived";
  featured: boolean;
  moq: string;
  seo: { title: string; description: string; canonicalUrl: string };
  images: ImagePickerValue[];
}

const productFormSchema = z.object({
  name: z.string().trim().min(2, "Name must contain at least 2 characters."),
  shortDescription: z
    .string()
    .max(400, "Short description cannot exceed 400 characters."),
  description: z.string(),
  categoryId: z.string().min(1, "Select a category."),
  subcategoryId: z.string(),
  status: z.enum(["draft", "published", "archived"]),
  featured: z.boolean(),
  moq: z
    .string()
    .refine(
      (value) =>
        value === "" ||
        (Number.isSafeInteger(Number(value)) && Number(value) >= 1),
      "MOQ must be a whole number of at least 1.",
    ),
  seo: z.object({
    title: z.string(),
    description: z.string(),
    canonicalUrl: z
      .string()
      .trim()
      .refine((value) => {
        if (!value) return true;
        try {
          return ["https:", "http:"].includes(new URL(value).protocol);
        } catch {
          return false;
        }
      }, "Enter a valid HTTP or HTTPS URL."),
  }),
  images: z
    .array(
      z.object({
        key: z.string(),
        alt: z.string(),
        order: z.number(),
        isMain: z.boolean(),
      }),
    )
    .max(20, "A product can have at most 20 images."),
});

const emptyState: FormState = {
  name: "",
  shortDescription: "",
  description: "",
  categoryId: "",
  subcategoryId: "",
  status: "draft",
  featured: false,
  moq: "",
  seo: { title: "", description: "", canonicalUrl: "" },
  images: [],
};

function existingUrls(product?: ProductDetail): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const image of product?.images ?? []) {
    urls[image.key] = image.variants?.thumbnail ?? image.url;
  }
  return urls;
}

function fromProduct(product: ProductDetail): FormState {
  return {
    name: product.name,
    shortDescription: product.shortDescription ?? "",
    description: product.description ?? "",
    categoryId: product.categoryId,
    subcategoryId: product.subcategoryId ?? "",
    status: product.status,
    featured: product.featured,
    moq: product.moq ? String(product.moq) : "",
    seo: {
      title: String((product.seo as { title?: string })?.title ?? ""),
      description: String(
        (product.seo as { description?: string })?.description ?? "",
      ),
      canonicalUrl: String(
        (product.seo as { canonicalUrl?: string })?.canonicalUrl ?? "",
      ),
    },
    images: [...(product.images ?? [])]
      .sort((a, b) => Number(b.isMain) - Number(a.isMain) || a.order - b.order)
      .map((image, index) => ({
        key: image.key,
        alt: image.alt,
        order: index,
        isMain: image.isMain,
      })),
  };
}

export function ProductForm({
  initial,
  categories,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: ProductDetail;
  categories: Category[];
  submitting: boolean;
  error?: string | null;
  onSubmit: (payload: ProductPayload) => Promise<void>;
  onCancel?: () => void;
}) {
  const {
    formState: { errors },
    handleSubmit,
    reset,
    setValue,
    control,
  } = useForm<FormState>({
    defaultValues: initial ? fromProduct(initial) : emptyState,
    resolver: zodResolver(productFormSchema),
  });
  const state = useWatch({ control });
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    reset(initial ? fromProduct(initial) : emptyState);
  }, [initial, reset]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setValue(key, value as never, { shouldDirty: true, shouldValidate: true });

  const setSeo = (key: keyof FormState["seo"], value: string) =>
    set("seo", { ...state.seo, [key]: value });

  const subcategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.parentId === state.categoryId && category.isActive,
      ),
    [categories, state.categoryId],
  );

  const submit = async (state: FormState) => {
    if (uploadingImages || submitting) return;

    const seo: Record<string, unknown> = {};
    if (state.seo.title) seo.title = state.seo.title;
    if (state.seo.description) seo.description = state.seo.description;
    if (state.seo.canonicalUrl) seo.canonicalUrl = state.seo.canonicalUrl;

    const payload: ProductPayload = {
      name: state.name,
      shortDescription: state.shortDescription.trim(),
      description: state.description,
      categoryId: state.categoryId,
      subcategoryId: state.subcategoryId,
      status: state.status,
      featured: state.featured,
      moq: state.moq !== "" ? Number(state.moq) : null,
      images: state.images.map((image, index) => ({
        key: image.key,
        alt: image.alt,
        order: index,
        isMain: index === 0,
      })),
      seo,
    };
    if (initial) payload.version = initial.version;
    await onSubmit(payload);
  };

  const indentCategories = (category: Category): string =>
    category.parentId ? "— " : "";

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <fieldset disabled={submitting} className="space-y-6">
        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="space-y-4 rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name *" error={errors.name?.message}>
              <Input
                required
                value={state.name}
                onChange={(event) => set("name", event.target.value)}
              />
            </Field>
            <Field label="Category *" error={errors.categoryId?.message}>
              <Select
                required
                value={state.categoryId}
                onChange={(v) => {
                  set("categoryId", v);
                  set("subcategoryId", "");
                }}
                options={[
                  { value: "", label: "Select a category" },
                  ...categories
                    .filter(
                      (category) => category.isActive && !category.parentId,
                    )
                    .map((category) => ({
                      value: category.id,
                      label: category.name,
                    })),
                ]}
              />
            </Field>
            <Field label="Subcategory">
              <Select
                value={state.subcategoryId}
                onChange={(v) => set("subcategoryId", v)}
                disabled={subcategories.length === 0}
                options={[
                  { value: "", label: "None" },
                  ...subcategories.map((category) => ({
                    value: category.id,
                    label: `${indentCategories(category)}${category.name}`,
                  })),
                ]}
              />
            </Field>
            <Field label="Status">
              <Select
                value={state.status}
                onChange={(v) => set("status", v as FormState["status"])}
                options={[
                  { value: "draft", label: "Draft" },
                  { value: "published", label: "Published" },
                  { value: "archived", label: "Archived" },
                ]}
              />
            </Field>
            <Field
              label="MOQ (minimum order quantity)"
              error={errors.moq?.message}
            >
              <Input
                type="number"
                min="1"
                value={state.moq}
                onChange={(event) => set("moq", event.target.value)}
              />
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <Toggle
              checked={state.featured}
              onChange={(featured) => set("featured", featured)}
              label="Featured"
            />
            <span className="text-sm">Featured product</span>
          </div>
          <Field
            label="Short description"
            error={errors.shortDescription?.message}
          >
            <Textarea
              rows={2}
              value={state.shortDescription}
              onChange={(event) => set("shortDescription", event.target.value)}
            />
          </Field>
          <Field label="Description">
            <Textarea
              rows={6}
              value={state.description}
              onChange={(event) => set("description", event.target.value)}
            />
          </Field>
        </section>

        <section className="space-y-4 rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Images</h2>
          <ImagePicker
            onUploadingChange={setUploadingImages}
            value={state.images}
            onChange={(images) => set("images", images)}
            existingUrls={initial ? existingUrls(initial) : {}}
          />
        </section>

        <details
          className="space-y-4 rounded-lg border border-border bg-card p-5"
          open={errors.seo ? true : undefined}
        >
          <summary className="cursor-pointer text-sm font-semibold">
            SEO settings (optional)
          </summary>
          <div className="grid grid-cols-1 gap-4">
            <Field label="SEO title">
              <Input
                value={state.seo.title}
                onChange={(event) => setSeo("title", event.target.value)}
              />
            </Field>
            <Field label="SEO description">
              <Textarea
                rows={2}
                value={state.seo.description}
                onChange={(event) => setSeo("description", event.target.value)}
              />
            </Field>
            <Field
              label="Canonical URL"
              error={errors.seo?.canonicalUrl?.message}
            >
              <Input
                value={state.seo.canonicalUrl}
                onChange={(event) => setSeo("canonicalUrl", event.target.value)}
              />
            </Field>
          </div>
        </details>

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={submitting || uploadingImages}>
            {submitting ? "Saving…" : "Save product"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
