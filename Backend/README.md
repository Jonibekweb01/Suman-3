# Suman — Backend API

REST API for the Suman clothing e-commerce platform. Serves both the customer
storefront and the admin panel.

**Stack:** Node.js 20+ · Express · TypeScript (strict) · Prisma · PostgreSQL 16 · Zod · JWT

---

## Quick start

```bash
cd Suman/Backend && npm install
```

```bash
cp .env.example .env
```

Generate two different secrets and paste them into `.env`:

```bash
openssl rand -hex 32
```

Start PostgreSQL (or point `DATABASE_URL` at an existing instance):

```bash
docker compose up -d
```

Apply the schema and load demo data:

```bash
npm run prisma:migrate && npm run db:seed
```

```bash
npm run dev
```

The API is then on `http://localhost:4000/api/v1`. Check it with
`GET /api/v1/health` — it reports database latency, not just a static `200`.

**Seeded accounts:** `admin@suman.uz / Admin123!` (ADMIN) and
`customer@suman.uz / User1234!` (USER).

### Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Watch mode via `tsx` |
| `npm run build` | `prisma generate` + `tsc` → `dist/` |
| `npm start` | Run the compiled build |
| `npm run typecheck` | Types only, no emit |
| `npm run prisma:migrate` | Create/apply a dev migration |
| `npm run prisma:deploy` | Apply migrations in production |
| `npm run db:seed` | Reset and reseed demo data |
| `npm run prisma:studio` | Browse the database |

---

## Architecture

The frontend uses Feature-Sliced Design. The backend mirrors that intent with
**vertical module slices** — the server-side equivalent, since FSD's UI-centric
layers (`widgets`, `pages`) have no meaning here.

```
src/
├── app.ts                  Express assembly: security, CORS, parsers, routes
├── server.ts               Bootstrap, graceful shutdown, cleanup job
├── config/                 env (Zod-validated) + shared constants
├── core/                   prisma, logger, errors, http envelope, pricing, pagination
├── middlewares/            auth, csrf, validate, rateLimit, error, requestId
├── utils/                  jwt, password, otp, cookies, sanitize, slug
├── routes/index.ts         Mounts every module under the API prefix
└── modules/
    ├── auth/               register, OTP, login, refresh rotation, passwords
    ├── user/               profile, addresses, admin user management
    ├── category/           tree, breadcrumbs, admin CRUD
    ├── product/            filtering, search, facets, related, admin CRUD
    ├── cart/               per-user cart, guest-cart merge
    ├── wishlist/           toggle, bulk membership check
    ├── order/              checkout, status flow, dashboard stats
    ├── review/             verified-purchase reviews, rating rollup
    ├── banner/             scheduled hero carousel
    ├── upload/             admin image uploads
    └── notification/       OTP + order delivery adapter (SMS/email)
```

Each module is `*.schema.ts` (Zod contract) → `*.service.ts` (business logic,
the only layer that touches Prisma) → `*.controller.ts` (HTTP) →
`*.routes.ts` (wiring). Controllers hold no logic, services know nothing about
`req`/`res` — which is what makes the services directly reusable if a GraphQL
or gRPC surface is added later.

### Response envelope

Every response has the same shape, so the client never branches on structure:

```jsonc
// success
{ "success": true, "data": { }, "meta": { "page": 1, "total": 42, "nextCursor": null } }

// failure
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [ ], "requestId": "…" } }
```

`error.code` is a stable machine-readable string — switch on it, not on the
message text, which is user-facing copy and may change.

### Money

**All monetary values are integers in the currency's minor unit** (tiyin for
UZS). `249_00000` is 249 000 so'm. This eliminates float rounding, and avoids
Prisma `Decimal` objects serializing awkwardly across the API boundary. Format
for display on the client; never do arithmetic on the formatted value.

---

## Authentication

Implements the access/refresh split the frontend spec calls for.

| | Access token | Refresh token |
| --- | --- | --- |
| Lifetime | 15 min | 30 days |
| Transport | JSON body → `Authorization: Bearer` | HttpOnly Secure cookie |
| Client storage | **memory only** | never touched by JS |

