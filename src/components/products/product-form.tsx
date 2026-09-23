"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { ImagePicker, type ImagePickerValue } from "@/components/products/image-picker";
import { Button, Checkbox, Field, Input, Select, Textarea, Toggle } from "@/components/ui";
import { apiGet } from "@/lib/api";
import type { Category, FilterDefinition, ProductDetail, ProductPayload } from "@/lib/types";

type DimensionUnit = "mm" | "cm" | "in";

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
  dimensions: { length: string; width: string; height: string; weight: string; unit: DimensionUnit };
  attributes: Record<string, unknown>;
  customizableProperties: string;
  seo: { title: string; description: string; canonicalUrl: string };
  images: ImagePickerValue[];
}

const optionalNonNegativeNumber = z.string().refine(
  (value) => value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0),
  "Enter zero or a positive number.",
);

const productFormSchema = z.object({
  name: z.string().trim().min(2, "Name must contain at least 2 characters."),
  slug: z.string().trim().refine(
    (value) => value === "" || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
    "Use lowercase letters, numbers, and single hyphens.",
  ),
  shortDescription: z.string().max(400, "Short description cannot exceed 400 characters."),
  description: z.string(),
  categoryId: z.string().min(1, "Select a category."),
  subcategoryId: z.string(),
  status: z.enum(["draft", "published", "archived"]),
  visibility: z.enum(["public", "internal", "hidden"]),
  featured: z.boolean(),
  tags: z.string().refine(
    (value) => value.split(",").map((tag) => tag.trim()).filter(Boolean).length <= 50,
    "A product can have at most 50 tags.",
  ),
  sku: z.string().max(100, "SKU cannot exceed 100 characters."),
  moq: z.string().refine(
    (value) => value === "" || (Number.isSafeInteger(Number(value)) && Number(value) >= 1),
    "MOQ must be a whole number of at least 1.",
  ),
  dimensions: z.object({
    length: optionalNonNegativeNumber,
    width: optionalNonNegativeNumber,
    height: optionalNonNegativeNumber,
    weight: optionalNonNegativeNumber,
    unit: z.enum(["mm", "cm", "in"]),
  }),
  attributes: z.record(z.string(), z.unknown()),
  customizableProperties: z.string().refine((value) => {
    if (!value.trim()) return true;
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed);
    } catch {
      return false;
    }
  }, "Enter a valid JSON object."),
  seo: z.object({
    title: z.string(),
    description: z.string(),
    canonicalUrl: z.string().trim().refine((value) => {
      if (!value) return true;
      try {
        return ["https:", "http:"].includes(new URL(value).protocol);
      } catch {
        return false;
      }
    }, "Enter a valid HTTP or HTTPS URL."),
  }),
  images: z.array(z.object({
    key: z.string().min(1), alt: z.string(), order: z.number().int().min(0), isMain: z.boolean(),
  })).max(20, "A product can have at most 20 images."),
});

const emptyState: FormState = {
  name: "", slug: "", shortDescription: "", description: "", categoryId: "", subcategoryId: "",
  status: "draft", visibility: "public", featured: false, tags: "", sku: "", moq: "",
  dimensions: { length: "", width: "", height: "", weight: "", unit: "cm" },
  attributes: {}, customizableProperties: "",
  seo: { title: "", description: "", canonicalUrl: "" }, images: [],
};

function existingUrls(product?: ProductDetail): Record<string, string> {
  return Object.fromEntries((product?.images ?? []).map((image) => [image.key, image.variants?.thumbnail ?? image.url]));
}

function dimensionValue(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function fromProduct(product: ProductDetail): FormState {
  const dimensions = product.dimensions ?? {};
  const custom = product.customizableProperties;
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
      length: dimensionValue(dimensions.length), width: dimensionValue(dimensions.width),
      height: dimensionValue(dimensions.height), weight: dimensionValue(dimensions.weight),
      unit: (["mm", "cm", "in"].includes(String(dimensions.unit)) ? dimensions.unit : "cm") as DimensionUnit,
    },
    attributes: product.attributes ?? {},
    customizableProperties: custom && typeof custom === "object" ? JSON.stringify(custom, null, 2) : "",
    seo: {
      title: String((product.seo as { title?: string })?.title ?? ""),
      description: String((product.seo as { description?: string })?.description ?? ""),
      canonicalUrl: String((product.seo as { canonicalUrl?: string })?.canonicalUrl ?? ""),
    },
    images: [...(product.images ?? [])].sort((a, b) => Number(b.isMain) - Number(a.isMain)).map((image, index) => ({
      key: image.key, alt: image.alt, order: index, isMain: image.isMain,
    })),
  };
}

