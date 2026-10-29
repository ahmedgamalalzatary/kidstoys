# Project Contract — KidsToys

**Status:** Draft v1 — awaiting final visual/brand answers (section 10)
**Owner:** Store owner (admin) — product decisions
**Implementation:** Next.js (front) + Express (back) + MySQL + Drizzle ORM, pnpm monorepo

This document is the source of truth for the app. Every feature below has acceptance criteria that
must pass before the feature is considered done. Brand values that are still open are isolated in
section 10 and wired through a single token file so they can be swapped in one place.

---

## 1. Product overview

KidsToys is a two-part web application for a toy shop:

1. **Storefront (public)** — customers browse a catalog of toys, search and filter by category,
   add items to a cart, register/login, and place orders with **cash on delivery**. Customers can
   track their own orders and their profile.
2. **Admin dashboard (private, role = `admin`)** — the owner controls the whole business:
   categories, products, orders, customers, suppliers and purchases (stock replenishment), with
   an overview dashboard of key business metrics.

### 1.1 Goals

- A customer can go from landing page to placed order in under two minutes.
- The owner can run the entire business from the dashboard without touching a database client.
- Stock levels stay truthful: they go up when a purchase is received and down when an order is placed.
- Every list screen supports search/filter/pagination so the dataset can grow past demo size.

### 1.2 Non-goals for v1

- Real online payment (deliberately: cash on delivery until a provider is chosen — see 10.3).
- Product image uploads to cloud storage (images are managed by URL — see 4.3).
- Emails/SMS notifications (order confirmation is on-screen only).
- Multi-warehouse inventory, taxes/currency conversion, invoices/PDFs.
- Public customer reviews and ratings.

---

## 2. Users and roles

| Role | Value in DB | Capabilities |
|---|---|---|
| Anonymous | — | Browse catalog, view product and category pages. |
| Customer | `client` | Everything anonymous can do, plus: cart, checkout, order history, profile edit, logout. |
| Admin | `admin` | Everything customer can do, plus: full dashboard access (section 3.6). |

- There is exactly one seeded admin account (`admin@kidstoys.test` / password `Admin1234!`),
  changeable in the dashboard profile page.
- Admin routes are protected server-side. The API rejects any non-admin request to `/api/admin/*`
  with `403`. Hiding nav links is not a security control.

---

## 3. Features

### 3.1 Authentication

- Register (name, email, password, confirm password), Login, Logout.
- Passwords hashed with bcrypt (cost 10). Passwords are never stored or logged in plain text.
- On success the API sets an httpOnly, SameSite=Lax cookie containing a signed JWT
  (`sub` = user id, `role` = role, `exp` = 7 days). Signing uses `JWT_SECRET` from the environment.
- The web app reads the session through a server-side helper; role checks happen in the API.
- Email is unique and case-insensitively normalised (trimmed, lowercased) before lookup/insert.
- **Acceptance:** duplicate email registration returns a field error, not a 500. A logged-out
  request to `/api/admin/orders` returns 401. A logged-in customer request to the same path
  returns 403. Logging out invalidates access on the next request.

### 3.2 Storefront catalog

- Home page: hero, featured categories, featured/new products.
- Category page: `/category/[slug]` — lists that category's products with a sidebar of all
  categories.
- Product listing `/products`: search by name, filter by category, sort by newest / price asc /
  price desc, pagination (24 per page). Filters are reflected in the URL query string so a view
  can be shared/bookmarked.
- Product detail `/product/[slug]`: images, price, description, stock state, quantity selector,
  add-to-cart, breadcrumbs.
- Products with zero stock are shown as "Out of stock" and cannot be added to the cart.
- **Acceptance:** a search for a term matches product names case-insensitively; an out-of-stock
  product's add-to-cart control is disabled and the API rejects adding it.

### 3.3 Cart

- Cart lives on the server for logged-in users (table `cart_items`, one row per user+product).
- Anonymous visitors get a localStorage cart; on sign-in/sign-up the guest cart is POSTed to the
  API and merged into the server cart (sum of quantities, capped at available stock).
