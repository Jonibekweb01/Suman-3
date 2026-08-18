# Suman

Online clothing e-commerce platform.

```
Suman/
├── Backend/     Express + TypeScript + Prisma REST API      → :4000
├── Frontend/    Vite + React + TypeScript storefront (FSD)  → :5173
└── Admin/       Vite + React + TypeScript back office (FSD) → :5174
```

Three separately deployable apps sharing one API, as the architecture spec
requires. Each has its own README with the detail:

| | Docs |
| --- | --- |
| API reference, auth flow, production checklist | [Backend/README.md](Backend/README.md) |
| Storefront FSD layout, performance budget | [Frontend/README.md](Frontend/README.md) |
| Admin screens, variant matrix, security notes | [Admin/README.md](Admin/README.md) |

## Getting started

Backend first — nothing else works without it.

```bash
cd Backend && npm install && cp .env.example .env && docker compose up -d && npm run prisma:migrate && npm run db:seed && npm run dev
```

Then the storefront, in a second terminal:

```bash
cd Frontend && npm install && npm run dev
```

And the admin panel, in a third:

```bash
cd Admin && npm install && npm run dev
```

In development both clients proxy `/api` and `/uploads` to the backend, so each
is same-origin with the API and the HttpOnly refresh cookie works under
`SameSite=lax` with no CORS credentials setup. For a deployed build they become
separate origins — set `VITE_API_URL` on each client and add both origins to
`CORS_ORIGINS` in `Backend/.env`.

**Seeded accounts:** `admin@suman.uz / Admin123!` (ADMIN) ·
`customer@suman.uz / User1234!` (USER).

## Demo deployment

Deploy the three parts separately:

1. Create a hosted PostgreSQL database on Neon, Supabase, or Railway. Copy its
  connection string as `DATABASE_URL`. Do not use the local Docker database in
  production.
2. Deploy `Backend/` to Render or Railway as a Node web service. The repository
  includes [render.yaml](render.yaml) for Render. Its build applies Prisma
  migrations, and its health check is `/api/v1/health`.
3. In the backend service, set `CORS_ORIGINS` to the exact comma-separated
  production URLs, for example:
  `https://suman-demo.vercel.app,https://suman-admin.vercel.app`.
4. Create a Vercel project with `Frontend` as the Root Directory. Set
  `VITE_API_URL` to the deployed API prefix, for example
  `https://suman-api.onrender.com/api/v1`, then deploy.
5. Create a second Vercel project with `Admin` as the Root Directory. Set the
  same `VITE_API_URL`, then deploy.

Both Vercel apps include a `vercel.json` SPA rewrite so direct links such as
`/product/:id` and `/products/:id` do not return a 404. Since the clients and
API are different HTTPS origins, production cookies require
`COOKIE_SECURE=true` and `COOKIE_SAME_SITE=none`.

The current upload implementation writes to local disk. That is suitable for
a short-lived demo but not durable on Render; use S3, Cloudinary, or another
object-storage adapter before treating uploads as production data.

## Contracts every client shares

- **Access token in memory only** — never `localStorage`. The refresh token is
  an HttpOnly cookie the client cannot and should not read.
- Requests that rely on the refresh cookie need `credentials: 'include'`.
- On a `401` with `error.code === "ACCESS_TOKEN_EXPIRED"`, call
  `POST /auth/refresh` **once** and retry the original request. Refresh tokens
  rotate with reuse detection, so parallel refreshes will kill the session —
  share a single in-flight promise.
- `POST /auth/refresh` and `POST /auth/logout` require the `suman_csrf` cookie
  value echoed back in the `x-csrf-token` header.
- Prices are integers in minor units (tiyin). Divide by 100 to display; never
  do arithmetic on the formatted string.
- Every response uses the same envelope: `{ success, data, meta }` or
  `{ success: false, error: { code, message, details } }`. Branch on
  `error.code`, never on the message text.
- Dates are formatted by hand as `dd.MM.yyyy`. The `uz-UZ` CLDR data has no
  written month names — even `month: 'long'` renders "M08" — so `Intl` month
  formatting is avoided. Number and currency grouping still go through `Intl`.

## Kept in sync by hand

`ORDER_STATUS_FLOW` exists in two places: `Backend/src/config/constants.ts`
(the authority) and `Admin/src/shared/lib/utils.ts` (so the UI only offers
legal transitions). Change one, change the other.
