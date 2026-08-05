// API contract types mirroring the backend response DTOs and schemas.

export interface PageMeta {
  limit: number;
  page: number;
  total: number;
  totalPages: number;
}

export interface Paged<T> {
  data: T[];
  meta: PageMeta;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorBody {
  success: false;
  statusCode: number;
  code: string;
  message: string;
  details: ApiErrorDetail[];
  requestId: string;
}

export type Permission =
  | "products.read"
  | "products.create"
  | "products.update"
  | "products.delete"
  | "products.restore"
  | "products.publish"
  | "products.bulk-import"
  | "categories.manage"
  | "filters.manage"
  | "media.manage"
  | "requests.read"
  | "requests.update"
  | "requests.assign"
  | "admins.read"
  | "admins.invite"
  | "admins.update"
  | "roles.manage"
  | "audit-logs.read"
  | "settings.manage";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  roleId: string;
  roleKey: string;
  permissions: string[];
  twoFactorEnabled: boolean;
  lastLoginAt?: string | null;
  createdAt?: string | null;
}

export interface AdminSessionResponse {
  admin: AdminUser;
  accessTokenExpiresIn: string;
}

export interface ProductImageResponse {
  key: string;
  url: string;
  variants: Record<string, string>;
  alt: string;
  isMain: boolean;
}

export interface ProductImageInput {
  key: string;
  alt: string;
  order: number;
  isMain: boolean;
}

export interface ProductPayload {
  name: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  categoryId: string;
  subcategoryId?: string;
  status?: "draft" | "published" | "archived";
  visibility?: "public" | "internal" | "hidden";
  featured?: boolean;
  tags?: string[];
  sku?: string;
  images?: ProductImageInput[];
  attributes?: Record<string, unknown>;
  dimensions?: Record<string, unknown>;
  moq?: number;
  customizableProperties?: unknown;
  seo?: Record<string, unknown>;
  /** Required when updating (optimistic concurrency). */
  version?: number;
}

export interface ProductListItem {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  categoryId: string;
  subcategoryId: string | null;
  status: "draft" | "published" | "archived";
  visibility: "public" | "internal" | "hidden";
  featured: boolean;
  tags: string[];
  sku: string | null;
  image: ProductImageResponse | null;
  publishedAt: string | null;
  updatedAt: string;
  version: number;
}

export interface ProductDetail extends ProductListItem {
  description: string;
  images: ProductImageResponse[];
  attributes: Record<string, unknown>;
  dimensions: Record<string, unknown>;
  moq: number | null;
  customizableProperties: unknown;
  seo: Record<string, unknown>;
  createdAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  imageKey: string | null;
  sortOrder: number;
  isActive: boolean;
  seo: { title: string; description: string };
}

export interface FilterDefinition {
  id: string;
  name: string;
  key: string;
  label: string;
  dataType: "string" | "number" | "boolean" | "enum" | "multiselect";
  categoryScope: string[];
  options: { value: string; label: string }[];
  searchable: boolean;
  filterable: boolean;
  sortable: boolean;
  required: boolean;
  multiple: boolean;
  displayOrder: number;
  validation: { min?: number; max?: number; pattern?: string; required?: boolean };
  isActive: boolean;
}

export interface Role {
  id: string;
  name: string;
  key: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  status: "active" | "inactive";
  adminCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRecord {
  id: string;
  email: string;
  name: string;
  status: "active" | "invited" | "disabled";
  roleId: string;
  roleKey: string | null;
  roleName: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem {
  _id: string;
  id?: string;
  key: string;
  uploadId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  status: "pending" | "processing" | "ready" | "failed";
  alt: string;
  order: number;
  isMain: boolean;
  variants: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface PresignResponse {
  mediaId: string;
  uploadId: string;
  key: string;
  url: string;
  method: string;
  expiresIn: number;
}

export interface BulkImport {
  _id: string;
  fileName: string;
  fileKey: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  mode: "draft" | "all-or-nothing";
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  rowErrors: { row?: number; field?: string; code: string; message: string }[];
  createdBy: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerRequest {
  _id: string;
  requestType:
    | "custom-quote"
    | "pricing"
    | "bulk-order"
    | "sampling"
    | "other";
  customRequestType: string | null;
  contact: { name: string; email: string; phone?: string; company?: string };
  productName: string | null;
  quantity: number | null;
  specs: Record<string, unknown>;
  notes: string | null;
  attachments: string[];
  status:
    | "new"
    | "in-review"
    | "quoted"
    | "approved"
    | "rejected"
    | "cancelled"
    | "won"
    | "lost";
  assignedTo: string | null;
  assignedAt: string | null;
  consent: boolean;
  staffNotes: { text: string; adminId?: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string | null;
  actorType: string;
  action: string;
  resourceType: string;
  resourceId: string;
  ip?: string;
  requestId?: string;
  createdAt: string;
}

export const REQUEST_TYPES = [
  "custom-quote",
  "pricing",
  "bulk-order",
  "sampling",
  "other",
] as const;

export const REQUEST_STATUSES = [
  "new",
  "in-review",
  "quoted",
  "approved",
  "rejected",
  "cancelled",
  "won",
  "lost",
] as const;
