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
   categories, products, manual stock levels, orders, and customers, with an overview dashboard
   of key business metrics.

### 1.1 Goals

- A customer can go from landing page to placed order in under two minutes.
- The owner can run the entire business from the dashboard without touching a database client.
- Stock levels stay truthful: the admin adjusts them manually through product management, and they
  go down when an order is placed.
- Every list screen supports search/filter/pagination so the dataset can grow past demo size.

### 1.2 Non-goals for v1

- Real online payment (deliberately: cash on delivery until a provider is chosen — see 10.3).
- Cloud storage for product media (v1 stores uploaded image files locally — see 4.4).
- Emails/SMS notifications (order confirmation is on-screen only).
- Multi-warehouse inventory, supplier and purchase management, taxes/currency conversion,
  invoices/PDFs.
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
- Product listing `/products`: search by name, filter by category, by character and by age group
  (both multi-select), filter by the "new" and "best seller" badges, sort by newest / price asc /
  price desc, pagination (24 per page). Filters are reflected in the URL query string so a view
  can be shared/bookmarked.
- Product detail `/product/[slug]`: uploaded images, an optional external video, sell price,
  description, stock state, quantity selector, add-to-cart, breadcrumbs, the badges and the
  characters and age groups the product belongs to. Buy price is never exposed publicly.
- Products with zero stock are shown as "Out of stock" and cannot be added to the cart.
- **Acceptance:** a search for a term matches product names case-insensitively; an out-of-stock
  product's add-to-cart control is disabled and the API rejects adding it; a product tagged with
  two age groups shows up under both age filters.

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
  3. copies product name, sell price and buy price into `order_items` as snapshots (later price
     edits never rewrite history or historical profit);
  4. decrements `products.stock`;
  5. clears the cart.
- Order number is a human-readable sequential string, e.g. `KT-2026-0001`.
- Order status lifecycle: `pending → confirmed → shipped → delivered`, plus `cancelled` before
  `shipped`. Cancelling restores the reserved stock.
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

1. **Overview** `/admin` — KPI cards (revenue collected, cost of goods sold, gross profit, orders,
   customers, products, low-stock count), a recent-orders table, and a low-stock list.
   - Revenue, cost of goods sold and gross profit count only orders with `paymentStatus = 'paid'`.
   - Cost of goods sold uses the buy price snapshotted on each order item; gross profit is revenue
     minus cost of goods sold.
2. **Categories** `/admin/categories` — list with search and product counts; create/edit/delete.
   Deleting a category that still has products is blocked with a message.
3. **Products** `/admin/products` — list with search, category filter and stock filter; create/edit
   with name, description, sell price, buy price, compare-at price, SKU, manually adjusted stock,
   multiple image-file uploads, an optional external `https://` video URL, and active flag. The
   form picks the category, any number of characters, any number of age groups, and toggles the
   "new" and "best seller" badges. Deleting a product that appears in an order is blocked
   (soft-delete via `active = false` is offered instead). Buy price is admin-only.
4. **Orders** `/admin/orders` — list with search by order number/customer and status filter;
   order detail where the admin can change status and mark payment as paid/unpaid. Filtering by
   status uses query params.
5. **Customers** `/admin/clients` — list of customers with order count, paid-order total spent,
   last order date; detail page listing their orders.
6. **Characters** `/admin/characters` — the characters the shop sells (Spider-Man, Batman, …):
   list with search and product counts, create/edit/delete. Deleting a character that products
   still use is blocked.
7. **Age groups** `/admin/age-groups` — the age buckets the owner defines: list with product
   counts, create/edit/delete. Each group carries a name and a start/end age in years; the end
   age is optional for an open-ended group, and the list is ordered by start age.

- The three catalog dimensions — **category**, **character** and **age group** — are managed the
  same way and behave the same way: a product carries exactly one category and any number of
  characters and age groups.

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
`description` (text), `priceCents` (int, not null — sell price),
`buyPriceCents` (int, not null — unit buy price, admin-only), `compareAtCents` (int, null),
`categoryId` (FK → categories, restrict), `images` (JSON array of stored file paths, default `[]`),
`videoUrl` (varchar 500, null — optional external HTTPS video),
`stock` (int, default 0), `minStock` (int, default 5 — the low-stock threshold),
`isActive` (boolean, default true),
`isNew` (boolean, default false — the "new arrival" badge),
`isBestSeller` (boolean, default false — the "best seller" badge),
timestamps.

