# Progress

> Updated per phase. One source of truth for what's done, in progress, blocked, and next.

## Phase 0 — Skill Setup ✅
- [x] Searched 5 skill categories (offline PWA, POS retail, payment gateway, thermal printer, barcode scanner)
- [x] Installed `integrate-midtrans-payments` (official Veritrans publisher)
- [x] Loaded local skills: grill-me, ponytail, design-taste-frontend, ui-ux-pro-max, shadcn, huashu-design, improve-codebase-architecture
- [x] Decision: no other external skills clear the bar yet — revisit when scope confirms hardware needs

## Phase 1 — Discovery ✅
- [x] Q1: Single business (Hadzka Shop only) — no multi-tenant
- [x] Q2: Online-only architecture — offline mode out of scope. Lightweight retry buffer approved.
- [x] Q3: Cash + Midtrans (QRIS) — Xendit out of scope
- [x] Q4: Single outlet
- [x] Q5: MVP success metric defined (one full business day end-to-end)
- [x] Q6-Q9: Additional scope locked (refunds, discounts, till closing, user roles)
- [x] Q10: PDF receipt first, thermal printer deferred
- [x] Q11: Tax/PPN configurable via shop settings, discount input at checkout
- [x] Cross-cutting: all business values dynamic, no hardcoded/static values
- [x] All decisions logged in `docs/decisions.md`

## Phase 2 — Foundation Docs ✅
- [x] PRD.md — product requirements with explicit Out of Scope section
- [x] architecture.md — stack, folder structure, data model, API contracts
- [x] design.md — POS cashier cockpit design system
- [x] AGENTS.md — operating rules for all agents
- [x] docs/testing.md — acceptance criteria
- [x] **REVIEWED** — Owner approved foundation docs

## Phase 3 — Execution Plan 🔲
- [x] `docs/implementation-plan.md` — phased, checkbox-based execution plan created
- [ ] **AWAITING REVIEW** — Owner review and approval required before Phase 4

## Phase 3.5 — Review Fixes ✅
- [x] Item 1: `EXPIRED` added to `TransactionStatus` in schema, PRD, architecture, testing, decisions
- [x] Item 2: `StockAdjustment` → `StockMovement` with `SALE` type + `referenceId`; atomicity requirement propagated to architecture non-negotiable #4 + implementation-plan Phase 4.4
- [x] Item 3: RBAC server-side enforcement documented in decisions + implementation-plan Phase 4.1
- [x] Item 4: Indonesian UI + icon+text rules in design.md + testing.md + decisions
- [x] Open Q1: `TRANSFER` removed from `PaymentMethod` enum; bank transfers handled as Cash
- [x] Open Q2: tRPC committed to stack (architecture, decisions, implementation-plan)
- [x] Open Q3: Wireframe to be generated before Phase 4.3 POS build
- [x] Open Q4: UX micro-constraints pinned in design.md (max 5 taps, no stacked modals, confirm before destructive, Bayar confirmation)
- [x] Bonus: orphan `generated/` folder at repo root deleted (stale Prisma client)
- [x] Schema validated + Prisma client regenerated

## Phase 4 — Execution 🔲
### Phase 4.1 — Foundation & Auth ✅
- [x] Next.js 15 App Router + Tailwind CSS v4 initialized
- [x] shadcn/ui configured
- [x] PostgreSQL database + Prisma schema setup
- [x] Initial Prisma migration
- [x] NextAuth.js (Auth.js v5) with credentials provider
- [x] Seed initial Owner account
- [x] Setup tRPC v11 with App Router integration
- [x] Enforce role-based permission checks server-side
- [x] Scaffold base layouts (POS two-panel, Admin sidebar)

### Phase 4.2 — Products & Settings ✅
- [x] Settings page (tax rate, shop info) built with tRPC + db integration
- [x] Products CRUD (Owner only) + soft delete
- [x] Categories CRUD
- [x] Users CRUD (Owner manages Cashiers)

### Phase 4.3 — Core POS & Cart (Week 2) 🔲
