# Testing — Acceptance Criteria

> Check every feature against these criteria before marking it complete. If a criterion can't be verified, log why in the PR/commit.

## Transaction Flow (Core)

- [ ] Cashier can search for a product by name or SKU and add it to the cart.
- [ ] Cart displays product name, unit price, quantity, and line total.
- [ ] Cashier can adjust quantity (increase, decrease, remove) from the cart.
- [ ] Subtotal updates correctly in real-time as cart changes.
- [ ] Per-transaction discount (flat % or fixed amount) can be applied and is reflected in the total.
- [ ] Tax/PPN is calculated based on the shop-configured rate and shown as a separate line.
- [ ] Tax line is hidden when rate is 0%.
- [ ] Total = subtotal - discount + tax. Verify arithmetic.

## Cash Payment

- [ ] Cashier selects "Cash" payment method.
- [ ] System requires cash tendered input.
- [ ] System calculates and displays change due.
- [ ] System rejects payment if cash tendered < total.
- [ ] Transaction is marked COMPLETED immediately on cash payment.
- [ ] Stock is decremented atomically with transaction creation.
- [ ] PDF receipt is generated and viewable.

## QRIS Payment (Midtrans)

- [ ] Cashier selects "QRIS" payment method.
- [ ] Snap popup opens with correct total amount.
- [ ] Transaction stays PENDING until Midtrans webhook confirms.
- [ ] Webhook handler verifies signature before mutating state.
- [ ] Duplicate webhook notifications are handled idempotently.
- [ ] Late `pending`/`cancelled` notifications don't overwrite `settlement`.
- [ ] Stock is decremented only on confirmed payment, not on pending.
- [ ] PDF receipt is generated after successful payment.
- [ ] PENDING QRIS transaction auto-transitions to EXPIRED after 15 minutes with no settlement webhook.
- [ ] EXPIRED transactions do not decrement stock.
- [ ] EXPIRED and CANCELLED are tracked as distinct statuses in reports (do not merge into one bucket).

## Transaction Cancel/Void

- [ ] Cashier can cancel a transaction before payment is finalized.
- [ ] Cancelled transaction does NOT decrement stock.
- [ ] PENDING QRIS transactions can be cancelled (no stock impact since stock isn't decremented until confirmation).

## Product Management (Owner)

- [ ] Owner can create a product with name, SKU, price, stock, category.
- [ ] Owner can edit product details.
- [ ] Owner can deactivate a product (soft delete — hidden from POS, preserved in history).
- [ ] Cashier cannot access product management pages.
- [ ] Product price changes do NOT affect historical transaction records (prices are snapshotted).

## Stock Management

- [ ] Stock decrements automatically on completed sale.
- [ ] Low-stock alert fires when stock falls below threshold.
- [ ] Owner/cashier can manually adjust stock with a reason (receive shipment, damage, etc.).
- [ ] Stock adjustment is logged with before/after values, user, and timestamp.
- [ ] A completed sale writes a StockMovement row (type SALE, referenceId = transactionId) in the same DB transaction as the stock decrement.
- [ ] Manual adjustments (ADD/SUBTRACT) and sale-driven movements (SALE) are both queryable from one StockMovement table per product.

## Reports (Owner)

- [ ] Daily summary shows: total transactions, total revenue, breakdown by payment method.
- [ ] Monthly summary shows same metrics aggregated.
- [ ] Date-range filtering works correctly.
- [ ] Cashier cannot access reports pages.

## Till Closing

- [ ] Cashier can open a till session with starting cash amount.
- [ ] Cashier can close the till by entering actual counted cash.
- [ ] System calculates expected cash (starting + cash sales) and shows difference.
- [ ] Difference (over/short) is logged with timestamp and cashier ID.
- [ ] Owner can view till closing history.

## User Management (Owner)

- [ ] Owner can create a cashier account.
- [ ] Owner can deactivate a cashier account.
- [ ] Deactivated cashier cannot log in.
- [ ] Cashier cannot access user management, product management, or reports.

## Shop Settings (Owner)

- [ ] Owner can update shop name, address, contact info.
- [ ] Owner can set tax/PPN rate (reflected on next transaction, not retroactively).
- [ ] Owner can set low-stock threshold (global default).
- [ ] Owner can set receipt header/footer text.
- [ ] Cashier cannot access settings.

## Cross-cutting

- [ ] All business values (tax rate, shop info, etc.) are loaded from database — never hardcoded.
- [ ] Every business entity has `shopId` FK — no global singletons.
- [ ] Dark mode works correctly on all pages.
- [ ] POS screen is usable on tablet viewport (768px).
- [ ] All interactive elements have min 44×44px touch targets.
- [ ] Focus states visible for keyboard navigation.
- [ ] `prefers-reduced-motion` respected.
- [ ] No `console.log` in production code.
- [ ] TypeScript strict mode — no `any` without documented reason.
- [ ] `pnpm lint && pnpm typecheck && pnpm build` pass.
- [ ] All UI copy is in Bahasa Indonesia (labels, buttons, headers, error messages, toasts, empty states).
- [ ] Primary action buttons (payment, cart, checkout, void, cancel) show icon + text label together, not icon alone.
