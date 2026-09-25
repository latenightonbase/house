/** Railway/API host. Never include `/backend` — the app adds that prefix itself. */
export function getApiOrigin() {
  const raw = (process.env.API_ORIGIN || "").trim();
  const origin = (raw || (process.env.VERCEL ? "https://api.lnoc.app" : "http://localhost:3001"))
    .replace(/\/+$/, "")
    .replace(/\/backend$/i, "");
  return origin;
}

/**
 * The API origin the *browser* talks to directly. Everything else goes through
 * the app's `/backend` proxy, but a WebSocket cannot: a Next route handler
 * cannot proxy an upgrade. So the chat socket dials this host, which is also
 * why it authenticates with a ticket rather than the session cookie — that
 * cookie is host-only on the app's own domain and is never sent here.
 */
export function getPublicApiOrigin() {
  const configured = (process.env.NEXT_PUBLIC_API_ORIGIN || "").trim();
  if (configured) return configured.replace(/\/+$/, "").replace(/\/backend$/i, "");

  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") return "http://localhost:3001";
  }
  return "https://api.lnoc.app";
}

/** `http(s)://host` → `ws(s)://host/chat/ws`. */
export function getChatSocketUrl(ticket: string) {
  const origin = getPublicApiOrigin().replace(/^http/, "ws");
  return `${origin}/chat/ws?ticket=${encodeURIComponent(ticket)}`;
}
