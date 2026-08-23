# House Identity API (`apps/api`)

Bun + Elysia + Prisma API for wallet SIWE sessions and social OAuth linking.

## Setup

1. Copy `.env.example` → `.env` (a Claimable Neon DB may already be in `.env`).
2. Claim the DB if using Claimable Neon: see claim URL printed at provision time.
3. Install & migrate:

```bash
cd apps/api
bun install
bunx prisma db push
bun run dev   # http://localhost:3001
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
