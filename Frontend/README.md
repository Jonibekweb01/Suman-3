# Suman — Storefront

Customer-facing web app for the Suman clothing platform. Mobile-first, built so
the data and state layers can be reused by a Capacitor or React Native shell.

**Stack:** Vite · React 19 · TypeScript (strict) · Tailwind CSS v4 · TanStack Query · Zustand · Framer Motion · React Router 7

---

## Quick start

The API has to be running first — see [../Backend/README.md](../Backend/README.md).

```bash
cd Suman/Frontend && npm install
```

```bash
npm run dev
```

Opens on `http://localhost:5173`. Vite proxies `/api` and `/uploads` to
`http://localhost:4000`, so the app and the API are **same-origin in
development** — the HttpOnly refresh cookie then works with `SameSite=lax` and
no CORS credentials setup.

Point at a different API with `VITE_API_PROXY` (dev proxy target) or
`VITE_API_URL` (absolute URL, for a deployed build).

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Typecheck + production build |
| `npm run typecheck` | Types only |
| `npm run preview` | Serve the production build |
| `npm run lint` | Oxlint |

---

## Architecture — Feature-Sliced Design

Layers may only import **downward**. `shared` knows nothing about anything else;
`entities` never imports a `feature`. That rule is what keeps a change to
checkout from rippling into the product card.

```
src/
├── app/          Composition root — providers, router, layout, global styles
├── pages/        Route components, one folder per route
├── widgets/      Self-contained page sections (header, filter panel, grid, gallery)
├── features/     User actions (auth, add-to-cart, wishlist toggle, filters)
├── entities/     Business objects — API calls, queries, stores, presentational UI
└── shared/       Framework-level: api client, ui kit, lib, types, config
```

```
app → pages → widgets → features → entities → shared
```

### Where state lives

Three stores, deliberately separated by lifetime and owner:

| Kind | Held by | Examples |
| --- | --- | --- |
| Server state | TanStack Query | products, cart, orders, wishlist |
| Client state | Zustand | auth session, guest cart, auth modal, toasts |
| **Filter state** | **the URL** | sizes, colours, price, sort, category |

Filters live in the query string rather than a store so a filtered grid is
shareable, bookmarkable and correctly restored by the back button — with one
source of truth instead of a store that must be kept in sync with the address
bar.

### Cross-platform readiness

Nothing in `shared/api`, `entities/*/api.ts`, or the Zustand stores touches the
DOM — they are plain TypeScript. Wrapping with Capacitor means replacing the
`app` and `widgets` layers; the data layer moves across untouched. The one
adjustment a native shell needs is token transport: `shared/api/tokenStore.ts`
is the single place where the memory-only access token is read and written.

---

## Authentication

The access token is held in a **module variable, never in `localStorage`** — an
injected script cannot read it from storage, and it dies with the tab. The
refresh token is an HttpOnly cookie that JS can never see.

That means a page reload always starts signed-out. `useAuthBootstrap` recovers
the session with one silent `POST /auth/refresh`; failure just means "guest".

**Transparent refresh.** The axios interceptor catches `401 ACCESS_TOKEN_EXPIRED`,
refreshes once, and replays the original request. All waiting requests share a
single in-flight refresh promise — without that, six queries firing on mount
would trigger six parallel refreshes, and since the API rotates and revokes on
each one, five would be flagged as token reuse and kill the session.

**CSRF.** `/auth/refresh` and `/auth/logout` are cookie-authenticated, so the
client echoes the readable `suman_csrf` cookie in an `x-csrf-token` header.
Everything else uses a Bearer header, which a cross-site form post cannot set.

**Guarded routes.** `<ProtectedRoute />` waits for bootstrap before deciding —
redirecting mid-restore would bounce every signed-in user on a hard reload. When
a guest hits a guarded route it opens the auth modal *over the destination* and
remembers where they were going, so signing in continues the journey.

---

## Pages

| Route | Notes |
| --- | --- |
| `/` | Hero carousel, category strip, filterable grid with infinite scroll |
| `/women` · `/men` | Same catalog, `gender` pinned as a base filter that query params cannot override |
| `/product/:id` | Gallery, colour/size selection, live stock, related carousel |
| `/cart` | Quantity editing, stock warnings, checkout modal |
| `/wishlist` 🔒 · `/orders` 🔒 | Guarded |
| `/auth` | Standalone auth page — same forms as the modal, for emailed links and deep links |
| `*` | 404 |

**Guests can add to cart.** The bag is held in `localStorage` with a
denormalized snapshot so it renders without the server, and `POST /cart/merge`
folds it into the account on sign-in. Requiring an account before someone can
hold an item is the most reliable way to lose the sale. Checkout does require
sign-in — the order, address book and receipt all hang off a user id.

---

## Performance

Measures taken against the 95+ Lighthouse target:

- **Route-level code splitting.** Home is eager (most first visits land there,
  and its LCP should not wait on a second round trip); everything else is lazy.
  The auth modal is lazy too — it drags in react-hook-form and zod, roughly a
  third of the initial bundle, for something most visitors never open.
- **Vendor chunks** split react / query / motion so app deploys do not
  invalidate them.
- **Images** carry a reserved aspect-ratio box (CLS), `loading="lazy"` +
  `decoding="async"`, and `fetchPriority="high"` on the hero and first four
  cards only — eager-loading more would compete with the LCP image.
- **Cursor pagination** for infinite scroll: no `COUNT(*)`, and stable when new
  products are inserted mid-scroll.
- **System font stack** — no webfont request, so no render-blocking fetch and no
  swap-induced layout shift.
- **Debounced** search (250ms, min 2 chars) and price slider (350ms).
- `prefers-reduced-motion` disables every animation; they are all decorative.

Current production bundle: ~200KB gzip on first load (`index` 97 + react 35 +
query 30 + motion 40).

## Security

- Access token in memory only; refresh token HttpOnly (see above).
- DOMPurify on the only two paths that build markup by hand — rich descriptions
  and search-term highlighting. Highlighting escapes the source text *before*
  inserting `<mark>`, then purifies, so a product titled `<img onerror=…>`
  cannot execute in the dropdown.
- Zod validates every form client-side for fast feedback; the server revalidates
  everything. The client checks are UX, not a security boundary.
- `localStorage` holds only the guest cart — never a token or user identity.

## Accessibility

Focus trap and restore in modals, Escape to dismiss, a skip-to-content link,
44px minimum touch targets, `aria-live` for cart and loading updates,
`aria-pressed` on every toggle, and visible focus rings for keyboard users only.

---

## Not included

Out of scope for this app, and deliberately so:

- **Admin panel** — a separate React app per the architecture spec. The API's
  admin endpoints are ready for it.
- **Order detail page** — the list shows everything the API returns today.
- **Profile / address management screens** — the endpoints and the
  `entities/order` API layer exist; only the settings UI is missing. Addresses
  can be created through checkout.
- **Dark mode** — the palette is fully tokenized in
  [index.css](src/app/styles/index.css), so adding it is a second `:root` block
  rather than a refactor.
