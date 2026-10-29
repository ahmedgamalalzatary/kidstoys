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
│           ├── routes.ts      HTTP only: parse input, call the service, respond
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

Planned modules: `auth`, `categories`, `products`, `cart`, `orders`, `clients`, `suppliers`,
`purchases`, `overview`, `health`.

Layers never skip: a route may only talk to its own service, a service may only talk to its own
repository, and only repositories touch the database.

---

## B0 — Foundations ✅

- [x] Test harness on a disposable MySQL schema (`kidstoys_test`), migrated on setup.
- [x] `GET /api/health` → `200 { "status": "ok" }`.
- [x] Error plumbing: `ApiError`, validation errors with per-field messages, 404 + error middleware.
- [x] Password hashing (bcrypt), JWT session cookie (`kidstoys_session`, httpOnly, lax).
- [x] Drizzle schema for all nine tables, first migration applied.

## B1 — Authentication ✅

- [x] `POST /api/auth/register` → `201 { user }`, sets a session cookie, `409` on duplicate email.
- [x] `POST /api/auth/login` → `200 { user }` + cookie, `401` on wrong password or unknown email.
- [x] `POST /api/auth/logout` → clears the cookie.
- [x] `GET /api/auth/me` → `200 { user }` or `401`.
- [x] `PATCH /api/auth/me` → profile fields and password change (current password required).
- [x] Role guards: `requireAuth`, `requireRole("admin")`.

## B2 — Public catalog

- [ ] `GET /api/categories` → active categories with product counts, ordered by `sortOrder`.
- [ ] `GET /api/products` → paged list. Query: `q` (name, case-insensitive), `category` (slug),
      `sort` (`newest` | `price_asc` | `price_desc` | `name_asc`), `page`, `pageSize` (max 60).
      Returns `{ items, page, pageSize, total, totalPages }`.
- [ ] `GET /api/products/:slug` → product detail with category name; `404` for unknown or inactive products.
- [ ] Inactive products never appear in the public catalog.
- [ ] Products with `stock = 0` are still listed but flagged as out of stock.

## B3 — Catalog management (admin)

- [x] `GET /api/admin/categories` → all categories, including inactive, with product counts.
- [x] `POST /api/admin/categories` → creates with a generated unique slug.
- [x] `PATCH /api/admin/categories/:id` → updates fields; `409` on duplicate name.
- [x] `DELETE /api/admin/categories/:id` → `409` when products still reference it.
- [x] `GET /api/admin/products` → list with `q`, `category`, `includeInactive`, `lowStock`, paging.
- [x] `POST /api/admin/products` → creates with slug generation and image URL list.
- [x] `PATCH /api/admin/products/:id` → updates fields and stock.
- [x] `DELETE /api/admin/products/:id` → `409` when the product appears in an order; otherwise deletes.
- [x] Every endpoint in this phase returns `401` without a session and `403` for a customer.

## B4 — Cart

- [x] `GET /api/cart` → items with line totals, subtotal, shipping, total, item count.
- [x] `POST /api/cart/items` → adds or increments a product; `409` when out of stock.
- [x] `PATCH /api/cart/items/:productId` → sets the quantity, clamped to available stock.
- [x] `DELETE /api/cart/items/:productId` → removes the line.
- [x] `POST /api/cart/merge` → merges a guest cart into the signed-in user's cart.
- [x] Quantities are always clamped server-side to the product's available stock.
- [x] The cart belongs to the user; one cart row per user + product.

## B5 — Checkout and customer orders

- [ ] `POST /api/orders` → places a cash-on-delivery order in one transaction:
      re-checks stock, creates the order and its item snapshots, decrements stock, clears the cart.
- [ ] Order numbers are sequential and human readable: `KT-2026-0001`.
- [ ] The order rejects with `409` when any line exceeds available stock, and nothing is written.
- [ ] `GET /api/orders` → the customer's own orders, newest first.
- [ ] `GET /api/orders/:orderNumber` → order detail with items and status.
- [ ] A customer cannot read another customer's order (`404`).

## B6 — Order management (admin)

- [ ] `GET /api/admin/orders` → list with `q` (order number or customer) and `status` filter, paged.
- [ ] `PATCH /api/admin/orders/:id` → status and payment status changes.
- [ ] Status transitions follow the contract: pending → confirmed → shipped → delivered, cancel allowed before shipped.
- [ ] Cancelling an order restores the reserved stock.
- [ ] Marking an order as paid is what counts towards revenue.

## B7 — Customers (admin)

- [ ] `GET /api/admin/clients` → list with order count, total spent and last order date, searchable.
- [ ] `GET /api/admin/clients/:id` → customer detail with their orders.
- [ ] Aggregates are computed from the database, never cached in the client.

## B8 — Suppliers (admin)

- [ ] `GET /api/admin/suppliers` → list with the number of purchases per supplier.
- [ ] `POST /api/admin/suppliers` → creates; `409` on duplicate name.
- [ ] `PATCH /api/admin/suppliers/:id` → updates.
- [ ] `DELETE /api/admin/suppliers/:id` → `409` when purchases reference it.

## B9 — Purchases and stock (admin)

- [ ] `GET /api/admin/purchases` → list, optionally filtered by status or supplier.
- [ ] `GET /api/admin/purchases/:id` → purchase detail with its line items.
- [ ] `POST /api/admin/purchases` → creates a purchase against a supplier with line items
      (product, quantity, unit cost); purchase numbers look like `PO-2026-0001`.
- [ ] `PATCH /api/admin/purchases/:id` → moves the purchase through
      draft → ordered → received → cancelled.
- [ ] Marking a purchase **received** increments each product's stock by the received quantity,
      inside a transaction, and records the total cost.
- [ ] A purchase that has already been received cannot be received twice.

## B10 — Overview metrics (admin)

- [ ] `GET /api/admin/overview` → KPIs (revenue collected, orders, pending orders, customers,
      products, low-stock count, open purchases), recent orders, low-stock products, recent purchases.
- [ ] Revenue counts only orders with `paymentStatus = "paid"`.
- [ ] Low stock means `stock <= minStock`.

## B11 — Seed data

- [ ] `pnpm db:seed` creates the admin account (from `ADMIN_EMAIL` / `ADMIN_PASSWORD`),
      a set of categories, ~24 products, 2 suppliers and one sample purchase.
- [ ] Seeding is idempotent: running it twice does not duplicate data.
- [ ] Products carry placeholder image URLs so the storefront is not empty.

## B12 — Hardening and documentation

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` pass from a clean checkout.
- [ ] The API README documents every endpoint, the auth flow and the local setup.
- [ ] The project contract stays in sync with the implemented behaviour.

---

## Definition of done for the back end

- Every endpoint in the contract is implemented, guarded and tested.
- The full suite passes against a real MySQL instance.
- Stock is consistent: orders decrement it, cancelled orders restore it, received purchases add it.
- No endpoint trusts the client for prices, totals or permissions.