function appliesToCategory(definition: FilterDefinition, categoryId: string): boolean {
  return definition.categoryScope.includes("all") || definition.categoryScope.includes(categoryId);
}

export function ProductForm({ initial, categories, submitting, error, onSubmit, onCancel }: {
  initial?: ProductDetail;
  categories: Category[];
  submitting: boolean;
  error?: string | null;
  onSubmit: (payload: ProductPayload) => Promise<void>;
  onCancel?: () => void;
}) {
  const { formState: { errors }, handleSubmit, reset, setValue, control } = useForm<FormState>({
    defaultValues: initial ? fromProduct(initial) : emptyState,
    resolver: zodResolver(productFormSchema),
  });
  const watched = useWatch({ control });
  const state = {
    ...emptyState, ...watched,
    dimensions: { ...emptyState.dimensions, ...watched.dimensions },
    seo: { ...emptyState.seo, ...watched.seo },
    attributes: watched.attributes ?? {},
    images: (watched.images ?? []) as ImagePickerValue[],
  } as FormState;
  const [uploadingImages, setUploadingImages] = useState(false);
  const [attributeErrors, setAttributeErrors] = useState<Record<string, string>>({});
  const definitions = useQuery({
    queryKey: ["product-filter-definitions"],
    queryFn: () => apiGet<FilterDefinition[]>("/filters/editor"),
  });

  useEffect(() => reset(initial ? fromProduct(initial) : emptyState), [initial, reset]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setValue(key, value as never, { shouldDirty: true, shouldValidate: true });
  const setSeo = (key: keyof FormState["seo"], value: string) => set("seo", { ...state.seo, [key]: value });
  const setDimension = (key: keyof FormState["dimensions"], value: string) => set("dimensions", { ...state.dimensions, [key]: value });
  const setAttribute = (key: string, value: unknown) => {
    set("attributes", { ...state.attributes, [key]: value });
    setAttributeErrors((current) => { const next = { ...current }; delete next[key]; return next; });
  };

  const subcategories = categories.filter(
    (category) => category.parentId === state.categoryId && category.isActive,
  );
  const applicableDefinitions = (definitions.data ?? [])
    .filter(
      (definition) =>
        definition.isActive && appliesToCategory(definition, state.categoryId),
    )
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const submit = async (form: FormState) => {
    if (uploadingImages || submitting || definitions.isLoading || definitions.isError) return;
    const dynamicErrors: Record<string, string> = {};
    for (const definition of applicableDefinitions) {
      const value = form.attributes[definition.key];
      const missing = value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
      if (definition.required && missing) dynamicErrors[definition.key] = "This attribute is required.";
      if (!missing && definition.dataType === "number") {
        const number = Number(value);
        if (!Number.isFinite(number)) dynamicErrors[definition.key] = "Enter a number.";
        else if (definition.validation.min !== undefined && number < definition.validation.min) dynamicErrors[definition.key] = `Minimum is ${definition.validation.min}.`;
        else if (definition.validation.max !== undefined && number > definition.validation.max) dynamicErrors[definition.key] = `Maximum is ${definition.validation.max}.`;
      }
    }
    setAttributeErrors(dynamicErrors);
    if (Object.keys(dynamicErrors).length > 0) return;

    const dimensions = Object.fromEntries(Object.entries(form.dimensions)
      .filter(([key, value]) => key === "unit" || value !== "")
      .map(([key, value]) => [key, key === "unit" ? value : Number(value)]));
    const attributes = Object.fromEntries(applicableDefinitions
      .map((definition) => [definition.key, form.attributes[definition.key]])
      .filter(([, value]) => value !== undefined && value !== "" && (!Array.isArray(value) || value.length > 0)));
    const seo = Object.fromEntries(Object.entries(form.seo).filter(([, value]) => value.trim() !== ""));
    const custom = form.customizableProperties.trim() ? JSON.parse(form.customizableProperties) as Record<string, unknown> : null;
    const payload: ProductPayload = {
      name: form.name.trim(),
      ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
      shortDescription: form.shortDescription.trim(), description: form.description,
      categoryId: form.categoryId, subcategoryId: form.subcategoryId,
      status: form.status, visibility: form.visibility, featured: form.featured,
      tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      sku: form.sku.trim() || null,
      moq: form.moq !== "" ? Number(form.moq) : null,
      dimensions, attributes, customizableProperties: custom,
      images: form.images.map((image, index) => ({ ...image, order: index, isMain: index === 0 })),
      seo,
    };
    if (initial) payload.version = initial.version;
    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <fieldset disabled={submitting} className="space-y-6">
        {error && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
        {definitions.isError && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">Product attributes could not be loaded. Reload before saving so existing data is not lost.</div>}

        <section className="space-y-4 rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name *" tooltip="Customer-facing product name. It must contain at least two characters." error={errors.name?.message}><Input required value={state.name} onChange={(event) => set("name", event.target.value)} /></Field>
            <Field label="Slug" tooltip="URL-safe product identifier. Leave blank on creation to generate it from the name." error={errors.slug?.message}><Input placeholder="kraft-mailer-box" value={state.slug} onChange={(event) => set("slug", event.target.value.toLowerCase())} /></Field>
            <Field label="Category *" tooltip="Primary category used for navigation and to determine which dynamic attributes apply." error={errors.categoryId?.message}><Select required value={state.categoryId} onChange={(value) => { set("categoryId", value); set("subcategoryId", ""); }} options={[{ value: "", label: "Select a category" }, ...categories.filter((category) => category.isActive && !category.parentId).map((category) => ({ value: category.id, label: category.name }))]} /></Field>
            <Field label="Subcategory" tooltip="Optional child category. Available values depend on the primary category."><Select value={state.subcategoryId} onChange={(value) => set("subcategoryId", value)} disabled={subcategories.length === 0} options={[{ value: "", label: "None" }, ...subcategories.map((category) => ({ value: category.id, label: category.name }))]} /></Field>
            <Field label="Status" tooltip="Draft is not public, published is live when visibility is public, and archived is inactive."><Select value={state.status} onChange={(value) => set("status", value as FormState["status"])} options={[{ value: "draft", label: "Draft" }, { value: "published", label: "Published" }, { value: "archived", label: "Archived" }]} /></Field>
            <Field label="Visibility" tooltip="Public products appear to customers; internal and hidden products stay out of the public catalog."><Select value={state.visibility} onChange={(value) => set("visibility", value as FormState["visibility"])} options={[{ value: "public", label: "Public" }, { value: "internal", label: "Internal" }, { value: "hidden", label: "Hidden" }]} /></Field>
            <Field label="SKU" tooltip="Optional unique internal stock-keeping code, limited to 100 characters." error={errors.sku?.message}><Input maxLength={100} value={state.sku} onChange={(event) => set("sku", event.target.value)} /></Field>
            <Field label="MOQ" tooltip="Minimum order quantity. It must be a whole number of at least one." error={errors.moq?.message}><Input type="number" min="1" step="1" value={state.moq} onChange={(event) => set("moq", event.target.value)} /></Field>
            <Field label="Tags" tooltip="Comma-separated search and merchandising labels. The backend accepts up to 50 tags." error={errors.tags?.message}><Input placeholder="kraft, eco-friendly" value={state.tags} onChange={(event) => set("tags", event.target.value)} /></Field>
            <Field label="Featured" tooltip="Marks this product for featured placements controlled by the client experience."><div className="flex h-10 items-center gap-2"><Toggle checked={state.featured} onChange={(featured) => set("featured", featured)} label="Featured product" /><span className="text-sm">Featured product</span></div></Field>
          </div>
          <Field label="Short description" tooltip="Compact summary used on product cards and list results; maximum 400 characters." error={errors.shortDescription?.message}><Textarea rows={2} maxLength={400} value={state.shortDescription} onChange={(event) => set("shortDescription", event.target.value)} /></Field>
          <Field label="Description" tooltip="Full product description returned on the product detail endpoint."><Textarea rows={6} value={state.description} onChange={(event) => set("description", event.target.value)} /></Field>
        </section>

        <section className="space-y-4 rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Dimensions</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {(["length", "width", "height", "weight"] as const).map((key) => <Field key={key} label={key[0].toUpperCase() + key.slice(1)} tooltip={`${key[0].toUpperCase() + key.slice(1)} stored with this product. Use zero or a positive number.`} error={errors.dimensions?.[key]?.message}><Input type="number" min="0" step="any" value={state.dimensions[key]} onChange={(event) => setDimension(key, event.target.value)} /></Field>)}
            <Field label="Unit" tooltip="Unit used for length, width, and height values."><Select value={state.dimensions.unit} onChange={(value) => setDimension("unit", value)} options={[{ value: "mm", label: "Millimetres" }, { value: "cm", label: "Centimetres" }, { value: "in", label: "Inches" }]} /></Field>
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Product attributes</h2>
          {definitions.isLoading ? <p className="text-sm text-muted-foreground">Loading backend-defined fields…</p> : applicableDefinitions.length === 0 ? <p className="text-sm text-muted-foreground">No active attributes apply to this category.</p> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{applicableDefinitions.map((definition) => <DynamicAttributeField key={definition.key} definition={definition} value={state.attributes[definition.key]} error={attributeErrors[definition.key]} onChange={(value) => setAttribute(definition.key, value)} />)}</div>}
        </section>

        <section className="space-y-4 rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Images and customization</h2>
          <Field label="Product images" tooltip="Upload up to 20 images. The first image is saved as the main product image." error={errors.images?.message}><div><ImagePicker onUploadingChange={setUploadingImages} value={state.images} onChange={(images) => set("images", images)} existingUrls={initial ? existingUrls(initial) : {}} /></div></Field>
          <Field label="Customizable properties" tooltip="Structured JSON configuration for product-specific customization options. Enter a JSON object or leave blank." error={errors.customizableProperties?.message}><Textarea rows={5} placeholder={'{"printSides":["inside","outside"]}'} value={state.customizableProperties} onChange={(event) => set("customizableProperties", event.target.value)} /></Field>
        </section>

        <details className="space-y-4 rounded-lg border border-border bg-card p-5" open={errors.seo ? true : undefined}>
          <summary className="cursor-pointer text-sm font-semibold">SEO settings (optional)</summary>
          <div className="mt-4 grid grid-cols-1 gap-4">
            <Field label="SEO title" tooltip="Optional browser and search-result title override."><Input value={state.seo.title} onChange={(event) => setSeo("title", event.target.value)} /></Field>
            <Field label="SEO description" tooltip="Optional search-result description override."><Textarea rows={2} value={state.seo.description} onChange={(event) => setSeo("description", event.target.value)} /></Field>
            <Field label="Canonical URL" tooltip="Optional absolute HTTP or HTTPS URL declaring the preferred product page." error={errors.seo?.canonicalUrl?.message}><Input type="url" value={state.seo.canonicalUrl} onChange={(event) => setSeo("canonicalUrl", event.target.value)} /></Field>
          </div>
        </details>

        <div className="flex justify-end gap-2">
          {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
          <Button type="submit" disabled={submitting || uploadingImages || definitions.isLoading || definitions.isError}>{submitting ? "Saving…" : "Save product"}</Button>
        </div>
      </fieldset>
    </form>
  );
}

function DynamicAttributeField({ definition, value, error, onChange }: {
  definition: FilterDefinition; value: unknown; error?: string; onChange: (value: unknown) => void;
}) {
  const label = `${definition.label}${definition.required ? " *" : ""}`;
  const tooltip = `${definition.name}. This field is defined and validated by the backend${definition.filterable ? " and is available as a customer filter" : ""}.`;
  if (definition.dataType === "boolean") return <Field label={label} tooltip={tooltip} error={error}><Select value={value === true ? "true" : value === false ? "false" : ""} onChange={(next) => onChange(next === "" ? undefined : next === "true")} options={[{ value: "", label: "Not set" }, { value: "true", label: "Yes" }, { value: "false", label: "No" }]} /></Field>;
  if (definition.dataType === "enum") return <Field label={label} tooltip={tooltip} error={error}><Select value={typeof value === "string" ? value : ""} onChange={onChange} options={[{ value: "", label: "Select a value" }, ...definition.options]} /></Field>;
  if (definition.dataType === "multiselect") {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return <Field label={label} tooltip={tooltip} error={error}><div className="space-y-2 rounded-md border border-input p-3">{definition.options.map((option) => <label key={option.value} className="flex items-center gap-2 text-sm"><Checkbox checked={selected.includes(option.value)} onChange={(event) => onChange(event.target.checked ? [...selected, option.value] : selected.filter((item) => item !== option.value))} />{option.label}</label>)}</div></Field>;
  }
  return <Field label={label} tooltip={tooltip} error={error}><Input type={definition.dataType === "number" ? "number" : "text"} min={definition.validation.min} max={definition.validation.max} value={value === undefined ? "" : String(value)} onChange={(event) => onChange(event.target.value)} /></Field>;
}
