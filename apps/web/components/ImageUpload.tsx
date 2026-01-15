"use client";

import { useState, useRef, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { RiImageAddLine, RiCloseLine, RiLoader5Fill } from "react-icons/ri";
import toast from "react-hot-toast";

interface ImageUploadProps {
  onUploadComplete: (imageUrl: string, imageKey: string) => void;
  onRemove?: () => void;
  currentImageUrl?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function ImageUpload({
  onUploadComplete,
  onRemove,
  currentImageUrl,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(
    currentImageUrl || null
  );
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { getAccessToken } = usePrivy();

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Invalid file type. Please upload JPEG, PNG, WebP, or GIF images.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File size exceeds 5MB limit.";
    }
    return null;
  };

  const uploadToS3 = async (file: File) => {
    try {
      setUploading(true);
      setUploadProgress(10);

      // Get presigned URL
      const accessToken = await getAccessToken();
      const presignedResponse = await fetch("/api/upload/presigned-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          contentType: file.type,
          filename: file.name,
        }),
      });

      if (!presignedResponse.ok) {
        const errorData = await presignedResponse.json();
        throw new Error(errorData.error || "Failed to get upload URL");
      }

      const { uploadUrl, imageUrl, key } = await presignedResponse.json();
      setUploadProgress(30);

      // Upload to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image to S3");
      }

      setUploadProgress(100);
      setImagePreview(imageUrl);
      onUploadComplete(imageUrl, key);
      toast.success("Image uploaded successfully!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload image");
      setImagePreview(null);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to S3
    await uploadToS3(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        await handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileSelect(files[0]);
    }
  };

  const handleRemove = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div className="w-full">
      {!imagePreview ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-all duration-200
            ${
              isDragging
                ? "border-primary bg-primary/10 scale-105"
                : "border-gray-300 hover:border-primary/50 hover:bg-gray-400/5"
            }
            ${uploading ? "pointer-events-none opacity-60" : ""}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            onChange={handleFileInputChange}
            className="hidden"
            disabled={uploading}
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-4">
              <RiLoader5Fill className="text-5xl text-primary animate-spin" />
              <div className="w-full max-w-xs">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-caption mt-2">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            </div>
          ) : (
            <>
              <RiImageAddLine className="text-5xl text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Upload Auction Image
              </h3>
              <p className="text-sm text-caption mb-1">
                Drag and drop an image here, or click to browse
              </p>
              <p className="text-xs text-caption">
                Supports: JPEG, PNG, WebP, GIF (Max 5MB)
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden border border-gray-300">
          <img
            src={imagePreview}
            alt="Preview"
            className="w-full h-64 object-cover"
          />
          {!uploading && (
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
            >
              <RiCloseLine className="text-xl" />
            </button>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <RiLoader5Fill className="text-4xl text-white animate-spin" />
                <p className="text-white text-sm">{uploadProgress}%</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