**Flow.** `POST /auth/register` creates an unverified account and sends a
6-digit OTP → `POST /auth/otp/verify` confirms it and returns the first session
→ `POST /auth/login` for subsequent sessions → `POST /auth/refresh` rotates
when the access token expires (the client should retry the original request
once on `ACCESS_TOKEN_EXPIRED`) → `POST /auth/logout` revokes.

Outside production the OTP is returned as `devCode` in the response and logged,
so the whole flow works without an SMS gateway. Wire a real provider in
[notification.service.ts](src/modules/notification/notification.service.ts) —
the service supports Eskiz SMS and SMTP email when `OTP_DELIVERY_MODE=real`.

For local testing, leave `OTP_DELIVERY_MODE=log`; the code is logged and
returned as `devCode`. For real delivery, copy the notification variables from
`.env.example` into `.env`, then fill in `ESKIZ_EMAIL` and `ESKIZ_PASSWORD` for
SMS, and `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` for email.
Gmail requires an App Password when two-step verification is enabled. The
Eskiz sender name must be approved by the Eskiz account before it can be used.

### Security measures

- **Refresh rotation with reuse detection.** Each refresh revokes the presented
  token and issues a new one in the same *family*. A valid-signature token whose
  hash is unknown means it was already rotated — i.e. stolen — so the entire
  family is revoked at once.
- **Hashed at rest.** Refresh tokens and OTPs are stored as SHA-256; a database
  dump cannot be replayed. Passwords use bcrypt at 12 rounds.
- **`tokenVersion`** on the user row invalidates every live access token on
  password change, logout-all, or a block — without maintaining a blacklist.
- **CSRF.** Double-submit cookie on the only two cookie-authenticated routes
  (`/auth/refresh`, `/auth/logout`). Bearer-authenticated routes are immune by
  construction. Send the `suman_csrf` cookie value back in `x-csrf-token`.
- **Timing-safe throughout.** Unknown accounts still pay a bcrypt round, OTP
  comparison uses `timingSafeEqual`, and login returns one message for both
  wrong-password and no-such-account.
- **Input hardening.** Zod parses and *replaces* body/query/params, stripping
  unknown keys — the mass-assignment guard. Text passes through a tag/control
  character stripper before it is persisted.
- **Rate limiting.** Tiered per route class (auth 10/15min, OTP 4/10min,
  search 120/min, global 300/min), keyed per user when signed in and per IP
  otherwise, so a shared NAT does not throttle everyone together.
- **Headers.** Helmet with `frame-ancestors: none` (clickjacking), nosniff,
  HSTS in production, and a locked-down CSP.

> `COOKIE_SECURE=true` is required in production. If the API and storefront are
> on different registrable domains, also set `COOKIE_SAME_SITE=none` — the
> refresh cookie will not be sent cross-site otherwise.

---

## API reference

Base path: `/api/v1`. 🔒 = Bearer token, 👑 = ADMIN role.

### Auth — `/auth`
| Method | Path | Notes |
| --- | --- | --- |
| POST | `/register` | Creates unverified account, sends OTP |
| POST | `/otp/request` | `purpose: REGISTER \| LOGIN \| RESET_PASSWORD` |
| POST | `/otp/verify` | Verifies registration, returns first session |
| POST | `/login` | Email or phone + password |
| POST | `/refresh` | Cookie + `x-csrf-token` |
| POST | `/logout` | Cookie + `x-csrf-token` |
| POST | `/logout-all` | 🔒 Revokes every device |
| GET | `/me` | 🔒 |
| POST | `/password/forgot` · `/password/reset` | OTP-based reset |
| PATCH | `/password/change` | 🔒 |

### Products — `/products`
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | Filter + sort + paginate (below) |
| GET | `/facets` | Price bounds, colours, sizes, brands for the filter panel |
| GET | `/suggest?q=` | Header autocomplete (products + categories) |
| GET | `/:id` · `/slug/:slug` | Detail with images and variants |
| GET | `/:id/related` | Recommendation carousel |
| GET | `/admin/all` | 👑 Includes archived |
| POST · PATCH · DELETE | `/` · `/:id` | 👑 (DELETE archives, never hard-deletes) |
| POST | `/stock/adjust` | 👑 Signed delta |