- Cart page: line items with quantity stepper (1..stock), line total, remove line, order summary
  (subtotal, shipping, total), "Proceed to checkout".
- Changing quantity updates the cart immediately; the header badge shows the item count.
- **Acceptance:** quantities are clamped to available stock server-side; removing the last item
  leaves an empty cart, not an error; the badge count equals the sum of quantities.

### 3.4 Checkout and orders (cash on delivery)

- Checkout requires a logged-in customer. Form: full name, phone, city, address, notes.
- Placing the order, in one server transaction:
  1. re-reads each product's stock and rejects the order if any line exceeds available stock;
  2. creates the order (`status = 'pending'`, `paymentMethod = 'cod'`, `paymentStatus = 'unpaid'`);
  3. copies product name/price into `order_items` as a snapshot (later price edits never rewrite
     history);
  4. decrements `products.stock`;
  5. clears the cart.
- Order number is a human-readable sequential string, e.g. `KT-2026-0001`.
- Order status lifecycle: `pending → confirmed → shipped → delivered`, plus `cancelled` from any
  non-delivered state. Cancelling restores the reserved stock.
- **Acceptance:** an order that would exceed stock is rejected with a clear message and nothing is
  written; the order confirmation page shows the order number and items; cancelling an order
  restores stock to its previous value.

### 3.5 Customer account

- `/account` — profile (name, email, phone) and password change.
- `/account/orders` — the customer's own orders, newest first, with status and total.
- `/account/orders/[orderNumber]` — order detail with items, delivery address and status timeline.
- **Acceptance:** a customer cannot read another customer's order (API returns 404/403).

### 3.6 Admin dashboard

Layout: persistent left sidebar + top bar with the admin's name and a logout button.
Sections:

1. **Overview** `/admin` — KPI cards (revenue collected, orders, customers, products, low-stock
   count, open purchases), a recent-orders table, a low-stock list, and recent purchases.
   - Revenue counts only orders with `paymentStatus = 'paid'`.
2. **Categories** `/admin/categories` — list with search and product counts; create/edit/delete.
   Deleting a category that still has products is blocked with a message.
3. **Products** `/admin/products` — list with search, category filter and stock filter; create/edit
   with a product image URL list, price, compare-at price, SKU, stock, and active flag.
   Deleting a product that appears in an order is blocked (soft-delete via `active = false` is
   offered instead).
4. **Orders** `/admin/orders` — list with search by order number/customer and status filter;
   order detail where the admin can change status and mark payment as paid/unpaid. Filtering by
   status uses query params.
5. **Customers** `/admin/clients` — list of customers with order count, total spent, last order
   date; detail page listing their orders.
6. **Suppliers** `/admin/suppliers` — CRUD: name, contact name, email, phone, address, notes.
7. **Purchases** `/admin/purchases` — list of purchase orders; create a purchase against a supplier
   with line items (product, quantity, unit cost); a purchase moves through
   `draft → ordered → received → cancelled`. Marking a purchase **received** increments the stock
   of each product by the received quantity and records the total cost.

- **Acceptance:** every admin screen has a working empty state and a working "create" flow; CRUD
  mutations are validated server-side and show a success/error toast; the overview numbers are
  computed from the database, not hard-coded.

### 3.7 Dashboard (ERP) vs. store terminology

The admin area is the "dashboard"/ERP; the public area is the "store". Route prefixes:
public routes are top-level (`/products`), admin routes are under `/admin`.

---

## 4. Data model (MySQL, Drizzle)

All money is stored as **integer cents** (`priceCents`, `totalCents`) — never floats.
All timestamps are `datetime` in UTC.

### 4.1 `users`
| column | type | notes |
|---|---|---|
| id | int, PK, autoincrement | |
| name | varchar(120) | not null |
| email | varchar(255) | not null, unique, lowercased |
| passwordHash | varchar(255) | bcrypt |
| role | enum('client','admin') | default `client` |
| phone | varchar(40) | null |
| city | varchar(120) | null |
| address | varchar(255) | null |
| createdAt / updatedAt | datetime | |

