# House Identity API (`apps/api`)

Bun + Elysia + Prisma API for wallet SIWE sessions and social OAuth linking.

## Setup

1. Copy `.env.example` → `.env`.
2. Set `DATABASE_URL` / `DIRECT_URL` to your **Railway Postgres** connection strings (Prisma needs both; they can be the same public URL). Append `?sslmode=require` if TLS fails.
3. Install & migrate:

```bash
cd apps/api
bun install
bunx prisma db push   # or: bunx prisma migrate deploy
bun run dev           # http://localhost:3001
```

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Health check |
| GET | `/auth/nonce` | — | SIWE nonce |
| POST | `/auth/verify` | — | Verify SIWE, set `house_session` cookie |
| POST | `/auth/logout` | cookie | Revoke session |
| GET | `/auth/me` | cookie | Current user + wallets + socials |
| GET | `/socials/:platform/start` | cookie | Begin OAuth |
| GET | `/socials/:platform/callback` | — | OAuth callback |
| POST | `/socials/:platform/refresh` | cookie | Refresh follower count |
| DELETE | `/socials/:platform` | cookie | Unlink social |

Platforms: `youtube`, `twitter` (or `x`), `instagram`, `tiktok`.

## Social env vars

- YouTube: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- X: `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET`
- Instagram: `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET`
- TikTok: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`

Callback URLs must be `{API_ORIGIN}/socials/{platform}/callback`.

SIWE checks the signed `domain` against `APP_ORIGIN` plus optional `APP_ORIGINS` (comma-separated). `www` and apex hosts are both accepted. In production set `APP_ORIGIN` to the canonical app URL (`https://www.lnoc.app`) so email and OAuth redirects land on the custom domain.
