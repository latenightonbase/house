import Image from "next/image";
import { isUnoptimizedSrc } from "@/lib/imageSrc";

type Props = {
  src?: string | null;
  alt?: string;
  fallback: string;
  size?: number;
  className?: string;
};

export function Avatar({ src, alt = "", fallback, size = 44, className = "" }: Props) {
  const style = { width: size, height: size };

  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        unoptimized={isUnoptimizedSrc(src)}
        className={`rounded-full object-cover border border-line-strong ${className}`}
      />
    );
  }

  return (
    <div
      style={style}
      className={`flex items-center justify-center rounded-full border border-line-strong bg-surface-2 text-caption ${className}`}
    >
      {fallback}
    </div>
  );
}
