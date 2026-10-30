# Back Phases — Express API

Scope: the whole back end (`apps/api` + `packages/db` + `packages/shared` contracts).
The two Next.js apps are paused until these phases are done — see [front-phases.md](./front-phases.md).

Rules of the road:

- **TDD for every behaviour.** Write the test, watch it fail, implement the minimum that passes, refactor.
  No production code for a new behaviour before its test has failed.
- The suite runs against a disposable `kidstoys_test` MySQL schema, migrated on setup (`apps/api/test/setup.ts`).
- One commit per phase. A phase is a vertical slice: schema + endpoint + tests, working end to end.
- Money is always integer cents. Timestamps are UTC.
- Errors always look like `{ "error": { "message": string, "fields"?: { field: message } } }`.
  Status codes: 400 validation, 401 unauthenticated, 403 forbidden, 404 missing, 409 conflict, 500 unexpected.
- Role checks live in the API, never in the UI.

### Tracking coverage

`pnpm test:coverage` runs the suite with a V8 coverage report (text + HTML in `coverage/`).
The API package enforces thresholds, so coverage cannot silently regress:

| metric | threshold |
|---|---|
| statements | 88% |
| branches | 72% |
| functions | 95% |
| lines | 88% |

Raise them as the phases land. Use the report to find the behaviour nobody tested yet — an
uncovered route, service or rule is the next test to write.

## Structure

The API is organised by feature. Each feature is a module under `apps/api/src/modules/`, and the
test tree mirrors it under `apps/api/test/`:

```
apps/api/
├── src/
│   ├── app.ts                 app factory: middleware, routers, error handling
│   ├── server.ts              listens on API_PORT
│   ├── shared/                cross-cutting plumbing
│   │   ├── errors.ts          ApiError + status codes
│   │   ├── validation.ts      zod → 400 with per-field errors
│   │   ├── password.ts        bcrypt hash/verify
│   │   ├── session.ts         JWT sign/verify + cookie helpers
│   │   ├── slug.ts            unique slug generation
│   │   ├── mappers.ts         shared row → DTO mapping
│   │   └── middleware/        auth guards, error handler
│   └── modules/
│       └── <feature>/
│           ├── router.ts      HTTP only: parse input, call the service, respond
│           ├── service.ts     business logic and orchestration
│           ├── repository.ts  database access, one function per query
│           ├── rules.ts       invariants and guards (throws ApiError)
│           ├── mappers.ts     feature-specific row → DTO
│           └── index.ts       public surface of the module
└── test/
    ├── setup.ts               disposable MySQL schema, migrated on setup
    ├── helpers.ts             resetDatabase, createUser/Category/Product
    └── <feature>/             mirrors src/modules/<feature>
```

Planned modules: `auth`, `categories`, `characters`, `age-groups`, `products`, `cart`, `orders`,
`clients`, `overview`, `health`.

Layers never skip: a route may only talk to its own service, a service may only talk to its own
repository, and only repositories touch the database.

---

## B0 — Foundations ✅

- [x] Test harness on a disposable MySQL schema (`kidstoys_test`), migrated on setup.
- [x] `GET /api/health` → `200 { "status": "ok" }`.
- [x] Error plumbing: `ApiError`, validation errors with per-field messages, 404 + error middleware.
- [x] Password hashing (bcrypt), JWT session cookie (`kidstoys_session`, httpOnly, lax).
- [x] Initial Drizzle schema and first migration applied.

## B1 — Authentication ✅

- [x] `POST /api/auth/register` → `201 { user }`, sets a session cookie, `409` on duplicate email.
- [x] `POST /api/auth/login` → `200 { user }` + cookie, `401` on wrong password or unknown email.
- [x] `POST /api/auth/logout` → clears the cookie.
- [x] `GET /api/auth/me` → `200 { user }` or `401`.
- [x] `PATCH /api/auth/me` → profile fields and password change (current password required).
- [x] Role guards: `requireAuth`, `requireRole("admin")`.

## B2 — Public catalog ✅

- [x] `GET /api/categories` → active categories with product counts, ordered by `sortOrder`.
- [x] `GET /api/products` → paged list. Query: `q` (name, case-insensitive), `category` (slug),
      `sort` (`newest` | `price_asc` | `price_desc` | `name_asc`), `page`, `pageSize` (max 60).
      Returns `{ items, page, pageSize, total, totalPages }`.
- [x] `GET /api/products/:slug` → product detail with category name; `404` for unknown or inactive products.
- [x] Inactive products never appear in the public catalog.
- [x] Products with `stock = 0` are still listed but flagged as out of stock.
- [x] `character`, `ageGroup`, `new` and `bestSeller` filters arrive with B7 — the query schema
      grows then, not now.

## B3 — Catalog management (admin)

- [x] `GET /api/admin/categories` → all categories, including inactive, with product counts.
- [x] `POST /api/admin/categories` → creates with a generated unique slug.
- [x] `PATCH /api/admin/categories/:id` → updates fields; `409` on duplicate name.
- [x] `DELETE /api/admin/categories/:id` → `409` when products still reference it.
- [x] `GET /api/admin/products` → list with `q`, `category`, `includeInactive`, `lowStock`, paging.
- [x] `POST /api/admin/products` → creates with slug generation and uploaded image files.
- [x] `PATCH /api/admin/products/:id` → updates fields and stock.
- [x] `DELETE /api/admin/products/:id` → `409` when the product appears in an order; otherwise deletes.
- [x] Every endpoint in this phase returns `401` without a session and `403` for a customer.
- [x] The product payload grows in B7 with `characterIds`, `ageGroupIds`, `isNew` and `isBestSeller`,
      then in B8 with `buyPriceCents`, `videoUrl` and uploaded image files.

