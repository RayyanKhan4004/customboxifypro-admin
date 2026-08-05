"use client";

import { ImageSquare, Plus, Trash, X } from "@phosphor-icons/react";
import { useRef, useState } from "react";

import { Spinner } from "@/components/ui";
import { uploadFile, type UploadedImage } from "@/lib/media-upload";

export type ImagePickerValue = UploadedImage;

export function ImagePicker({
  value,
  onChange,
  existingUrls = {},
}: {
  value: ImagePickerValue[];
  onChange: (value: ImagePickerValue[]) => void;
  /** key → URL for already-persisted images (from the product detail response). */
  existingUrls?: Record<string, string>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [localUrls, setLocalUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    const added: ImagePickerValue[] = [];
    const urls: Record<string, string> = {};
    try {
      for (const file of Array.from(files)) {
        const uploaded = await uploadFile(file);
        urls[uploaded.key] = URL.createObjectURL(file);
        added.push({
          ...uploaded,
          order: value.length + added.length,
          isMain: value.length + added.length === 0,
        });
      }
      setLocalUrls((prev) => ({ ...prev, ...urls }));
      onChange([...value, ...added]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = (key: string) => {
    const next = value.filter((image) => image.key !== key).map((image, index) => ({
      ...image,
      order: index,
      isMain: index === 0,
    }));
    onChange(next);
  };

  const makeMain = (key: string) => {
    onChange(
      value.map((image) => ({ ...image, isMain: image.key === key })),
    );
  };

  const urlFor = (image: ImagePickerValue): string =>
    existingUrls[image.key] ?? localUrls[image.key] ?? `/${image.key}`;

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {value.map((image) => (
          <div
            key={image.key}
            className="group relative h-24 w-24 overflow-hidden rounded-md border border-border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={urlFor(image)}
              alt={image.alt || "product image"}
              className="h-full w-full object-cover"
            />
            {image.isMain && (
              <span className="absolute left-1 top-1 rounded bg-primary px-1 py-0.5 text-[10px] font-semibold text-primary-foreground">
                MAIN
              </span>
            )}
            <div className="absolute inset-0 hidden items-center justify-center gap-1 bg-black/50 group-hover:flex">
              <button
                type="button"
                className="rounded bg-white/20 p-1.5 hover:bg-white/40"
                onClick={() => makeMain(image.key)}
                title="Set as main"
              >
                <ImageSquare size={14} />
              </button>
              <button
                type="button"
                className="rounded bg-white/20 p-1.5 hover:bg-red-500/70"
                onClick={() => remove(image.key)}
                title="Remove"
              >
                <Trash size={14} />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          {busy ? <Spinner /> : <Plus size={18} />}
          <span className="text-xs">Upload</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        <X size={12} />
        Images upload to your media library. The first image is the main image
        unless another is marked MAIN.
      </p>
    </div>
  );
}
