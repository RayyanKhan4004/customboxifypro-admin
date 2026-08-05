import { apiPost } from "./api";
import type { PresignResponse } from "./types";

export interface UploadedImage {
  key: string;
  alt: string;
  order: number;
  isMain: boolean;
}

/** Presign → PUT to R2 → complete. Returns the object key. */
export async function uploadFile(file: File): Promise<UploadedImage> {
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