## B4 — Cart

- [x] `GET /api/cart` → items with line totals, subtotal, shipping, total, item count.
- [x] `POST /api/cart/items` → adds or increments a product; `409` when out of stock.
- [x] `PATCH /api/cart/items/:productId` → sets the quantity, clamped to available stock.
- [x] `DELETE /api/cart/items/:productId` → removes the line.
- [x] `POST /api/cart/merge` → merges a guest cart into the signed-in user's cart.
- [x] Quantities are always clamped server-side to the product's available stock.
- [x] The cart belongs to the user; one cart row per user + product.

## B5 — Checkout and customer orders

- [x] `POST /api/orders` → places a cash-on-delivery order in one transaction:
      re-checks stock, creates the order and its item snapshots, decrements stock, clears the cart.
- [x] Order numbers are sequential and human readable: `KT-2026-0001`.
- [x] The order rejects with `409` when any line exceeds available stock, and nothing is written.
- [x] `GET /api/orders` → the customer's own orders, newest first.
- [x] `GET /api/orders/:orderNumber` → order detail with items and status.
- [x] A customer cannot read another customer's order (`404`).

## B6 — Order management (admin) ✅

- [x] `GET /api/admin/orders` → list with `q` (order number or customer) and `status` filter, paged.
- [x] `PATCH /api/admin/orders/:id` → status and payment status changes.
- [x] Status transitions follow the contract: pending → confirmed → shipped → delivered, cancel allowed before shipped.
- [x] Cancelling an order restores the reserved stock.
- [x] Marking an order as paid is what counts towards revenue.

## B7 — Catalog dimensions: characters, age groups, badges ✅

- [x] Schema: `characters`, `age_groups`, `product_characters`, `product_age_groups`;
      `products.isNew` + `products.isBestSeller`; `ageMin` / `ageMax` dropped.
- [x] `GET /api/characters` and `GET /api/age-groups` → active dimensions with product counts.
- [x] `GET /api/admin/characters` → all characters, including inactive, with product counts.
- [x] `POST /api/admin/characters` → creates with a generated unique slug.
- [x] `PATCH /api/admin/characters/:id` → updates fields; `409` on duplicate name.
- [x] `DELETE /api/admin/characters/:id` → `409` when products still reference it.
- [x] `GET /api/admin/age-groups` → all age groups, ordered by start age.
- [x] `POST` / `PATCH` / `DELETE /api/admin/age-groups[/:id]` → same contract as characters.
- [x] An age group is created with a name and a start age; the end age is optional (open-ended)
      and may never be smaller than the start age. There are no built-in buckets — the owner
      defines them.
- [x] `POST` / `PATCH /api/admin/products` carry `characterIds`, `ageGroupIds`, `isNew`,
      `isBestSeller`; a patch replaces the product's characters and age groups wholesale.
- [x] `GET /api/products` filters by `character` and `ageGroup` (comma-separated slugs, OR inside a
      dimension, AND across dimensions), by `age` (a number of years, matching every group whose
      range covers it) and by `new` / `bestSeller`.
- [x] An unknown slug filters to an empty list, never to a 500.

## B8 — Product cost and media (admin) ✅

- [x] `products.buyPriceCents` stores the non-negative unit buy price; it is required when creating
      a product and is never exposed by the public catalog.
- [x] `products.videoUrl` stores an optional external `https://` video URL.
- [x] `POST` / `PATCH /api/admin/products` accept product photos as uploaded files through
      `multipart/form-data`, not client-supplied image URLs. Multiple photos are supported, up to 8.
- [x] Uploads accept only JPEG, PNG and WebP images, enforce a file-size limit, and store files
      outside the source tree. Product responses return same-origin paths for rendering them.
- [x] Creating an order snapshots each line's buy price as `order_items.unitCostCents`, so later
      product cost changes do not rewrite historical profit.
- [x] Buy price and uploaded-media rules apply to both product creation and editing.

## B9 — Customers (admin) ✅

- [x] `GET /api/admin/clients` → list with order count, total spent and last order date, searchable.
- [x] `GET /api/admin/clients/:id` → customer detail with their orders.
- [x] Aggregates are computed from the database, never cached in the client.

## B10 — Overview metrics (admin) ✅

- [x] `GET /api/admin/overview` → KPIs (revenue collected, cost of goods sold, gross profit, orders,
      pending orders, customers, products, low-stock count), recent orders and low-stock products.
- [x] Revenue, cost of goods sold and gross profit count only orders with `paymentStatus = "paid"`.
- [x] Cost of goods sold uses the order-item buy-price snapshots; gross profit is revenue minus
      cost of goods sold.
- [x] Low stock means `stock <= minStock`.

## B11 — Seed data

- [ ] `pnpm db:seed` creates the admin account (from `ADMIN_EMAIL` / `ADMIN_PASSWORD`),
      a set of categories and ~24 products.
- [ ] The seed creates no age groups and no characters: both are the owner's to define in the ERP,
      so the seed leaves those dimensions empty rather than inventing buckets.
- [ ] Seeding is idempotent: running it twice does not duplicate data.
- [ ] Products carry buy prices and locally stored placeholder images so the storefront is not empty.

## B12 — Hardening and documentation

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` pass from a clean checkout.
- [ ] The API README documents every endpoint, the auth flow and the local setup.
- [ ] The project contract stays in sync with the implemented behaviour.

---

## Definition of done for the back end

- Every endpoint in the contract is implemented, guarded and tested.
- The full suite passes against a real MySQL instance.
- Stock is consistent: admins adjust it through product management, orders decrement it, and
  cancelled orders restore it.
- No endpoint trusts the client for prices, totals or permissions.
