# Decisions Log

> One entry per non-trivial technical or product decision. Prevents an agent in a later session from quietly relitigating or reverting something already settled.

## 2026-07-24 — Single-tenant architecture (Hadzka Shop only)
- **Decision:** Build for a single business (Hadzka Shop). No multi-tenant infrastructure — no tenant isolation, no org provisioning, no tenant-scoped RBAC.
- **Reason:** No confirmed demand from other businesses. Multi-tenant is a 3-5x complexity multiplier on every layer and a product pivot, not a feature.
- **Constraint:** Keep the data layer clean — use `shopId` foreign keys, avoid global singletons for "the shop" — so future extraction to multi-tenant is a deliberate migration, not a rewrite.
- **Alternatives rejected:** Multi-tenant from day one (no confirmed customers beyond Hadzka Shop).
- **Reversible?:** Yes — clean data layer makes future migration feasible but deliberate.

## 2026-07-24 — Online-only architecture (offline mode out of scope for MVP)
- **Decision:** Server is the single source of truth. No local-first database, no sync queues, no conflict resolution. Add a lightweight client-side retry/write-buffer for in-flight transactions to survive brief connectivity blips.
- **Reason:** Hadzka Shop's internet is confirmed stable. Offline-first is a 3-5x complexity multiplier on the data layer (IndexedDB/SQLite WASM, sync queues, conflict resolution, offline auth) not justified by real operating conditions.
- **Retry buffer scope:** Short-lived client-side buffer for in-flight transactions only. Does NOT change the source-of-truth model. Can be added without rewriting the persistence layer.
- **Alternatives rejected:** Offline-first / local-first architecture (complexity not justified by stable internet).
- **Reversible?:** No — offline-first fundamentally changes the data layer. If internet reliability degrades, this decision must be revisited and the data layer redesigned. The retry buffer is a resilience band-aid, not a migration path to offline-first.

## 2026-07-24 — Cash + Midtrans (QRIS) for MVP payments
- **Decision:** Two payment methods in MVP: cash and Midtrans (QRIS). Xendit and all other providers are explicitly out of scope.
- **Reason:** Cash is table stakes for Indonesian retail. Midtrans is the most established gateway, supports QRIS natively, has good sandbox/docs. One gateway shipped well beats two shipped half-done.
- **Skill installed:** `veritrans/midtrans-agent-skills@integrate-midtrans-payments` (official Veritrans publisher).
- **Alternatives rejected:** Cash-only (QRIS adoption too high in 2026 Indonesia to skip), Xendit (no strong reason to prefer over Midtrans), both providers (scope creep for one shop).
- **Reversible?:** Yes — additional payment providers can be added later behind a payment gateway abstraction.

## 2026-07-24 — Single outlet for MVP
- **Decision:** One physical location only. No multi-outlet sync, no per-outlet stock transfer, no cross-outlet reporting.
- **Reason:** Consistent with single-tenant decision. Hadzka Shop is confirmed as one location.
- **Alternatives rejected:** Multi-outlet from day one (no confirmed second location).
- **Reversible?:** Yes — if Hadzka Shop opens a second location, outlet model can be extended.

## 2026-07-24 — MVP success metric
- **Decision:** MVP is done when a cashier can run one full real business day at Hadzka Shop end-to-end — every sale (cash + Midtrans) processed without manual workaround, stock decrements match reality, end-of-day cash reconciliation matches the drawer.
- **Reason:** Operational completeness over transaction-count targets. The system must replace, not supplement, the current workflow.
- **Reversible?:** N/A — this is a success criterion, not a technical decision.

## 2026-07-24 — Refunds/voids: pre-payment cancel only in MVP
- **Decision:** MVP supports canceling a transaction BEFORE payment is finalized. Post-payment refunds are out of scope (manual process outside the system).
- **Reason:** Post-payment refunds involve Midtrans refund API, partial refund logic, and inventory reversal — too much surface for MVP.
- **Alternatives rejected:** Full refund flow (deferred to post-MVP).
- **Reversible?:** Yes — refund flow is additive.

## 2026-07-24 — Discounts: flat per-transaction only in MVP
- **Decision:** MVP supports flat percentage or fixed-amount discount per transaction only. No per-item promos, no tiered/BOGO rules.
- **Reason:** Promo rules = a rules engine. Explicitly deferred.
- **Alternatives rejected:** Per-item discounts, coupon system, tiered pricing (all deferred).
- **Reversible?:** Yes — discount model is additive.

## 2026-07-24 — End-of-day closing flow is core MVP
- **Decision:** MVP includes an explicit "close till" flow: cashier declares cash counted, system shows expected vs actual, difference is logged.
- **Reason:** This is the actual mechanism that satisfies "accurate money records." Without it, the MVP success metric (reconciliation matches the drawer) cannot be verified.
- **Alternatives rejected:** Deferring till close (would leave the MVP success metric unverifiable).
- **Reversible?:** N/A — core feature, not optional.

