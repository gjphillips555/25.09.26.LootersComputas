# LootersDarkMode

Dark-mode shopfront for **LootersRetail** — live TradeMe listings with cart and checkout, built for NZ buyers.

Part of the [Looters Group](https://github.com/gjphillips555/Looters-Group-ltd) umbrella (Computas · Apparel · Software).

## What it does

- Pulls **live listings** from the LootersRetail TradeMe account (member `9233545`)
- Browse a product grid, open listing detail pages
- Add **Buy Now** items to a cart (quantity + shipping options from TradeMe)
- Checkout with NZ delivery details; shipping matched to North/South Island
- Order summary with GST note; place order and view confirmation
- Fully dark UI (purple/violet palette, easy on the eyes)

Sales still settle on TradeMe (Ping / Afterpay). This site is the shopfront and order sheet.

## Stack

- React 19 + TanStack Start / Router / Query
- Tailwind CSS v4 (dark theme tokens)
- Zustand cart store
- TradeMe public/search API (optional OAuth consumer keys for higher limits)

## Local development

```bash
npm install
npm run dev
```

App listens on `http://0.0.0.0:8080`.

### Optional TradeMe credentials

Set these for authenticated API access (higher rate limits / reliability):

- `TRADEME_CONSUMER_KEY`
- `TRADEME_CONSUMER_SECRET`

Without them the app still works against the public endpoints where available.

### Authentication (Better Auth)

This app uses **Better Auth** as its single authentication system. Do not add
Auth0 or a second authentication provider.

For production Google sign-in, configure these Vercel environment variables:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `BETTER_AUTH_SECRET` (a long, random secret)
- `BETTER_AUTH_URL` (the canonical application URL, e.g. `https://www.looterscomputas.online`)
- `DATABASE_URL` (the production PostgreSQL connection string)

Set `VITE_AUTH_ENABLED=true` in the production environment. The legacy Grok
OAuth broker is retained only for isolated live-preview environments; production
never falls back to it. Never place OAuth secrets in client-side variables or
commit them to this repository.

## Scripts

| Command | Purpose |
|--------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run preview` | Preview production build |

## Related repos

| Repo | Role |
|------|------|
| [Looters-Group-ltd](https://github.com/gjphillips555/Looters-Group-ltd) | Umbrella site |
| [LootersRetail](https://github.com/gjphillips555/LootersRetail) | Retail-related work |
| [looters-stores](https://github.com/gjphillips555/looters-stores) | Computas / Apparel / Software stores |
| [SiftaBrowser](https://github.com/gjphillips555/SiftaBrowser) | Sifta Browser |

## License

Private project for Looters Group Ltd. All rights reserved unless otherwise noted.
