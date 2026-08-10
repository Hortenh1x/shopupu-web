# shopupu-web

Next.js 16 (App Router, TypeScript strict) storefront + admin for the shopupu
clothing shop. The Spring Boot backend lives in `../shopupu` and owns all data;
this app is a pure API client — no server-side data layer of its own.

## Commands

```bash
npm run dev          # dev server on :3000 (port is load-bearing, see below)
npm run build        # production build; reads .env.production unless overridden!
npm run start        # serve the build on :3000
npm run typecheck    # tsc --noEmit, includes the API drift check
npm test             # Vitest unit/component suite (jsdom)
npm run e2e          # Playwright smoke; needs backend + `npm run build` first
npm run api:generate # regenerate src/generated/api.d.ts from the running backend
```

## Backend contract

- Base URL comes from `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8080`),
  all endpoints under `/api/v1`. JWT access token in memory, rotating refresh
  token in localStorage, auto-refresh on 401 (single-flight) in `src/lib/api/client.ts`.
- Guest carts: backend issues a token the client echoes as `X-Cart-Token`;
  login/register send it so the backend merges the guest cart.
- Checkout/payments send an `Idempotency-Key` header.
- Catalog search: clothing size is the `variantSize` query param; plain `size`
  is Spring's page-size. Never bind a String `size` next to a Pageable.
- CORS (dev profile) allows only `http://localhost:3000`, `http://localhost:5173`
  and `http://127.0.0.1:3000`. That is why dev/start pin `-p 3000` — do not
  change the port and do not "fix" API errors by proxying; fix the origin.

## API types — generate first

`src/generated/api.d.ts` is generated from the backend OpenAPI spec and
committed. `src/lib/api/types.ts` keeps the stricter hand-written mirror the app
actually imports, and `src/lib/api/types.compat.ts` statically asserts the two
stay in sync — drift fails `npm run typecheck` with the offending field name.
After any backend contract change: start the backend, `npm run api:generate`,
then fix `types.ts` until typecheck is green.

## Layout

- `src/app` — routes only (thin wrappers), route groups `(shop)`, `(auth)`, `admin`
- `src/features/<domain>` — page-level client components (catalog, cart, orders,
  payments, shipping, auth, profile, reviews, stylist, admin)
- `src/lib/api` — fetch client, typed endpoint groups (`shop.ts`), types + drift check
- `src/lib/auth` — session storage + `AuthProvider` context
- `src/components` — shared UI; styling comes from `src/app/globals.css` classes
  (tangerine editorial system, see DESIGN.md) — no CSS-in-JS, no Tailwind

## Local backends on this machine

`:8080` may be the **prod** docker container (`shopupu-app-1`, host network,
CORS locked to shopupu.net). For a dev API start a second instance from
`../shopupu`:

```bash
./mvnw -o spring-boot:run -Dspring-boot.run.profiles=dev \
  "-Dspring-boot.run.arguments=--server.port=8081 [--payments.callback-secret=e2e-secret]"
```

It shares the docker Postgres (`shopupu-db-1`), starts warm in ~6s, and is safe
to kill afterwards.

## Testing notes

- Unit tests mock `fetch` via `src/test/fetchMock.ts` route tables; jsdom's
  localStorage is shadowed by Node's experimental one, so `src/test/setup.ts`
  installs an in-memory Storage.
- E2e: build with `NEXT_PUBLIC_API_BASE_URL=http://localhost:<port>` first —
  a bare `npm run build` reads `.env.production` and bakes in shopupu.net.
  The stub payment stays PENDING unless `E2E_PAYMENT_CALLBACK_SECRET` (and
  optionally `E2E_CALLBACK_API_BASE_URL`) lets the test sign the provider
  callback; see `e2e/smoke.spec.ts`.