### 4.2 `sessions` — not used; auth is stateless JWT (see 3.1).

### 4.3 `categories`
`id`, `name` (unique), `slug` (unique), `description` (text, null), `imageUrl` (varchar, null),
`sortOrder` (int, default 0), `isActive` (boolean, default true), timestamps.

### 4.4 `products`
`id`, `name`, `slug` (unique), `sku` (varchar, null), `shortDescription` (varchar 255, null),
`description` (text), `priceCents` (int, not null), `compareAtCents` (int, null),
`categoryId` (FK → categories, restrict), `images` (JSON array of URL strings, default `[]`),
`stock` (int, default 0), `minStock` (int, default 5 — the low-stock threshold),
`isActive` (boolean, default true), `ageMin` / `ageMax` (int years, null), timestamps.

### 4.5 `cart_items`
`id`, `userId` (FK → users, cascade), `productId` (FK → products, cascade), `quantity` (int),
`createdAt`; unique(userId, productId).

### 4.6 `orders`
`id`, `orderNumber` (varchar, unique, e.g. `KT-2026-0001`), `userId` (FK → users, restrict),
`status` enum('pending','confirmed','shipped','delivered','cancelled') default `pending`,
`paymentMethod` enum('cod') default `cod`,
`paymentStatus` enum('unpaid','paid') default `unpaid`,
`subtotalCents`, `shippingCents` (default 0), `totalCents`,
`customerName`, `customerEmail`, `customerPhone`, `city`, `shippingAddress`, `notes` (text, null),
`createdAt`, `updatedAt`.

### 4.7 `order_items`
`id`, `orderId` (FK → orders, cascade), `productId` (FK → products, set null — nullable because the
product may later be deleted), `productName` (snapshot), `productSlug` (snapshot),
`unitPriceCents` (snapshot), `quantity`; unique(orderId, productId).

### 4.8 `suppliers`
`id`, `name` (unique), `contactName`, `email`, `phone`, `address`, `notes` (text, null), timestamps.

