# Home Essentials by Kamgol — Admin

Next.js admin dashboard — login, product catalogue, orders.

## Phase 0 status

Scaffold ready. Domain (categories, variants, piece/bundle pricing) lands in Phase 1–2. Gold brand `#AE7820` is applied to theme tokens.

## Prerequisites

- Node 20+
- API running ([home-essentials-backend](../home-essentials-backend))
- Admin user seeded in MongoDB

## Environment

Copy [`.env.local.example`](.env.local.example) to `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Run

```bash
npm install
npm run dev
```

Default: [http://localhost:3001](http://localhost:3001) if you set `npm run dev -- -p 3001`, or use port 3000 if free. Prefer **3001** for admin so it matches CORS defaults.
