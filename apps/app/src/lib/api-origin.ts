/** Railway/API host. Never include `/backend` — the app adds that prefix itself. */
export function getApiOrigin() {
  return (process.env.API_ORIGIN || "http://localhost:3001")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/backend$/i, "");
}
