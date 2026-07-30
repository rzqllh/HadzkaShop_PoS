import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSnapQrisRequest,
  createMidtransClient,
  notificationSignature,
  verifyNotificationSignature,
} from "../src/server/payments/midtrans/client";
import { nextTransactionStatus } from "../src/server/payments/midtrans/status";

test("Snap request uses integer IDR, QRIS-only channel, and aligned 15-minute expiry", () => {
  assert.deepEqual(
    buildSnapQrisRequest({
      orderId: "8cbb2bfd-e053-49fa-87f2-a730c3ef7565",
      grossAmount: 33_580,
      finishUrl: "https://merchant.example/pos",
    }),
    {
      transaction_details: {
        order_id: "8cbb2bfd-e053-49fa-87f2-a730c3ef7565",
        gross_amount: 33_580,
      },
      enabled_payments: ["other_qris"],
      callbacks: { finish: "https://merchant.example/pos" },
      expiry: { duration: 15, unit: "minutes" },
      page_expiry: { duration: 15, unit: "minutes" },
    },
  );
  assert.throws(() =>
    buildSnapQrisRequest({
      orderId: "order",
      grossAmount: 10_000.5,
      finishUrl: null,
    }),
  );
});

test("notification signature uses the raw gross_amount string", () => {
  const fields = {
    orderId: "order-1",
    statusCode: "200",
    grossAmount: "10000.00",
  };
  const signature = notificationSignature(fields, "server-key");

  assert.equal(
    verifyNotificationSignature({ ...fields, signature }, "server-key"),
    true,
  );
  assert.equal(
    verifyNotificationSignature(
      { ...fields, grossAmount: "10000", signature },
      "server-key",
    ),
    false,
  );
});

test("Midtrans client sends Basic Auth and expected Snap payload", async () => {
  let captured: Request | undefined;
  const client = createMidtransClient(
    { environment: "sandbox", serverKey: "secret", finishUrl: null },
    async (input, init) => {
      captured = new Request(input, init);
      return Response.json({ token: "snap-token", redirect_url: "https://snap.example" });
    },
  );

  await client.createSnapQrisToken({
    orderId: "order-2",
    grossAmount: 10_000,
  });

  assert.equal(
    captured?.url,
    "https://app.sandbox.midtrans.com/snap/v1/transactions",
  );
  assert.equal(captured?.headers.get("authorization"), "Basic c2VjcmV0Og==");
  assert.equal(
    (await captured?.clone().json()).enabled_payments[0],
    "other_qris",
  );
});

test("payment status mapping is monotonic and ignores late pending", () => {
  assert.equal(nextTransactionStatus("CREATING_PAYMENT", "pending"), "PENDING");
  assert.equal(nextTransactionStatus("PENDING", "settlement"), "COMPLETED");
  assert.equal(nextTransactionStatus("PENDING", "expire"), "EXPIRED");
  assert.equal(nextTransactionStatus("COMPLETED", "pending"), "COMPLETED");
  assert.equal(nextTransactionStatus("EXPIRED", "pending"), "EXPIRED");
});
