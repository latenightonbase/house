# House Identity App (`apps/app`)

Next.js App Router frontend with RainbowKit `ConnectButton`, SIWE auth against `apps/api`, and social verification UI.

## Setup

1. Create a [Reown Cloud](https://dashboard.reown.com/) project and set `NEXT_PUBLIC_REOWN_PROJECT_ID` in `.env.local`.
2. Ensure `apps/api` is running on port 3001.
3. Start this app:

```bash
cd apps/app
npm install --ignore-scripts   # monorepo postinstall may fail on paths with apostrophes
npm run dev                    # http://localhost:3002
```

`/backend/*` is rewritten to the API so session cookies stay same-origin.

## Flow

1. Click **Connect** (Base Account is listed first).
2. Sign the SIWE message — session cookie is set via the API.
3. Open **Profile** and verify YouTube / X / Instagram / TikTok (requires OAuth credentials on the API).
