import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateCheckoutItems,
  checkoutInputSchema,
} from "../src/server/checkout/input";
import {
  calculateCheckoutTotals,
  getBusinessDate,
  transactionNumberFor,
} from "../src/server/checkout/money";

const checkout = {
  clientRequestId: "1a06413d-ef15-488e-95e6-9dca4d97b0e7",
  items: [
    { productId: "08b58f0d-f0fd-44a2-b9ec-b76876de07bb", quantity: 1 },
  ],
  discount: null,
  taxRateOverride: null,
  shippingCost: "0",
  paymentMethod: "CASH" as const,
  amountPaid: "20000",
};

test("checkout accepts only intent fields and strips client-authored prices and totals", () => {
  const parsed = checkoutInputSchema.parse({
    ...checkout,
    subtotal: "1",
    total: "1",
    items: checkout.items.map((item) => ({
      ...item,
      unitPrice: "1",
      productName: "spoof",
    })),
  });

  assert.equal("subtotal" in parsed, false);
  assert.equal("total" in parsed, false);
  assert.deepEqual(parsed.items, checkout.items);
});

test("checkout rejects zero, negative, and fractional quantities", () => {
  for (const quantity of [0, -1, 1.5]) {
    assert.equal(
      checkoutInputSchema.safeParse({
        ...checkout,
        items: [{ ...checkout.items[0], quantity }],
      }).success,
      false,
    );
  }
});

test("duplicate product lines are aggregated and sorted before locking", () => {
  assert.deepEqual(
    aggregateCheckoutItems([
      { productId: "b", quantity: 2 },
      { productId: "a", quantity: 1 },
      { productId: "b", quantity: 3 },
    ]),
    [
      { productId: "a", quantity: 1 },
      { productId: "b", quantity: 5 },
    ],
  );
});

test("server totals use database prices and whole-rupiah Decimal rounding", () => {
  const totals = calculateCheckoutTotals({
    products: [
      { id: "a", price: "12000.4", quantity: 2 },
      { id: "b", price: "5000.6", quantity: 1 },
    ],
    discount: { type: "FIXED", value: "1000.5" },
    taxRate: "11",
    shippingCost: "2500.4",
    paymentMethod: "CASH",
    amountPaid: "40000",
  });

  assert.equal(totals.subtotal.toString(), "29001");
  assert.equal(totals.discountAmount.toString(), "1001");
  assert.equal(totals.taxAmount.toString(), "3080");
  assert.equal(totals.shippingCost.toString(), "2500");
  assert.equal(totals.total.toString(), "33580");
  assert.equal(totals.changeDue.toString(), "6420");
});

test("server rejects invalid discount, tax, and insufficient cash", () => {
  const base = {
    products: [{ id: "a", price: "10000", quantity: 1 }],
    shippingCost: "0",
    paymentMethod: "CASH" as const,
    amountPaid: "10000",
  };

  assert.throws(() =>
    calculateCheckoutTotals({
      ...base,
      discount: { type: "PERCENTAGE", value: "101" },
      taxRate: "0",
    }),
  );
  assert.throws(() =>
    calculateCheckoutTotals({
      ...base,
      discount: null,
      taxRate: "-1",
    }),
  );
  assert.throws(() =>
    calculateCheckoutTotals({
      ...base,
      discount: null,
      taxRate: "11",
    }),
  );
});

test("business date and receipt sequence use the configured shop timezone", () => {
  const businessDate = getBusinessDate(
    new Date("2026-07-28T18:00:00.000Z"),
    "Asia/Jakarta",
  );

  assert.equal(businessDate.toISOString(), "2026-07-29T00:00:00.000Z");
  assert.equal(transactionNumberFor(businessDate, 7), "TXN-20260729-0007");
});