Filters: `q`, `categoryId`, `categorySlug`, `gender`, `minPrice`, `maxPrice`,
`sizes`, `colors`, `brands`, `inStock`, `featured`, `minRating`.
Sort: `newest` · `oldest` · `price_asc` · `price_desc` · `rating` · `popular`.

Repeatable params accept either form: `?sizes=S&sizes=M` or `?sizes=S,M`.

Selecting a parent category returns everything beneath it — clicking "Women"
includes dresses and coats, not just products pinned to the parent.

**Pagination.** Pass `cursor` for infinite scroll, `page` for numbered pages.
Cursor mode skips the `COUNT(*)` — the expensive half of the query — and is
stable when new products are inserted mid-scroll. Offset mode returns `total`
and `totalPages` for the admin table. Both return `nextCursor`, so the
storefront can start on page 1 and continue by cursor.

### Categories · Cart · Wishlist · Orders · Reviews · Banners · Uploads

| Group | Endpoints |
| --- | --- |
| `/categories` | `GET /` (tree or flat, `?gender=`), `GET /:slug` (with breadcrumbs), 👑 CRUD |
| `/cart` 🔒 | `GET /`, `GET /count`, `POST /items`, `PATCH /items/:variantId`, `DELETE /items/:variantId`, `DELETE /`, `POST /merge` |
| `/wishlist` 🔒 | `GET /`, `GET /count`, `POST /check`, `POST /:productId/toggle`, `DELETE /:productId` |
| `/orders` | 🔒 `POST /`, `GET /`, `GET /:id`, `POST /:id/cancel` · 👑 `GET /admin/all`, `GET /admin/stats`, `PATCH /:id/status`, `PATCH /:id/payment` |
| `/reviews` | `GET /product/:productId` · 🔒 `PUT /product/:productId`, `DELETE /:id` |
| `/banners` | `GET /` (respects scheduling window) · 👑 CRUD |
| `/uploads` | 👑 `POST /images` — multipart `files`, ≤10 images, ≤5MB each |
| `/users` 🔒 | `PATCH /me`, `DELETE /me`, addresses CRUD · 👑 `GET /`, `PATCH /:id/block` |

---

## Notes on a few decisions

**Overselling is prevented at the database, not in application code.** Checkout
decrements stock with a conditional `updateMany ... WHERE stock >= quantity`
inside a transaction. If zero rows match, another checkout won the race and the
whole order rolls back. A read-then-write check would leave a window open
between the two statements.

**Order items are snapshots.** Title, image, colour, size, SKU and unit price
are copied onto the order at checkout. Renaming or repricing a product later
must not rewrite what a customer already paid for.

**Products are archived, never deleted.** Order history references them. A
`DELETE` sets `isActive: false` and clears the item from every live cart.

**Reviews require a delivered order** for that product, and the rating rollup on
`Product` is recalculated in the same transaction as the write, so the two can
never disagree.

**Account deletion anonymizes when order history exists** — the financial record
survives, the personal data does not.

**The category tree is built in one query.** Prisma's recursive `include` costs
a query per level and caps at a fixed depth; a flat fetch assembled in memory is
faster and depth-agnostic. Reparenting is checked against descendants so a cycle
cannot be created.

---

## Production checklist

- [ ] `NODE_ENV=production`, fresh 32-byte secrets, **different** access/refresh
- [ ] `COOKIE_SECURE=true`, `COOKIE_SAME_SITE` matching your domain topology
- [ ] `CORS_ORIGINS` set to real storefront + admin origins (no wildcards)
- [ ] `npm run prisma:deploy` — never `migrate dev` against production
- [ ] Real SMS/email transport wired in `notification.service.ts`
- [ ] Uploads moved to S3/R2 behind a CDN (local disk does not survive a redeploy)
- [ ] `trust proxy` verified — rate limiting keys off `req.ip`
- [ ] Rate-limit store moved to Redis if running more than one instance
  (the default store is per-process)
