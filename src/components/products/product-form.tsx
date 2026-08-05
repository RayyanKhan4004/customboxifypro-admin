"use client";

import { useMemo, useState } from "react";

import { ImagePicker, type ImagePickerValue } from "@/components/products/image-picker";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
  Toggle,
} from "@/components/ui";
import type {
  Category,
  FilterDefinition,
  ProductDetail,
  ProductPayload,
} from "@/lib/types";

interface FormState {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  status: "draft" | "published" | "archived";
  visibility: "public" | "internal" | "hidden";
  featured: boolean;
  tags: string;
  sku: string;
  moq: string;
  dimensions: { length: string; width: string; height: string; weight: string; unit: string };
  seo: { title: string; description: string; canonicalUrl: string };
  attributes: Record<string, string>;
  images: ImagePickerValue[];
}

const emptyState: FormState = {
  name: "",
  slug: "",
  shortDescription: "",
  description: "",
  categoryId: "",
  subcategoryId: "",
  status: "draft",
  visibility: "public",
  featured: false,
  tags: "",
  sku: "",
  moq: "",
  dimensions: { length: "", width: "", height: "", weight: "", unit: "cm" },
  seo: { title: "", description: "", canonicalUrl: "" },
  attributes: {},
  images: [],
};

function attributeToInput(def: FilterDefinition, value: unknown): string {
  if (Array.isArray(value)) return value.join(",");
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value === null || value === undefined) return "";
  return String(value);
}

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
    slug: product.slug,
    shortDescription: product.shortDescription ?? "",
    description: product.description ?? "",
    categoryId: product.categoryId,
    subcategoryId: product.subcategoryId ?? "",
    status: product.status,
    visibility: product.visibility,
    featured: product.featured,
    tags: (product.tags ?? []).join(", "),
    sku: product.sku ?? "",
    moq: product.moq ? String(product.moq) : "",
    dimensions: {
      length: String((product.dimensions as { length?: number })?.length ?? ""),
      width: String((product.dimensions as { width?: number })?.width ?? ""),
      height: String((product.dimensions as { height?: number })?.height ?? ""),
      weight: String((product.dimensions as { weight?: number })?.weight ?? ""),
      unit: String((product.dimensions as { unit?: string })?.unit ?? "cm"),
    },
    seo: {
      title: String((product.seo as { title?: string })?.title ?? ""),
      description: String((product.seo as { description?: string })?.description ?? ""),
      canonicalUrl: String((product.seo as { canonicalUrl?: string })?.canonicalUrl ?? ""),
    },
    attributes: Object.fromEntries(
      Object.entries(product.attributes ?? {}).map(([key, value]) => [
        key,
        attributeToInput({ key, dataType: "string" } as FilterDefinition, value),
      ]),
    ),
    images: (product.images ?? []).map((image, index) => ({
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
  filters,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: ProductDetail;
  categories: Category[];
  filters: FilterDefinition[];
  submitting: boolean;
  error?: string | null;
  onSubmit: (payload: ProductPayload) => Promise<void>;
  onCancel?: () => void;
}) {
  const [state, setState] = useState<FormState>(() =>
    initial ? fromProduct(initial) : emptyState,
  );

  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    if (initial) setState(fromProduct(initial));
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState((prev) => ({ ...prev, [key]: value }));

  const setDim = (key: keyof FormState["dimensions"], value: string) =>
    setState((prev) => ({
      ...prev,
      dimensions: { ...prev.dimensions, [key]: value },
    }));

  const setSeo = (key: keyof FormState["seo"], value: string) =>
    setState((prev) => ({
      ...prev,
      seo: { ...prev.seo, [key]: value },
    }));

  const setAttribute = (key: string, value: string) =>
    setState((prev) => ({ ...prev, attributes: { ...prev.attributes, [key]: value } }));

  const subcategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.parentId === state.categoryId && category.isActive,
      ),
    [categories, state.categoryId],
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!state.categoryId) return;

    const attributes: Record<string, unknown> = {};
    for (const def of filters) {
      const raw = state.attributes[def.key];
      if (raw === undefined || raw.trim() === "") continue;
      if (def.dataType === "number") attributes[def.key] = Number(raw);
      else if (def.dataType === "boolean") attributes[def.key] = raw === "true";
      else if (def.dataType === "multiselect")
        attributes[def.key] = raw
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
      else attributes[def.key] = raw;
    }

    const dimensions: Record<string, unknown> = {};
    for (const key of ["length", "width", "height", "weight"] as const) {
      if (state.dimensions[key] !== "") dimensions[key] = Number(state.dimensions[key]);
    }
    if (state.dimensions.unit) dimensions.unit = state.dimensions.unit;

    const seo: Record<string, unknown> = {};
    if (state.seo.title) seo.title = state.seo.title;
    if (state.seo.description) seo.description = state.seo.description;
    if (state.seo.canonicalUrl) seo.canonicalUrl = state.seo.canonicalUrl;

    const payload: ProductPayload = {
      name: state.name,
      slug: state.slug.trim() || undefined,
      shortDescription: state.shortDescription.trim() || undefined,
      description: state.description || undefined,
      categoryId: state.categoryId,
      subcategoryId: state.subcategoryId || undefined,
      status: state.status,
      visibility: state.visibility,
      featured: state.featured,
      tags: state.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      sku: state.sku.trim() || undefined,
      moq: state.moq !== "" ? Number(state.moq) : undefined,
      images: state.images.map((image, index) => ({
        key: image.key,
        alt: image.alt,
        order: index,
        isMain: index === 0,
      })),
      attributes,
      dimensions: Object.keys(dimensions).length ? dimensions : undefined,
      seo: Object.keys(seo).length ? seo : undefined,
    };
    if (initial) payload.version = initial.version;
    await onSubmit(payload);
  };

  const indentCategories = (category: Category): string =>
    category.parentId ? "— " : "";

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <section className="space-y-4 rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name *">
            <Input
              required
              value={state.name}
              onChange={(event) => set("name", event.target.value)}
            />
          </Field>
          <Field label="Slug" hint="Leave blank to auto-generate from the name.">
            <Input
              value={state.slug}
              onChange={(event) => set("slug", event.target.value)}
            />
          </Field>
          <Field label="Category *">
            <Select
              required
              value={state.categoryId}
              onChange={(event) => {
                set("categoryId", event.target.value);
                set("subcategoryId", "");
              }}
            >
              <option value="">Select a category</option>
              {categories
                .filter((category) => category.isActive && !category.parentId)
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Subcategory">
            <Select
              value={state.subcategoryId}
              onChange={(event) => set("subcategoryId", event.target.value)}
              disabled={subcategories.length === 0}
            >
              <option value="">None</option>
              {subcategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {indentCategories(category)}
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select
              value={state.status}
              onChange={(event) => set("status", event.target.value as FormState["status"])}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>
          <Field label="Visibility">
            <Select
              value={state.visibility}
              onChange={(event) =>
                set("visibility", event.target.value as FormState["visibility"])
              }
            >
              <option value="public">Public</option>
              <option value="internal">Internal</option>
              <option value="hidden">Hidden</option>
            </Select>
          </Field>
          <Field label="SKU">
            <Input
              value={state.sku}
              onChange={(event) => set("sku", event.target.value)}
            />
          </Field>
          <Field label="MOQ (minimum order quantity)">
            <Input
              type="number"
              min="1"
              value={state.moq}
              onChange={(event) => set("moq", event.target.value)}
            />
          </Field>
          <Field label="Tags" hint="Comma separated.">
            <Input
              value={state.tags}
              onChange={(event) => set("tags", event.target.value)}
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
        <Field label="Short description">
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
          value={state.images}
          onChange={(images) => set("images", images)}
          existingUrls={initial ? existingUrls(initial) : {}}
        />
      </section>

      {filters.length > 0 && (
        <section className="space-y-4 rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Attributes</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {filters.map((def) => (
              <Field
                key={def.key}
                label={`${def.label}${def.required ? " *" : ""}`}
                hint={
                  def.dataType === "multiselect" && def.options.length
                    ? `Options: ${def.options.map((option) => option.value).join(", ")}`
                    : undefined
                }
              >
                {def.dataType === "boolean" ? (
                  <Select
                    value={state.attributes[def.key] ?? ""}
                    onChange={(event) => setAttribute(def.key, event.target.value)}
                  >
                    <option value="">—</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </Select>
                ) : def.dataType === "enum" && def.options.length ? (
                  <Select
                    value={state.attributes[def.key] ?? ""}
                    onChange={(event) => setAttribute(def.key, event.target.value)}
                  >
                    <option value="">—</option>
                    {def.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label || option.value}
                      </option>
                    ))}
                  </Select>
                ) : def.dataType === "number" ? (
                  <Input
                    type="number"
                    value={state.attributes[def.key] ?? ""}
                    onChange={(event) => setAttribute(def.key, event.target.value)}
                  />
                ) : (
                  <Input
                    value={state.attributes[def.key] ?? ""}
                    onChange={(event) => setAttribute(def.key, event.target.value)}
                  />
                )}
              </Field>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4 rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Dimensions</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {(["length", "width", "height", "weight"] as const).map((dim) => (
            <Field key={dim} label={dim}>
              <Input
                type="number"
                step="0.01"
                value={state.dimensions[dim]}
                onChange={(event) => setDim(dim, event.target.value)}
              />
            </Field>
          ))}
          <Field label="Unit">
            <Select
              value={state.dimensions.unit}
              onChange={(event) => setDim("unit", event.target.value)}
            >
              <option value="cm">cm</option>
              <option value="mm">mm</option>
              <option value="in">in</option>
              <option value="g">g</option>
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </Select>
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">SEO</h2>
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
          <Field label="Canonical URL">
            <Input
              value={state.seo.canonicalUrl}
              onChange={(event) => setSeo("canonicalUrl", event.target.value)}
            />
          </Field>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting || !state.categoryId}>
          {submitting ? "Saving…" : "Save product"}
        </Button>
      </div>
    </form>
  );
}