## 2026-07-24 — User roles: Owner + Cashier for MVP
- **Decision:** Two roles minimum — Owner (full access, reports, price editing) and Cashier (transactions only, cannot edit prices or view full reports).
- **Reason:** Basic fraud/reconciliation integrity. A cashier who can edit prices can hide theft. This is close to a hard requirement, not something to cut.
- **Alternatives rejected:** Single role (insufficient for basic integrity).
- **Reversible?:** N/A — more roles can be added, but these two are the floor.

## 2026-07-24 — Receipt output: PDF first, thermal printer deferred
- **Decision:** MVP generates a PDF receipt (viewable on screen, downloadable/printable via browser). No thermal/ESC-POS printer integration in MVP.
- **Reason:** Thermal printer adds hardware dependency and ESC/POS protocol implementation with no solid agent skill available. PDF covers the core need (proof of transaction) without hardware coupling.
- **Future:** Thermal printer (ESC/POS) is a planned fast-follow. Budget for manual implementation when the time comes.
- **Alternatives rejected:** Thermal printer in MVP (hardware dependency, no good skill, longer timeline), on-screen only without PDF (no printable artifact).
- **Reversible?:** Yes — thermal printer is additive, PDF remains as fallback.

## 2026-07-24 — Tax (PPN) and discount: configurable inputs, not hardcoded
- **Decision:** Checkout flow includes input fields for discount (per-transaction, flat % or fixed amount — per earlier Q7 decision) and tax/PPN. PPN rate is configurable via shop settings, not hardcoded. The system does NOT assume PKP/non-PKP status — the owner configures whether tax is applied and at what rate.
- **Reason:** Hadzka Shop's PKP status may change. Hardcoding 11% PPN or hardcoding "no tax" are both wrong. A configurable rate in shop settings handles both cases and future rate changes.
- **Implementation notes:** Tax rate stored in shop config (default: 0%, owner sets it). Checkout UI shows tax as a separate line only when rate > 0. Receipt reflects whatever was configured at transaction time (snapshot the rate, don't reference current config).
- **Alternatives rejected:** Hardcoded 11% PPN (breaks if non-PKP), no tax field at all (breaks if PKP), e-faktur integration (out of scope for MVP).
- **Reversible?:** Yes — config-driven approach accommodates any future tax policy change.

## 2026-07-24 — Cross-cutting principle: no hardcoded or static values
- **Decision:** All business-logic values (tax rates, discount limits, shop info, currency formatting, receipt templates, role permissions) must be dynamic and configurable — stored in database or config, never hardcoded in source code.
- **Reason:** Explicit owner requirement. A POS system for a real shop must adapt to changing business conditions without code deployments.
- **Scope:** This applies to business-logic values, not infrastructure constants (port numbers, framework defaults, etc.).
- **Reversible?:** N/A — this is an architectural principle, not a reversible decision.

## 2026-07-24 — Dynamic product management, soft-delete, and price snapshots
- **Decision:** Products must be CRUD-manageable by the Owner role via the app (no code/DB changes required). Products are soft-deleted (archived/deactivated), never hard-deleted. Transaction line items must snapshot the product name and price at the moment of sale.
- **Reason:** Ensures data integrity for reporting. If a product's price changes or it is discontinued, historical transactions and reports must remain unchanged and still be able to reference the item.
- **Implementation notes:** Product table uses `isActive` boolean for soft-delete. `TransactionItem` table denormalizes `productName`, `productSku`, and `unitPrice`.
- **Reversible?:** No — fundamental data integrity rule.

## 2026-07-24 — Tax rate manual override at checkout
- **Decision:** Tax (PPN) has a configurable default rate in Shop Settings, but cashiers can manually override/adjust the tax rate per transaction in the cart (similar to the discount field).
- **Reason:** Provides maximum flexibility for varying tax obligations (e.g. non-taxable items in a mixed cart, or changing business decisions) without requiring a strict tax-engine ruleset for MVP.
- **Reversible?:** Yes — if strict compliance enforcement is needed later, the override can be locked down via role permissions.

## 2026-07-24 — Manual shipping cost (ongkir) added to transaction
- **Decision:** Add an optional `shipping_cost` field to the checkout flow and Transaction model (default 0). Cashier enters it manually if Hadzka Shop ships via Gojek/Grab/Lalamove. Included in transaction total and till reconciliation.
- **Reason:** Real-world need to track shipping income collected by the shop. 
- **Out of Scope:** No courier API integration. No "delivery order" subsystem. No customer address fields. If COD is used (courier collects payment), the cashier simply leaves this field blank.
- **Reversible?:** Yes — can be expanded into a full fulfillment module later if needed.
