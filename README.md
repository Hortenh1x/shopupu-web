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
  The backend allows this origin via CORS for the `dev` profile.

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
  and payment refunds; review moderation (approve/reject); promo codes; users;
  **AI maintenance** (embeddings backfill, recommendations recompute, review
  summaries refresh - async 202 triggers).
- **AI catalog features** (degrade gracefully when `AI_ENABLED` is off on the
  backend): **smart search** toggle on the catalog (`nl-search` parses plain
  words into filters), "You may also like" (`/similar`) and "Often bought
  together" (`/bought-together`) rails plus an AI review summary
  (`/review-summary`, hidden until generated) on the product page.

## Structure

- `src/lib/api` — typed API client (`types.ts`, `shop.ts`, `client.ts` with
  refresh single-flight, guest-cart token and Idempotency-Key support)
- `src/lib/auth` — session storage + `AuthProvider`
- `src/features/*` — feature components (catalog, cart, orders, payments,
  shipping, reviews, profile, admin)
- `src/app` — App Router pages (thin wrappers around features)

Design: warm editorial "tangerine" system (cream surfaces, tangerine panels,
golden highlight marks; Bricolage Grotesque + Inter + JetBrains Mono via
`next/font`), implemented as plain global CSS classes in `src/app/globals.css`.
Tokens and rules: [DESIGN.md](DESIGN.md), strategy: [PRODUCT.md](PRODUCT.md).
