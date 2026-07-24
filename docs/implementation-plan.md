# Implementation Plan

> Phased execution plan for Hadzka Shop POS.

## Phase 4.1 — Foundation & Auth (Week 1)
- [ ] Initialize Next.js 15 App Router with Tailwind CSS v4.
- [ ] Setup shadcn/ui and configure the base theme (dark mode, colors, typography per `design.md`).
- [ ] Setup PostgreSQL database (via Supabase or Neon).
- [ ] Setup Prisma schema (9 tables per `architecture.md`).
- [ ] Run initial Prisma migration.
- [ ] Implement NextAuth.js (Auth.js v5) with credentials provider.
- [ ] Seed initial Owner account.
- [ ] Scaffold base layouts (POS two-panel layout, Admin sidebar layout).

## Phase 4.2 — Products & Settings (Week 1)
- [ ] Build Settings page (tax rate, shop info) with database integration.
- [ ] Build Products CRUD (Owner only) — name, SKU, price, stock, category.
- [ ] Implement soft-delete logic (`isActive` flag).
- [ ] Build Categories CRUD.
- [ ] Build Users CRUD (Owner manages Cashiers).

## Phase 4.3 — Core POS & Cart (Week 2)
- [ ] Build POS product grid (search, filter by category).
- [ ] Setup Zustand `cart-store.ts`.
- [ ] Implement cart logic (add/remove, adjust quantity).
- [ ] Implement subtotal, discount, and tax calculation.
- [ ] Build the Cart panel UI.

## Phase 4.4 — Transactions & Cash Payment (Week 2)
- [ ] Build checkout modal / flow for Cash payment.
- [ ] Implement `POST /api/transactions` for cash.
  - Snapshot product name, SKU, unit price.
  - Snapshot tax rate.
  - Atomically decrement stock in DB transaction.
- [ ] Generate PDF receipt on success (using `@react-pdf/renderer` or `jsPDF`).
- [ ] Add client-side retry buffer hook for resilience against blips.

## Phase 4.5 — Midtrans QRIS (Week 3)
- [ ] Integrate Midtrans Snap (server-side token generation).
- [ ] Build checkout flow for QRIS payment.
- [ ] Implement `POST /api/midtrans/webhook`.
  - Signature verification.
  - Idempotency & monotonic state updates.
  - Atomic stock decrement upon payment success.
- [ ] Sandbox end-to-end testing with Veritrans skill.

## Phase 4.6 — Till & Reports (Week 3)
- [ ] Build "Open Till" and "Close Till" flows.
- [ ] Calculate expected vs actual cash, log differences.
- [ ] Build Daily Summary report (total revenue, item breakdown, payment breakdown).
- [ ] Build Monthly Summary report.
- [ ] QA against acceptance criteria in `docs/testing.md`.
