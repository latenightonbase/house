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
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        style={style}
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