Product photos are uploaded as files, not submitted as URLs. Product create/update accepts
`multipart/form-data` with up to 8 JPEG, PNG or WebP files, enforces a file-size limit, and stores
the files outside the source tree. Product responses contain same-origin paths for rendering.
The external video remains a URL and is not uploaded.

The age of a product is **not** a column: it comes from the age groups it is tagged with
(§4.9). The old `ageMin` / `ageMax` columns are dropped — a product can sit in several age
groups at once, so a single min/max pair could not describe it.

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
`unitPriceCents` (sell-price snapshot), `unitCostCents` (buy-price snapshot), `quantity`;
unique(orderId, productId).

### 4.8 `characters`
The licensed characters the shop sells (Spider-Man, Batman, Elsa, …). Same shape as
`categories`: `id`, `name` (unique), `slug` (unique), `description` (text, null),
`imageUrl` (varchar, null), `sortOrder` (int, default 0), `isActive` (boolean, default true),
timestamps.

### 4.9 `age_groups`
The age buckets the catalog is sorted into — **the owner defines them**, there is no fixed set.
`id`, `name` (unique, e.g. `Toddlers`), `slug` (unique, generated from the name),
`startAge` (int, years, required), `endAge` (int, years, null — open-ended),
`isActive` (boolean, default true), timestamps.

`startAge` / `endAge` are what a bucket *means*: they are set once, when the group is created,
and they are not a per-product value. `endAge` is optional (null = open-ended) and may never be
smaller than `startAge`. The list is ordered by `startAge`, so the buckets read youngest first.

### 4.10 `product_characters`
Join table: `productId` (FK → products, cascade), `characterId` (FK → characters, cascade),
`createdAt`; unique(productId, characterId). A product can carry any number of characters.

### 4.11 `product_age_groups`
Join table: `productId` (FK → products, cascade), `ageGroupId` (FK → age_groups, cascade),
`createdAt`; unique(productId, ageGroupId). A product can carry any number of age groups.

### 4.12 Order of work for the schema
`users` → `categories` → `characters` → `age_groups` → `products` → `product_characters` →
`product_age_groups` → `orders` → `order_items` → `cart_items`.

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
| GET | `/api/characters` | public | active characters |
| GET | `/api/age-groups` | public | active age groups |
| GET | `/api/products` | public | list: `q`, `category`, `character`, `ageGroup`, `age`, `new`, `bestSeller`, `sort`, `page` |
| GET | `/api/products/:slug` | public | product detail |
| GET | `/api/cart` | customer | current cart with totals |
| POST | `/api/cart/items` | customer | add product `{ productId, quantity }` |
| PATCH | `/api/cart/items/:productId` | customer | set quantity |
| DELETE | `/api/cart/items/:productId` | customer | remove line |
| POST | `/api/cart/merge` | customer | merge guest cart |
| POST | `/api/orders` | customer | place a COD order from the server cart with the delivery address |
| GET | `/api/orders` | customer | own orders |
| GET | `/api/orders/:orderNumber` | customer | own order detail |

