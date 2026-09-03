const OPTIMIZED_HOST = [
  /\.amazonaws\.com$/i,
  /\.cloudfront\.net$/i,
  /\.twimg\.com$/i,
  /\.ggpht\.com$/i,
  /\.googleusercontent\.com$/i,
  /\.ytimg\.com$/i,
  /\.cdninstagram\.com$/i,
  /\.fbcdn\.net$/i,
  /\.tiktokcdn(?:-us|-eu)?\.com$/i,
  /^i\.pravatar\.cc$/i,
];

/**
 * Raster hosts in next.config can use the optimizer. SVGs, data/blob URIs,
 * and unknown user-supplied hosts skip it so next/image never throws.
 */
export function isUnoptimizedSrc(src: string) {
  if (src.startsWith("data:") || src.startsWith("blob:")) return true;
  if (src.startsWith("/")) return false;
  try {
    const url = new URL(src);
    const path = url.pathname.toLowerCase();
    if (url.hostname === "api.dicebear.com" || path.endsWith(".svg") || path.endsWith("/svg")) {
      return true;
    }
    return !OPTIMIZED_HOST.some((re) => re.test(url.hostname));
  } catch {
    return true;
  }
}
