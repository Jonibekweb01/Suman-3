# Suman — Admin Panel

Internal back office for the Suman platform: catalogue, orders, banners and
customer accounts. A **separate app** from the storefront, per the architecture
spec.

**Stack:** Vite · React 19 · TypeScript (strict) · Tailwind CSS v4 · TanStack Query · Zustand · React Hook Form + Zod

---

## Quick start

The API must be running first — see [../Backend/README.md](../Backend/README.md).

```bash
cd Suman/Admin && npm install
```

```bash
npm run dev
```

Opens on `http://localhost:5174`. Vite proxies `/api` and `/uploads` to
`http://localhost:4000`, keeping the app same-origin with the API in
development so the HttpOnly refresh cookie works under `SameSite=lax`.

Sign in with the seeded admin: `admin@suman.uz` / `Admin123!`.

| Variable                | Purpose                                                   |
| ----------------------- | --------------------------------------------------------- |
| `VITE_API_PROXY`      | Dev proxy target (default`http://localhost:4000`)       |
| `VITE_API_URL`        | Absolute API URL for a deployed build                     |
| `VITE_STOREFRONT_URL` | "View storefront" link (default`http://localhost:5173`) |

| Script                | Purpose                      |
| --------------------- | ---------------------------- |
| `npm run dev`       | Dev server with HMR          |
| `npm run build`     | Typecheck + production build |
| `npm run typecheck` | Types only                   |
| `npm run preview`   | Serve the production build   |

---

## Architecture

Same Feature-Sliced Design layering as the storefront — imports only ever point
downward.

```
src/
├── app/          Providers, router, layouts (AdminLayout, RootShell)
├── pages/        One folder per screen
├── widgets/      Sidebar and mobile navigation
├── features/     auth (guard + session), image-upload
├── entities/     One api.ts per resource: product, category, order, banner, user, auth
└── shared/       api client, ui kit, lib, types
```

### Why the code is not shared with the storefront

The API client, token store and UI kit look similar to `Frontend/`'s but are
deliberate copies rather than an import. The two apps deploy separately and
diverge in real ways — the admin refetches on window focus, keeps a longer
timeout for uploads, and has an entirely different visual language. Extracting
a package would couple two release cycles to save a few hundred lines. If a
third surface appears (the mobile shell), promote `shared/api` and
`shared/types` to a workspace package then.

The **one thing that must stay in sync** is `ORDER_STATUS_FLOW` in
[shared/lib/utils.ts](src/shared/lib/utils.ts), which mirrors the backend's
state machine so the UI only offers legal transitions. The server is still the
authority and rejects anything invalid; the mirror exists so admins are not
shown buttons guaranteed to fail.

### Visual language

Deliberately **not** the storefront palette. Cool neutral greys, 14px base
type, dense tables, and colour reserved for status meaning rather than brand
expression. Sharing the storefront's warm ivory would make the two easy to
confuse when both are open in adjacent tabs.

---

## Screens

| Route                                  | What it does                                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `/login`                             | Admin sign-in. Rejects non-ADMIN accounts client-side rather than showing a dashboard of 403s.                                 |
| `/`                                  | 30-day stats — revenue, orders, awaiting action, customers, low stock — plus recent orders. Tiles link to the filtered list. |
| `/products`                          | Searchable, filterable, paginated table including archived rows. Archive with confirmation.                                    |
| `/products/:id` \| `/products/new` | Full editor: details, pricing, media, visibility, and the variant matrix.                                                      |
| `/categories`                        | Nested tree with inline create/edit/delete. Cycle-forming parents are filtered out of the picker.                              |
| `/orders`                            | Fulfilment queue, auto-refreshing every 60s. Detail modal drives status and payment transitions.                               |
| `/banners`                           | Hero carousel with scheduling. Live / Scheduled / Expired / Inactive derived from`isActive` + window.                        |
| `/customers`                         | Accounts with search and role filter; suspend and restore.                                                                     |

### The variant matrix

The API models every colour/size pair as its own row with its own stock. Asking
an admin to fill in fifteen near-identical forms would be miserable, so
[VariantMatrix](src/pages/products/VariantMatrix.tsx) takes the two axes —
colours with hex swatches, sizes with presets — and generates the grid. Stock is
held in a flat `"Colour::Size" → number` map, which is far easier to update
immutably than a nested object and survives a colour being removed. On submit
the parent flattens it back into the API's variant array; on load it projects
the API's flat list back into the two axes.

### Money

The API stores minor units (tiyin). Forms take **major units** because that is
how a merchandiser thinks — nobody wants to type `24900000` for 249 000 so'm.
`toMinorUnits` / `toMajorUnits` in `shared/lib/utils.ts` are the only places
that convert.

---

## Security

- **Access token in memory only.** An admin session can rewrite the catalogue
  and read every customer's order, so it is never persisted anywhere a script
  could read it or a shared machine could retain it. The HttpOnly refresh
  cookie is the durable half; a reload recovers the session silently.
- **Single in-flight refresh.** The dashboard fires several queries at once;
  without deduplication each expiring token would trigger its own refresh, and
  the backend's rotation-with-reuse-detection would treat the extras as a
  stolen token and revoke the session.
- **Double guard on every route** — a live session *and* the `ADMIN` role. The
  API enforces the role independently on every write.
- **Uploads validated twice.** Type and size are checked before the request so
  a 6MB file fails instantly; the server re-validates regardless.
- `noindex, nofollow` on the document — this should never surface in search.

---

## Not included

- **Product reviews moderation** — the API exposes `DELETE /reviews/:id` for
  admins, but there is no listing endpoint for all reviews yet, so a moderation
  queue would need a backend addition first.
- **Order detail as a route** — the modal covers current needs; a deep-linkable
  `/orders/:id` would be a small addition.
- **Per-variant SKU and price overrides** — the schema supports both
  (`sku`, `priceDiff`); the matrix currently generates SKUs server-side and
  leaves `priceDiff` at 0.
- **Bulk actions and CSV export.**
