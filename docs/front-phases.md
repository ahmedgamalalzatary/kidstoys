# Front Phases — Storefront + ERP

**Status: paused.** The back end ([back-phases.md](./back-phases.md)) is being built first.
The scaffolding for both apps already exists and stays committed:

```
apps/store   Next.js — the public storefront
apps/erp     Next.js — the admin dashboard (ERP)
packages/ui  shadcn design system, neutral theme (brand still open)
```

Nothing in this file is built yet. Each phase below is a vertical slice: API ready → UI →
tests → commit.

Shared rules for the front end:

- Server components fetch through the Express API; the browser never talks to it directly.
- Every app exposes a catch-all `/api/*` proxy that forwards to the API and carries the
  session cookie (`kidstoys_session`) in both directions.
- The API is the source of truth for prices, totals, stock and permissions. The UI never
  computes an order total.
- Brand colours and logo are open decisions (contract §10.1–10.2). Everything reads from
  `packages/ui/src/styles/theme.css` and `packages/ui/src/tokens.ts` — no colour is hard-coded.
- Components come from `@kidstoys/ui` (shadcn). New primitives get added there, not in an app.

---

## F0 — App foundations

- [ ] Catch-all API proxy route in both apps: forwards method, body, query and cookies,
      returns the API status, body and `set-cookie` headers.
- [ ] Server-side API client per app: forwards the incoming request's cookie, raises a typed
      error carrying the API message and per-field errors.
- [ ] Session helpers: `getSessionUser()` for server components, `signOut()` action.
- [ ] Root layout wired to the shared theme; `<Toaster />` mounted; font and metadata set.
- [ ] Store header (logo placeholder, navigation, cart badge, account menu) and footer.
- [ ] Tests: the proxy forwards cookies and status; the client raises field errors.

## F1 — Storefront catalog

- [ ] Home page: hero, category tiles, featured and newest products.
- [ ] Category page (`/category/[slug]`): that category's products plus a category sidebar.
- [ ] Listing (`/products`): search box, category filter, sort control, pagination — all
      reflected in the URL query string.
- [ ] Product detail (`/product/[slug]`): images, price, description, stock badge, quantity
      picker, add to cart, breadcrumbs.
- [ ] Out-of-stock products cannot be added to the cart.
- [ ] Responsive down to 360px; empty states for "no results".

## F2 — Storefront accounts

- [ ] Register and login pages with inline field errors from the API.
- [ ] Guest cart in `localStorage`, merged into the server cart on sign-in.
- [ ] Account area: profile edit, password change, sign out.
- [ ] Order history and order detail pages for the signed-in customer.

## F3 — Storefront cart and checkout

- [ ] Cart page: line items, quantity stepper, remove, subtotal, shipping, total.
- [ ] Header badge shows the item count.
- [ ] Checkout form (name, phone, city, address, notes) with cash-on-delivery notice.
- [ ] Order confirmation page with the order number and items.
- [ ] Stock errors from the API surface as a readable message on the cart page.

## F4 — ERP shell and overview

- [ ] ERP login page (admin only); a customer session is rejected.
- [ ] Admin layout: sidebar navigation, top bar with the admin's name and sign out.
- [ ] Overview page: KPI cards, recent orders, low-stock list, recent purchases.

## F5 — ERP catalog management

- [ ] Categories: table with search and product counts, create/edit dialog, delete with guard.
- [ ] Products: table with search, category filter and stock filter; create/edit form with the
      image URL list; delete with the "appears in an order" guard.
- [ ] Every mutation shows a success or error toast and refreshes the list.

## F6 — ERP orders and customers

- [ ] Orders: list with search and status filter, detail page with status and payment actions.
- [ ] Customers: list with order count, total spent and last order; detail with their orders.

## F7 — ERP suppliers and purchases

- [ ] Suppliers: table, create/edit dialog, delete guard.
- [ ] Purchases: list, create with line items, status actions including "mark received"
      (which is what increases stock).

## F8 — Polish

- [ ] Responsive pass on both apps (storefront 360px+, ERP 1024px+).
- [ ] Loading, empty and error states everywhere a list is rendered.
- [ ] Accessibility pass: focus order, labels, contrast.
- [ ] Brand applied once the owner answers the open questions in contract §10.
- [ ] README updated with how to run both apps.

---

## Definition of done for the front end

- A customer can browse, register, add to cart and place a cash-on-delivery order.
- The owner can run the whole shop from the ERP: categories, products, orders, customers,
  suppliers and purchases.
- Every screen has a loading, empty and error state.
- The UI never contradicts the API: totals, stock and permissions come from the API.
