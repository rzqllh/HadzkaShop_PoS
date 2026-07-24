# PRD — Hadzka Shop Point of Sale

> Product Requirements Document. This is the single source of truth for what the MVP includes and excludes. Every agent reads this before proposing features.

## Product

**Name:** Hadzka Shop POS
**Type:** Point of Sale system for a single Indonesian retail shop.
**Owner:** Hafizh Rizqullah (Hadzka Shop).

## Problem

Hadzka Shop needs a digital system to replace manual sales tracking. The current process lacks:
- Accurate real-time stock visibility.
- Reliable end-of-day cash reconciliation.
- Sales reporting for business decisions.
- Support for QRIS digital payments alongside cash.

## Users

| Role | Description | Access Level |
|------|-------------|-------------|
| **Owner** | Shop owner. Manages products, prices, users, settings, views all reports. | Full access |
| **Cashier** | Operates the register during shifts. Processes sales, applies discounts, closes the till. | Transactions only — cannot edit prices, products, or view full reports |

## MVP Success Metric

> MVP is done when a cashier can run **one full real business day** at Hadzka Shop end-to-end on this system — every sale (cash + Midtrans QRIS) processed without a manual workaround, stock decrements match reality, and the end-of-day cash reconciliation matches what's actually in the drawer.

## Core Features (MVP)

### 1. Product & Price Management
- CRUD products: name, SKU/barcode, price, stock quantity, category, image.
- Image Upload: Support for local image storage (`public/uploads`) for product photos. Constraints: 2MB limit, JPG/PNG/WebP formats only. (MVP scope).
- All prices and product data are dynamic — stored in database, never hardcoded.
- Category management for organizing products.
- Search/filter products by name, SKU, or category.

### 2. Sales Transactions
- Add products to cart (search, barcode scan via camera in future, or browse by category).
- Adjust item quantity in cart.
- Apply per-transaction discount: flat percentage OR fixed amount (configurable at checkout).
- Tax/PPN line: rate is configurable in shop settings (default 0%), with manual override/adjustment available per transaction in the cart. Shown as a separate line when rate > 0.
- Optional shipping cost (ongkir): manual entry per transaction for delivery orders, included in total and till reconciliation.
- **Payment methods:**
  - **Cash:** Enter amount tendered, calculate and display change.
  - **Midtrans QRIS:** Generate QR code, await payment confirmation via webhook.
- Cancel/void a transaction **before** payment is finalized.
- Generate PDF receipt on completion (viewable, downloadable, printable via browser).

### 3. Automatic Stock Updates
- Stock quantity decrements automatically on completed sale.
- Low-stock alert threshold (configurable per product).
- Stock adjustment (manual add/subtract with reason logging — for receiving shipments, damage, etc.).

### 4. Sales Reports
- **Daily summary:** total transactions, total revenue, breakdown by payment method, items sold.
- **Monthly summary:** same metrics aggregated.
- Date-range filtering.
- Owner-only access.

### 5. User & Cashier Management
- Owner creates/edits/deactivates cashier accounts.
- Simple auth: email/username + password.
- Role-based access control: Owner vs Cashier (two roles, no more for MVP).
- Session tracking: which cashier processed which transaction.

### 6. End-of-Day Till Closing
- Cashier initiates "close till" flow.
- System calculates expected cash (starting cash + cash sales - cash refunds).
- Cashier inputs actual counted cash.
- System logs the difference (over/short) with timestamp and cashier ID.
- Closing report viewable by Owner.

### 7. Shop Settings (Owner only)
- Shop name, address, contact info (appears on receipts).
- Tax/PPN rate (percentage, default 0%).
- Currency format.
- Low-stock alert thresholds (global default + per-product override).
- Receipt template content (header/footer text).

## Cross-Cutting Requirements

- **No hardcoded business values.** Tax rates, discount limits, shop info, currency formatting, receipt content, role permissions — all dynamic, stored in database or config.
- **Clean data layer.** Use `shopId` foreign keys on relevant tables. No global singletons for "the shop." Future multi-tenant extraction should be a migration, not a rewrite.
- **Client-side retry buffer.** Short-lived write buffer for in-flight transactions to survive brief connectivity blips. Does NOT change source-of-truth (server stays authoritative).

## Out of Scope (Explicitly Deferred)

These items are **not** in MVP. Each was considered and deliberately excluded during Phase 1 discovery. Do not build any of these without a new decision in `decisions.md`:

| Feature | Reason Deferred |
|---------|----------------|
| **Offline mode / local-first** | Internet is stable. Offline-first is a 3-5x data layer complexity multiplier. See decisions.md. |
| **Multi-tenant** | No confirmed demand from other businesses. See decisions.md. |
| **Multi-outlet** | Hadzka Shop is one location. See decisions.md. |
| **Post-payment refunds** | Requires Midtrans refund API, partial refund logic, inventory reversal. Manual process for now. |
| **Per-item discounts / promo rules** | Requires a rules engine. Flat per-transaction discount covers MVP needs. |
| **Xendit / additional payment providers** | One gateway shipped well > two shipped half. |
| **Thermal / ESC-POS printer** | Hardware dependency, no solid skill available. PDF receipt covers the need. Fast-follow. |
| **Barcode scanner hardware integration** | Deferred. Camera-based scan can be a fast-follow. Manual search/browse covers MVP. |
| **Analytics dashboard (advanced)** | Daily/monthly reports cover MVP. Advanced analytics is post-MVP. |
| **Courier / Delivery API integration** | Shipping cost is a manual manual input only. No Gojek/Grab API, no delivery order subsystem. |
| **Multi-device sync** | Single outlet, likely single device. Not needed for MVP. |
| **e-Faktur / DJP integration** | Tax rate is configurable but no government system integration in MVP. |
| **Inventory purchase orders** | Manual stock adjustment covers receiving shipments for now. |
| **Customer database / loyalty** | Not needed for MVP. Cash + QRIS transactions don't require customer records. |
