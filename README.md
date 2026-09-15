# Home Essentials by Kamgol — Admin

Next.js admin dashboard — login, product catalogue, orders.

## Phase 2 status

Product create/edit supports Home Essentials categories, variants + images, free-text size piece/bundle pricing, and cleaning piece/dozen pricing. Gold brand `#AE7820`.

## Prerequisites

- Node 20+
- API running ([home-essentials-backend](../home-essentials-backend))
- Admin user seeded in MongoDB

## Environment

Create `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Run

```bash
npm install
npm run dev
```

Admin: [http://localhost:3001](http://localhost:3001)
