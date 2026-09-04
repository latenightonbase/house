const LOCAL_ORIGINS = ["http://localhost:3002", "http://127.0.0.1:3002"] as const;

/** Hosts the live app is actually served on. SIWE signs `window.location.host`. */
const KNOWN_PROD_ORIGINS = [
  "https://www.lnoc.app",
  "https://lnoc.app",
  "https://house-app-eta.vercel.app",
] as const;

function parseOriginList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\s]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function isIpHostname(hostname: string) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.startsWith("[");
}

/** Apex and www are both valid visitor hosts; Vercel 308s lnoc.app → www.lnoc.app. */
function withWwwVariants(origin: string): string[] {
  try {
    const url = new URL(origin);
    if (url.hostname === "localhost" || isIpHostname(url.hostname)) {
      return [url.origin];
    }
    const port = url.port ? `:${url.port}` : "";
    const hosts = new Set<string>([`${url.protocol}//${url.hostname}${port}`]);
    if (url.hostname.startsWith("www.")) {
      hosts.add(`${url.protocol}//${url.hostname.slice(4)}${port}`);
    } else {
      hosts.add(`${url.protocol}//www.${url.hostname}${port}`);
    }
    return [...hosts];
  } catch {
    return [];
  }
}

export function getAllowedOrigins(): string[] {
  const configured = [
    ...parseOriginList(process.env.APP_ORIGIN),
    ...parseOriginList(process.env.APP_ORIGINS),
    ...KNOWN_PROD_ORIGINS,
    ...LOCAL_ORIGINS,
  ];
  return [...new Set(configured.flatMap(withWwwVariants))];
}

export function getAllowedDomains(): string[] {
  return [
    ...new Set(
      getAllowedOrigins().map((origin) => {
        try {
          return new URL(origin).host;
        } catch {
          return "";
        }
      }),
    ),
  ].filter(Boolean);
}

export function getCanonicalOrigin(): string {
  return parseOriginList(process.env.APP_ORIGIN)[0] || "http://localhost:3002";
}

export function resolveSiweDomain(domain: string | undefined): string | null {
  if (!domain) return null;
  const allowed = new Set(getAllowedDomains());
  return allowed.has(domain) ? domain : null;
}
