# shopupu-web

Next.js frontend for the `shopupu` ecommerce API.

## Local Run

```powershell
npm install
npm run dev
```

The app runs on `http://localhost:3000`.

Required backend services:

- `shopupu` API on `http://localhost:8080`
- `Bank_back` on `http://localhost:5231`
- `Bank_Front_WPF` launched once to register `bankfront://`

## Environment

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_BANK_APP_PROTOCOL=bankfront://
```

## API Types

Run this after `shopupu` backend is up:

```powershell
npm run api:generate
```