### Admin — all require role `admin`
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/overview` | revenue, COGS, gross profit, other KPIs, recent orders, low stock |
| GET/POST | `/api/admin/categories` | list / create |
| PATCH/DELETE | `/api/admin/categories/:id` | update / delete |
| GET/POST | `/api/admin/characters` | list / create |
| PATCH/DELETE | `/api/admin/characters/:id` | update / delete |
| GET/POST | `/api/admin/age-groups` | list / create |
| PATCH/DELETE | `/api/admin/age-groups/:id` | update / delete |
| GET/POST | `/api/admin/products` | list / create with multipart image-file uploads |
| PATCH/DELETE | `/api/admin/products/:id` | update / delete, including stock, buy price, video and uploaded images |
| GET/POST | `/api/admin/orders` | list (filters) / not used |
| PATCH | `/api/admin/orders/:id` | status / payment updates |
| GET | `/api/admin/clients` | customers with aggregates |
| GET | `/api/admin/clients/:id` | customer detail + orders |

### 6.1 Catalog dimensions: category, character, age group

The three ways a product is described beyond its name work the same way:

| | Category | Character | Age group |
|---|---|---|---|
| per product | exactly one | any number | any number |
| stored in | `products.categoryId` | `product_characters` | `product_age_groups` |
| deleted when in use | blocked (`409`) | blocked (`409`) | blocked (`409`) |
| public list | `GET /api/categories` | `GET /api/characters` | `GET /api/age-groups` |

Filtering on the product list:

- `character` and `ageGroup` take one or more slugs, comma-separated: `?character=spider-man,bob`.
  Several values inside one dimension match **any** of them (OR); picking a character *and* an
  age group narrows the result down (AND across dimensions).
- `age` takes a number of years and matches every product that sits in an age group whose range
  covers it — this is how the storefront answers "toys for a 3-year-old".
- `new=true` and `bestSeller=true` filter on the two badges.
- An unknown slug filters to an empty list, never to a 500.

### 6.2 Product payload

`POST /api/admin/products` and `PATCH /api/admin/products/:id` carry the dimensions and badges:

| field | type | notes |
|---|---|---|
| `categoryId` | int | required on create, one category |
| `priceCents` | int | required on create, unit sell price |
| `buyPriceCents` | int | required on create, non-negative unit buy price; admin-only |
| `videoUrl` | string \| null | optional external `https://` video URL |
| `images` | file[] | up to 8 uploaded JPEG, PNG or WebP files; not URLs |
| `characterIds` | int[] | replaces the product's characters wholesale on a patch |
| `ageGroupIds` | int[] | replaces the product's age groups wholesale on a patch |
| `isNew` | boolean | the "new arrival" badge |
| `isBestSeller` | boolean | the "best seller" badge |

The product response echoes `characters` and `ageGroups` as arrays of `{ id, name, slug }`, plus
the two badge flags, uploaded-image paths and video URL. Only admin product responses include
`buyPriceCents`; public catalog responses never expose it.

---

## 7. UX and content rules

- Storefront: product name, price, one-line description, image, stock badge, add-to-cart.
  Prices are always shown in the store's currency format (`12.50 €`-style, formatted by a shared
  helper).
- The dashboard is dense and functional: tables, filters, and small stat cards. No hero sections.
- Every mutating action gives immediate feedback (toast) and the list refreshes.
- Forms show inline field errors returned by the API, keyed by field name.
- Empty states exist for every list (cart, orders, products, customers).
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
  insufficient-stock rejection, buy-price snapshots, manual stock updates, image-file upload
  validation, public buy-price exclusion, and the category delete guard.
- Seed script creates the admin user, a handful of categories, and ~24 products with buy prices
  and locally stored placeholder images, so the dashboard is not empty on first run.

---

## 9. Definition of done (v1)

- [ ] `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test` all pass from a clean checkout.
- [ ] With a MySQL instance running and migrations applied + seed executed:
      a customer can register, browse, add to cart, check out with COD, and see their order.
- [ ] The admin can log in and manage categories, products, buy prices, uploaded images, external
      video URLs, manual stock levels, orders, and customers, and see correct overview metrics.
- [ ] Stock decrements on order, can be adjusted manually by the admin, and is restored when an
      order is cancelled.
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
4. Public catalog endpoints + admin CRUD endpoints (categories and products, including buy price,
   manual stock adjustment, image-file uploads and external video URLs).
5. Storefront pages (home, category, listing, product detail).
6. Cart + checkout + orders + customer account.
7. Admin dashboard pages (all sections) + overview metrics.
8. Tests, lint/typecheck cleanup, README, final walkthrough.

---

## 12. Change log

- **v1.3** — products gain an admin-only buy price and optional external video URL; image URLs
  are replaced by multi-file uploads; order items snapshot buy price for COGS and gross-profit KPIs.
- **v1.2** — supplier and purchase management removed; admins adjust stock directly through
  product management.
- **v1.1** — catalog dimensions: characters and age groups join categories as the three ways a
  product is described (any number of characters, any number of age groups, exactly one
  category); the age groups are the owner's own buckets, each with a start/end age, with no
  built-in set; the "new" and "best seller" badges become real product flags; the product list
  can be filtered by character, age group and badge; `ageMin` / `ageMax` give way to age groups.
- **v1 (draft)** — initial contract: full feature set, MySQL + Drizzle, Express API + Next.js web,
  COD payments, credentials auth with client/admin roles, full ERP dashboard. Brand and several
  business rules left open in section 10.
