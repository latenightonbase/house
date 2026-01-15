"use client";

import { useState, useRef, useCallback } from "react";
import { RiImageAddLine, RiCloseLine } from "react-icons/ri";
import toast from "react-hot-toast";

interface ImageUploadProps {
  onFileSelect: (file: File) => void;
  onRemove?: () => void;
  currentImageUrl?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function ImageUpload({
  onFileSelect,
  onRemove,
  currentImageUrl,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(
    currentImageUrl || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Invalid file type. Please upload JPEG, PNG, WebP, or GIF images.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File size exceeds 5MB limit.";
    }
    return null;
  };

  const handleFileSelect = (file: File) => {
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

    // Pass file to parent
    onFileSelect(file);
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
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    []
  );

  const handleFileInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
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
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            onChange={handleFileInputChange}
            className="hidden"
          />

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
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden border border-gray-300">
          <img
            src={imagePreview}
            alt="Preview"
            className="w-full h-64 object-cover"
          />
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
          >
            <RiCloseLine className="text-xl" />
          </button>
        </div>
      )}
    </div>
  );
}