### 4.9 `purchases`
`id`, `purchaseNumber` (varchar, unique, e.g. `PO-2026-0001`), `supplierId` (FK → suppliers,
restrict), `status` enum('draft','ordered','received','cancelled') default `draft',
`orderedAt` (datetime, null), `receivedAt` (datetime, null), `totalCents` (int, default 0),
`notes` (text, null), timestamps.

### 4.10 `purchase_items`
`id`, `purchaseId` (FK → purchases, cascade), `productId` (FK → products, restrict),
`quantity` (int), `unitCostCents` (int), `receivedQuantity` (int, default 0);
unique(purchaseId, productId).

### 4.11 Order of work for the schema
`users` → `categories` → `products` → `suppliers` → `purchases` → `purchase_items` →
`orders` → `order_items` → `cart_items`.

---

## 5. Architecture

### 5.1 Monorepo layout

```
kidstoys/
├── apps/
│   ├── web/            # Next.js — storefront + dashboard UI
│   └── api/            # Express — REST API (the "back end")
├── packages/
│   ├── db/             # Drizzle schema, client, migrations, seed
│   ├── shared/         # types, zod schemas, formatters shared by both apps
│   └── ui/             # shared React components (buttons, inputs, tables, cards)
├── docs/
│   └── project-contract.md
├── pnpm-workspace.yaml
└── package.json
```

### 5.2 Request flow

```
Browser ──► Next.js (apps/web)
              │  · server components fetch data for rendering
              │  · /api/* route handler proxies to the Express API
              ▼
           Express (apps/api) ──► Drizzle ──► MySQL
```

- `apps/web/src/app/api/[...path]/route.ts` is a **single catch-all proxy**: it forwards method,
  body, query and `Cookie` header to `API_BASE_URL`, and copies the response (including
  `Set-Cookie`) back. Browser traffic therefore stays same-origin — no CORS configuration, and
  the auth cookie is first-party.
- Server-side fetches from React Server Components use `apiFetch()` in `packages/shared`, which
  forwards the incoming request's cookie header so the server renders authenticated content.
- The Express API is the only component that talks to the database. The web app never imports
  `packages/db` for reads it could get from the API — except for the BFF proxy's typing.

### 5.3 Ports and environment

| Variable | Where | Value / note |
|---|---|---|
| `DATABASE_URL` | api, db | `mysql://user:pass@localhost:3306/kidstoys` |
| `JWT_SECRET` | api | long random string; required in production |
| `API_BASE_URL` | web (server-side) | `http://localhost:4000` |
| `API_PORT` | api | `4000` |
| `NEXT_PUBLIC_...` | web | none required — the browser only talks to the same-origin proxy |

`.env.example` files ship in `apps/api` and `apps/web`; real `.env` files are git-ignored.

### 5.4 Tech choices

- **Next.js 15/16 App Router**, React 19, TypeScript strict, Tailwind CSS v4.
- **Express 5** + TypeScript, `tsx` for dev, `tsc` for build.
- **Drizzle ORM** + `mysql2`; migrations generated by `drizzle-kit` and applied with
  `drizzle-kit migrate` (or `push` in development).
- **Zod** for request validation in the API and form validation in the web app.
- **bcryptjs** for hashing (no native build step).
- No UI component library — `packages/ui` holds a small hand-rolled set so the visual identity is
  ours and easy to re-theme (see section 10).

---

## 6. API surface

All endpoints are under `/api`. Errors are JSON: `{ "error": { "message": string, "fields"?: object } }`.
Status codes: 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict
(e.g. duplicate email, insufficient stock), 500 unexpected.

### Auth
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | public | create customer account |
| POST | `/api/auth/login` | public | sign in, sets cookie |
| POST | `/api/auth/logout` | any | clears cookie |
| GET | `/api/auth/me` | any | current user (null if anonymous) |
| PATCH | `/api/auth/me` | any | update profile / password |

### Store (public + customer)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/categories` | public | active categories |
| GET | `/api/products` | public | list: `q`, `category`, `sort`, `page` |
| GET | `/api/products/:slug` | public | product detail |
| GET | `/api/cart` | customer | current cart with totals |
| POST | `/api/cart/items` | customer | add product `{ productId, quantity }` |
| PATCH | `/api/cart/items/:productId` | customer | set quantity |
| DELETE | `/api/cart/items/:productId` | customer | remove line |
| POST | `/api/cart/merge` | customer | merge guest cart |
| POST | `/api/orders` | customer | place COD order `{ items?, ...address }` |
| GET | `/api/orders` | customer | own orders |
| GET | `/api/orders/:orderNumber` | customer | own order detail |

### Admin — all require role `admin`
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/overview` | KPIs, recent orders, low stock, recent purchases |
| GET/POST | `/api/admin/categories` | list / create |
| PATCH/DELETE | `/api/admin/categories/:id` | update / delete |
| GET/POST | `/api/admin/products` | list / create |
| PATCH/DELETE | `/api/admin/products/:id` | update / delete |
| GET/POST | `/api/admin/orders` | list (filters) / not used |
| PATCH | `/api/admin/orders/:id` | status / payment updates |
| GET | `/api/admin/clients` | customers with aggregates |
| GET | `/api/admin/clients/:id` | customer detail + orders |
| GET/POST | `/api/admin/suppliers` | list / create |
| PATCH/DELETE | `/api/admin/suppliers/:id` | update / delete |
| GET/POST | `/api/admin/purchases` | list / create |
| GET/PATCH | `/api/admin/purchases/:id` | detail / update status & receive |

---

## 7. UX and content rules

- Storefront: product name, price, one-line description, image, stock badge, add-to-cart.
  Prices are always shown in the store's currency format (`12.50 €`-style, formatted by a shared
  helper).
- The dashboard is dense and functional: tables, filters, and small stat cards. No hero sections.
- Every mutating action gives immediate feedback (toast) and the list refreshes.
- Forms show inline field errors returned by the API, keyed by field name.
- Empty states exist for every list (cart, orders, products, purchases, customers).
- Mobile: the storefront is responsive down to 360px; the dashboard is usable at ≥1024px and
  degrades to a scrollable layout below that.

---

## 8. Testing and quality gates

- TypeScript strict mode in every package; `pnpm typecheck` must pass.
- Lint: ESLint (Next core-web-vitals for the web app) — `pnpm lint` must pass.
- Unit tests with Vitest for the pure logic: price/cart totals, order-number generation, slug
  generation, validators.
- API integration tests run against a disposable MySQL schema (test transactions) covering:
  register/login/role guard, cart operations, order placement with stock decrement and
  insufficient-stock rejection, category delete guard, purchase receipt incrementing stock.
- Seed script creates the admin user, a handful of categories, ~24 products, 2 suppliers and a
  sample purchase, so the dashboard is not empty on first run.

---

## 9. Definition of done (v1)

- [ ] `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test` all pass from a clean checkout.
- [ ] With a MySQL instance running and migrations applied + seed executed:
      a customer can register, browse, add to cart, check out with COD, and see their order.
- [ ] The admin can log in and manage categories, products, orders, customers, suppliers and
      purchases, and see correct overview metrics.
- [ ] Stock decrements on order and increments on purchase receipt; cancelling an order restores stock.
- [ ] Every admin action is protected server-side (API returns 401/403 for non-admins).
- [ ] `docs/project-contract.md` stays in sync with the implementation.

---

## 10. Open decisions (waiting on the owner)

These are intentionally **not** decided in this contract. Until answered, the app uses a neutral
placeholder theme that is trivially replaceable.

### 10.1 Colors
Placeholder palette is defined **only** in `packages/ui/src/tokens.ts` (and the CSS variables in
`apps/web/src/app/globals.css` that mirror it). To change the identity, edit those files — no
component hard-codes a colour. Open questions:
- Primary brand colour (used for buttons, links, focus rings)?
- Accent / "fun" colour for the kids-facing storefront (toys are playful — but too much hurts trust)?
- Neutral ramp (backgrounds, surfaces, borders, text)?
- Semantic colours for order statuses (pending / confirmed / shipped / delivered / cancelled)?

### 10.2 Logo and imagery
- Logo: wordmark, mark, or mascot? Any existing brand assets?
- Placeholder logo component lives in `packages/ui/src/logo.tsx` and is used by the storefront
  header, the dashboard sidebar and the favicon.
- Product imagery: placeholder images (generated locally / solid placeholders) or a stock photo
  provider? Any images the owner wants to supply?

### 10.3 Payments
- COD is implemented for v1. When a provider is chosen, the change is contained to the
  checkout route and the order/payment fields (`paymentMethod`, `paymentStatus` already model it).

### 10.4 Business rules to confirm
- Shipping: flat fee, free above a threshold, or per-city? (v1 assumes flat, configurable
  constant.)
- Currency and its formatting.
- Are taxes included in the displayed price?
- Who can cancel an order, and at which statuses? (v1: admin only, before `shipped`.)
- Should customers be able to reorder a past order?
- Are product prices VAT-inclusive?

### 10.5 Account extras (deferred)
- Email verification, password reset, "forgot password".
- Wishlist, product reviews, coupons/discounts, multi-language, dark mode.

---

## 11. Implementation order

1. Monorepo plumbing: `packages/db`, `packages/shared`, `packages/ui`, Express app skeleton,
   Next.js app skeleton, env examples, MySQL compose file.
2. Database schema + migrations + seed.
3. Auth (register/login/logout/me, JWT cookie, role guard middleware).
4. Public catalog endpoints + admin CRUD endpoints (categories, products, suppliers).
5. Storefront pages (home, category, listing, product detail).
6. Cart + checkout + orders + customer account.
7. Admin dashboard pages (all sections) + overview metrics.
8. Tests, lint/typecheck cleanup, README, final walkthrough.

---

## 12. Change log

- **v1 (draft)** — initial contract: full feature set, MySQL + Drizzle, Express API + Next.js web,
  COD payments, credentials auth with client/admin roles, full ERP dashboard. Brand and several
  business rules left open in section 10.
