import { apiPost } from "./api";
import type { PresignResponse } from "./types";

export interface UploadedImage {
  key: string;
  alt: string;
  order: number;
  isMain: boolean;
}

const MAX_FILE_NAME_LENGTH = 255;
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const DOCUMENT_MIME_TYPES = new Set(["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
const IMAGE_MAX_SIZE_BYTES = 10 * 1024 * 1024;
const VIDEO_MAX_SIZE_BYTES = 100 * 1024 * 1024;
const DOCUMENT_MAX_SIZE_BYTES = 25 * 1024 * 1024;

function validateFile(file: File, imagesOnly = false): void {
  if (file.name.length > MAX_FILE_NAME_LENGTH) {
    throw new Error("Image filename must be 255 characters or fewer.");
  }
  if (imagesOnly && !IMAGE_MIME_TYPES.has(file.type)) {
    throw new Error("Product images must be JPG, PNG, WebP, or GIF files.");
  }
  const limit = IMAGE_MIME_TYPES.has(file.type) ? IMAGE_MAX_SIZE_BYTES : VIDEO_MIME_TYPES.has(file.type) ? VIDEO_MAX_SIZE_BYTES : DOCUMENT_MIME_TYPES.has(file.type) ? DOCUMENT_MAX_SIZE_BYTES : null;
  if (!limit) throw new Error("Upload a supported image, video, PDF, DOC, or DOCX file.");
  if (file.size > limit) {
    throw new Error("This file exceeds the allowed size for its type.");
  }
}

/** Presign → PUT to R2 → complete. Returns the object key. */
export async function uploadFile(file: File): Promise<UploadedImage> {
  validateFile(file);
  const presign = await apiPost<PresignResponse>("/admin/media/presign", {
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  });

  const response = await fetch(presign.url, {
    method: presign.method,
    body: file,
  });
  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}.`);
  }

  await apiPost(`/admin/media/${presign.mediaId}/complete`, {
    uploadId: presign.uploadId,
  });

  return { key: presign.key, alt: "", order: 0, isMain: false };
}

export async function uploadImageFile(file: File): Promise<UploadedImage> {
  validateFile(file, true);
  return uploadFile(file);
}
