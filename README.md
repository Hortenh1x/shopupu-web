# shopupu-web

Next.js frontend for the shopupu clothing shop (`/api/v1`).

## Local Run

```bash
# 1. backend (from ../shopupu): docker compose up -d db, then
#    ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
# 2. frontend
npm install
npm run dev        # http://localhost:3000
```

Production build: `npm run build && npm run start`. Type check: `npm run typecheck`.

## Environment

- `NEXT_PUBLIC_API_BASE_URL` — backend URL (default `http://localhost:8080`).

## What's inside

- **Catalog**: search with filters (query, category, brand, gender, size, color,
  price range, in-stock), product page with a size/color **variant picker**,
  live availability, old-price sale badges, image gallery.
- **Cart**: works for **guests** — the backend issues an `X-Cart-Token` which the
  client stores and sends; on login/register the header is passed along and the
  guest cart is merged into the account.
- **Checkout**: promo-code validation, order creation with an `Idempotency-Key`,
  shipping address (with address-book prefill) + method with live totals,
  payment creation (`Idempotency-Key`), payment status polling.
- **Orders**: paged list with status filter, detail page with item snapshots
  (sku/size/color/brand), shipment tracking, cancel before payment.
- **Auth**: login/register (JWT + rotating refresh, auto-refresh on 401),
  forgot/reset password and email verification via one-time tokens, logout.
- **Profile**: personal data + preferred size, address book with default,
  wishlist, consent journal, change password, GDPR export (JSON download) and
  account deletion.
- **Admin** (`/admin`, ADMIN/MANAGER): products with clothing attributes,
  **variant editor** (SKU/size/color/price/stock) and image uploads; categories;
  paged orders with valid status transitions, status history, shipping updates
  and payment refunds; review moderation (approve/reject); promo codes; users.

## Structure

- `src/lib/api` — typed API client (`types.ts`, `shop.ts`, `client.ts` with
  refresh single-flight, guest-cart token and Idempotency-Key support)
- `src/lib/auth` — session storage + `AuthProvider`
- `src/features/*` — feature components (catalog, cart, orders, payments,
  shipping, reviews, profile, admin)
- `src/app` — App Router pages (thin wrappers around features)

Design is intentionally minimal (global CSS classes only) — a full redesign is
planned separately.
