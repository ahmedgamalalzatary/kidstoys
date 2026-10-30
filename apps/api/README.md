# KidsToys API

Express 5 REST API for the KidsToys storefront and admin dashboard. It uses MySQL through Drizzle ORM, Zod validation, JWT session cookies, and integer cents for all money values.

## Local setup

From the repository root:

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env` and set the database credentials and a strong `JWT_SECRET`.
3. Create the configured MySQL database.
4. Apply migrations with `pnpm db:migrate`.
5. Optionally create the admin, four categories, and 24 products with `pnpm db:seed`.
6. Start the API with `pnpm --filter @kidstoys/api dev`.

The API listens on `API_PORT` (default `4000`). Uploaded files are stored under `UPLOAD_DIR` (default `./uploads`) and served from `/uploads/*`. The seed uses `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

## Authentication

- `POST /api/auth/register` and `POST /api/auth/login` set the `kidstoys_session` cookie.
- The cookie is httpOnly, SameSite=Lax, and contains a signed JWT valid for `JWT_EXPIRES_IN` (default seven days).
- `POST /api/auth/logout` clears the cookie.
- Customer routes require a signed-in user. Every `/api/admin/*` route requires the `admin` role.
- Anonymous admin requests return `401`; authenticated non-admin requests return `403`.

## Errors

Errors use `{ "error": { "message": string, "fields"?: { "field": "message" } } }`.
Validation returns `400`, missing resources `404`, and conflicts such as duplicate names or invalid stock/status transitions `409`.

## Public and customer endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Register a customer and start a session |
| POST | `/api/auth/login` | Sign in and start a session |
| POST | `/api/auth/logout` | End the session |
| GET | `/api/auth/me` | Current profile |
| PATCH | `/api/auth/me` | Update profile or password |
| GET | `/api/categories` | Active categories with product counts |
| GET | `/api/characters` | Active characters with product counts |
| GET | `/api/age-groups` | Active age groups with product counts, youngest first |
| GET | `/api/products` | Paged public catalog |
| GET | `/api/products/:slug` | Active product detail |
| GET | `/api/cart` | Current customer's cart and totals |
| POST | `/api/cart/items` | Add or increment a product |
| PATCH | `/api/cart/items/:productId` | Set a line quantity |
| DELETE | `/api/cart/items/:productId` | Remove a line |
| POST | `/api/cart/merge` | Merge guest-cart items |
| POST | `/api/orders` | Place a cash-on-delivery order from the server cart |
| GET | `/api/orders` | Current customer's orders, newest first |
| GET | `/api/orders/:orderNumber` | Current customer's order detail |

`GET /api/products` accepts `q`, `category`, `character`, `ageGroup`, `age`, `new`, `bestSeller`, `sort`, `page`, and `pageSize`. Character and age-group slugs are comma-separated; values are ORed within a dimension and ANDed across dimensions. Sort values are `newest`, `price_asc`, `price_desc`, and `name_asc`.

Checkout revalidates stock, snapshots sell and buy prices, decrements stock, and clears the cart in one transaction. Public product and order responses never expose buy prices or unit costs.

## Admin endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/overview` | Paid-order revenue, COGS, gross profit, KPIs, recent orders, low stock |
| GET/POST | `/api/admin/categories` | List all categories / create |
| PATCH/DELETE | `/api/admin/categories/:id` | Update / delete when unused |
| GET/POST | `/api/admin/characters` | List all characters / create |
| PATCH/DELETE | `/api/admin/characters/:id` | Update / delete when unused |
| GET/POST | `/api/admin/age-groups` | List all age groups / create |
| PATCH/DELETE | `/api/admin/age-groups/:id` | Update / delete when unused |
| GET/POST | `/api/admin/products` | Paged product list / create |
| PATCH/DELETE | `/api/admin/products/:id` | Update / delete when absent from orders |
| GET | `/api/admin/orders` | Paged orders with `q`, `status`, `page`, `pageSize` |
| PATCH | `/api/admin/orders/:id` | Change status or payment status |
| GET | `/api/admin/clients` | Searchable customers with order and spending aggregates |
| GET | `/api/admin/clients/:id` | Customer detail and order history |

Product creation accepts JSON without images or `multipart/form-data` with up to eight `images` files. Required fields are `name`, `priceCents`, `buyPriceCents`, `categoryId`, and `stock`. Optional fields include descriptions, SKU, compare-at price, `videoUrl` (HTTPS only), stock thresholds, active/new/best-seller flags, `characterIds`, and `ageGroupIds`. JPEG, PNG, and WebP files up to 5 MB each are accepted; image URLs are rejected. Product patches support the same fields and replace uploaded images when new files are supplied.

Orders move `pending → confirmed → shipped → delivered`. Cancellation is allowed before shipping and restores reserved stock exactly once. Only paid orders count toward revenue, COGS, gross profit, and customer spending.

## Verification

- `pnpm test` — all workspace tests
- `pnpm --filter @kidstoys/api test:coverage` — API tests and enforced coverage thresholds
- `pnpm typecheck` — TypeScript across the workspace
- `pnpm lint` — ESLint across the workspace

API integration tests use a disposable `kidstoys_test` database and apply migrations during setup.
