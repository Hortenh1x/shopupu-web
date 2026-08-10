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
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — Google OAuth Web Client ID; empty hides the
  Google button. Must match the backend's `GOOGLE_CLIENT_ID`.
- `NEXT_PUBLIC_BANK_APP_PROTOCOL` — deep-link scheme for handing a payment to a
  bank app (optional).

All three are **inlined at build time** (`NEXT_PUBLIC_*`), so a production build
must be made with production values — see Deployment.

## Testing

```bash
npm run typecheck   # tsc; src/lib/api/types.compat.ts fails it when the
                    # hand-written API types drift from the generated OpenAPI schema
npm test            # Vitest + Testing Library (22 tests): JWT auto-refresh
                    # single-flight, guest-cart token + login merge, Idempotency-Key,
                    # shipping Zod schema, CheckoutPage promo flow
npm run e2e         # Playwright smoke: catalog -> product -> guest cart ->
                    # register (cart merge) -> checkout -> shipping -> stub payment
```

The e2e run needs a dev-profile backend and a build pointed at it:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080 npm run build
npm run e2e
```

The stub payment stays `PENDING` unless the backend runs with
`--payments.callback-secret=...` and the same value is passed as
`E2E_PAYMENT_CALLBACK_SECRET` — then the test signs the provider callback
itself and asserts the UI flips to "Payment succeeded"
(`E2E_CALLBACK_API_BASE_URL` may point at a second backend instance that
shares the database).

After backend contract changes: `npm run api:generate` against the running
backend, then fix `src/lib/api/types.ts` until `npm run typecheck` is green.

## Deployment (shopupu.net)

The frontend is served from the **same machine as the backend** behind one
Cloudflare Tunnel with path routing — same-origin API, so no CORS in prod:

```
https://shopupu.net/api/*, /uploads/*  ->  localhost:8080 (Spring, docker `app` service)
https://shopupu.net/*                  ->  localhost:3000 (this app)
```

Full runbook: [`../shopupu/docs/deploy-cloudflare.md`](../shopupu/docs/deploy-cloudflare.md)
(tunnel hostnames table, `deploy/shopupu-web.service` systemd unit for
`next start`). `.env.production` pins `NEXT_PUBLIC_API_BASE_URL=https://shopupu.net`,
so a plain `npm run build` on this machine produces the production bundle.

Alternative packaging — the multi-stage `Dockerfile` (standalone Next.js,
listens on :3000):

```bash
docker build -t shopupu-web \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://shopupu.net \
  --build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID=<prod client id> \
  --build-arg NEXT_PUBLIC_BANK_APP_PROTOCOL=<scheme://> .
docker run -d --name shopupu-web --network host shopupu-web
```

(or add it as a `frontend` service next to `app` in `../shopupu/docker-compose.yml`).

Still needed for a complete prod setup (values only the operator has):

- [ ] real `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (Google Cloud Console; backend
      `GOOGLE_CLIENT_ID` must match) — Google sign-in stays hidden until set
- [ ] real `NEXT_PUBLIC_BANK_APP_PROTOCOL` if the bank hand-off is wanted
- [ ] post-deploy smoke: open https://shopupu.net — catalog renders, product
      page, add to cart, login, checkout to the payment step; watch the browser
      console for CSP/CORS errors

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
