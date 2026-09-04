import { getApiOrigin } from "@/lib/api-origin";

const REQUEST_ALLOW = new Set([
  "accept",
  "authorization",
  "cookie",
  "content-type",
  "x-cron-secret",
]);

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function proxy(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const origin = getApiOrigin();
  try {
    const { path } = await context.params;
    const incoming = new URL(request.url);
    const target = `${origin}/${path.join("/")}${incoming.search}`;

    const headers = new Headers();
    request.headers.forEach((value, key) => {
      if (REQUEST_ALLOW.has(key.toLowerCase())) headers.set(key, value);
    });
    headers.set("accept-encoding", "identity");

    const method = request.method.toUpperCase();
    const body =
      method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();

    const upstream = await fetch(target, {
      method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
    });

    const payload = await upstream.arrayBuffer();
    const responseHeaders = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) responseHeaders.set("content-type", contentType);
    for (const cookie of upstream.headers.getSetCookie()) {
      responseHeaders.append("set-cookie", cookie);
    }

    return new Response(payload, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown";
    console.error("[backend proxy]", origin, detail);
    return Response.json({ error: "API proxy failed", origin, detail }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
export const OPTIONS = proxy;
