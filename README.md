# Home Essentials by Kamgol — Admin

Next.js admin dashboard — login, product catalogue, and order fulfilment.

## Prerequisites

- Node 20+
- API running ([home-essentials-backend](../home-essentials-backend))
- Admin user seeded in MongoDB ([admin-seed.md](../home-essentials-backend/docs/admin-seed.md))

## Environment

Create `.env.local` (not committed):

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
```

In production, point this at your deployed API (`https://api.example.com`). Ensure backend `CORS_ORIGINS` includes this admin origin (local default port **3001**).

## Run

```bash
npm install
npm run dev
```

Admin: [http://localhost:3001](http://localhost:3001)

## Routes

| Path                                    | Purpose                                                                                |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| `/login`                                | Admin JWT login                                                                        |
| `/products`                             | Catalogue list                                                                         |
| `/products/new` · `/products/[id]/edit` | Create / edit (variants, sizes or cleaning pricing, optional authenticity video ≤5MB) |
| `/orders` · `/orders/[id]`              | List / detail; status chain; delete abandoned                                          |

## Brand

Gold primary `#AE7820` — `src/lib/brand.ts` and Ant Design theme.

## Build

```bash
npm run build
```
