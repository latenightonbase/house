"use client";

import { useCallback, useEffect, useId, useRef, useState, type DragEvent, type MouseEvent } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { BrandAvatar } from "@/components/ui/BrandAvatar";
import { isUnoptimizedSrc } from "@/lib/imageSrc";
import { resizeImageToFile } from "@/lib/resizeImage";
import { uploadImage, validateImageFile, type UploadPurpose } from "@/lib/uploadImage";
import { cn } from "@/lib/utils";

type Variant = "artwork" | "avatar";

type Props = {
  variant: Variant;
  value?: string | null;
  onUploaded: (url: string | null) => void;
  disabled?: boolean;
  fallbackSeed?: string;
  alt?: string;
  id?: string;
};

function purposeFor(variant: Variant): UploadPurpose {
  return variant === "avatar" ? "avatar" : "project";
}

function acceptFor(variant: Variant) {
  return variant === "avatar"
    ? "image/jpeg,image/png,image/webp"
    : "image/jpeg,image/png,image/webp,image/gif";
}

export function ImageUploader({
  variant,
  value,
  onUploaded,
  disabled,
  fallbackSeed,
  alt = "Upload image",
  id,
}: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const localPreviewRef = useRef<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const preview = localPreview || value || null;
  const purpose = purposeFor(variant);
  const busy = disabled || uploading;

  const replaceLocalPreview = (next: string | null) => {
    if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    localPreviewRef.current = next;
    setLocalPreview(next);
  };

  useEffect(() => {
    return () => {
      if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    };
  }, []);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file || busy) return;
      const invalid = validateImageFile(file, purpose);
      if (invalid) {
        setError(invalid);
        return;
      }

      replaceLocalPreview(URL.createObjectURL(file));
      setError(null);
      setUploading(true);
      try {
        const toUpload = purpose === "avatar" ? await resizeImageToFile(file) : file;
        const publicUrl = await uploadImage(toUpload, purpose);
        onUploaded(publicUrl);
        replaceLocalPreview(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not upload image.");
        replaceLocalPreview(null);
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [busy, onUploaded, purpose],
  );

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!busy) setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    void handleFile(e.dataTransfer.files[0]);
  };

  const openPicker = () => {
    if (!busy) inputRef.current?.click();
  };

  const remove = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setError(null);
    replaceLocalPreview(null);
    onUploaded(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const input = (
    <input
      ref={inputRef}
      id={inputId}
      type="file"
      accept={acceptFor(variant)}
      className="sr-only"
      disabled={busy}
      onChange={(e) => {
        void handleFile(e.target.files?.[0]);
      }}
    />
  );

  if (variant === "avatar") {
    return (
      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={busy}
          onClick={openPicker}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          aria-label="Upload profile picture"
          className={cn(
            "group relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            isDragging && "ring-2 ring-primary/60",
            busy && "cursor-wait",
          )}
        >
          <BrandAvatar
            key={preview || fallbackSeed || "avatar"}
            src={preview}
            alt={alt}
            fallbackSeed={fallbackSeed}
            size={72}
          />
          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white transition-opacity",
              uploading ? "opacity-100" : "opacity-100 lg:opacity-0 lg:group-hover:opacity-100",
            )}
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          </span>
        </button>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white">Profile picture</p>
          <p className="mt-0.5 text-[11px] text-caption">
            Drag and drop or click. JPEG, PNG, or WebP.
          </p>
          <div className="mt-1.5 flex items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={openPicker}
              className="text-[12px] font-semibold text-primary-light hover:text-white disabled:opacity-50"
            >
              {preview ? "Change photo" : "Upload photo"}
            </button>
            {value ? (
              <button
                type="button"
                disabled={busy}
                onClick={remove}
                className="text-[12px] font-semibold text-caption hover:text-white disabled:opacity-50"
              >
                Remove
              </button>
            ) : null}
          </div>
          {error ? <p className="mt-1 text-[11px] text-negative">{error}</p> : null}
        </div>
        {input}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {!preview ? (
        <button
          type="button"
          disabled={busy}
          onClick={openPicker}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "w-full rounded-lg border border-dashed px-4 py-7 text-center transition-colors",
            "bg-surface-2 outline-none focus-visible:border-primary/60",
            isDragging ? "border-primary/70 bg-primary/5" : "border-line hover:border-primary/50",
            busy && "cursor-wait opacity-70",
          )}
        >
          <ImagePlus className="mx-auto mb-2 h-6 w-6 text-caption" />
          <p className="text-[13px] font-semibold text-white">
            {uploading ? "Uploading…" : "Drop an image here"}
          </p>
          <p className="mt-0.5 text-[11px] text-caption">or click to browse · JPEG, PNG, WebP, GIF · 5MB max</p>
        </button>
      ) : (
        <div
          className={cn(
            "relative overflow-hidden rounded-lg border border-line bg-surface-2",
            isDragging && "ring-2 ring-primary/60",
          )}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <div className="relative h-40 w-full">
            <Image
              src={preview}
              alt={alt}
              fill
              sizes="400px"
              unoptimized={isUnoptimizedSrc(preview)}
              className="object-cover"
            />
          </div>
          {uploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          ) : (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              aria-label="Remove image"
              className="absolute top-2 right-2 rounded-full bg-black/70 p-1.5 text-white hover:bg-black disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
      {error ? <p className="text-[11px] text-negative">{error}</p> : null}
      {input}
    </div>
  );
}
