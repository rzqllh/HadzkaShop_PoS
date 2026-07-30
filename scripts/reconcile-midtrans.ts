import { prisma } from "../src/lib/prisma";
import {
  createMidtransClientFromEnv,
  MidtransHttpError,
} from "../src/server/payments/midtrans/client";
import {
  applyMidtransStatus,
  markPaymentCreationFailed,
} from "../src/server/payments/midtrans/transitions";

const STALE_CREATION_MS = 15 * 60_000;

async function applyProviderStatus(
  transaction: { id: string; midtransOrderId: string },
  provider: Awaited<
    ReturnType<ReturnType<typeof createMidtransClientFromEnv>["getStatus"]>
  >,
) {
  if (provider.order_id !== transaction.midtransOrderId) {
    throw new Error("Midtrans order ID tidak cocok");
  }
  return applyMidtransStatus(prisma, {
    orderId: provider.order_id,
    transactionStatus: provider.transaction_status,
    transactionId: provider.transaction_id,
    grossAmount: provider.gross_amount,
    fraudStatus: provider.fraud_status,
  });
}

async function main() {
  const client = createMidtransClientFromEnv();
  const now = new Date();
  const transactions = await prisma.transaction.findMany({
    where: {
      paymentMethod: "QRIS",
      status: { in: ["CREATING_PAYMENT", "PENDING"] },
      midtransOrderId: { not: null },
    },
    select: {
      id: true,
      shopId: true,
      status: true,
      midtransOrderId: true,
      paymentExpiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  let reconciled = 0;
  let failed = 0;
  for (const transaction of transactions) {
    const providerOrderId = transaction.midtransOrderId;
    if (!providerOrderId) continue;

    try {
      const provider = await client.getStatus(providerOrderId);
      const providerStillPending = ["pending", "authorize"].includes(
        provider.transaction_status,
      );
      const lostCreation =
        transaction.status === "CREATING_PAYMENT" && providerStillPending;
      const locallyExpired =
        transaction.status === "PENDING" &&
        providerStillPending &&
        transaction.paymentExpiresAt !== null &&
        transaction.paymentExpiresAt <= now;

      if (lostCreation || locallyExpired) {
        const cancelled = await client.cancel(providerOrderId);
        await applyProviderStatus(
          { id: transaction.id, midtransOrderId: providerOrderId },
          cancelled,
        );
      } else {
        await applyProviderStatus(
          { id: transaction.id, midtransOrderId: providerOrderId },
          provider,
        );
      }
      reconciled += 1;
      console.info("midtrans_reconciled", {
        transactionId: transaction.id,
        shopId: transaction.shopId,
        providerOrderId,
      });
    } catch (error) {
      const staleCreation =
        transaction.status === "CREATING_PAYMENT" &&
        transaction.createdAt.getTime() <= now.getTime() - STALE_CREATION_MS;
      if (
        staleCreation &&
        error instanceof MidtransHttpError &&
        error.httpStatus === 404
      ) {
        await markPaymentCreationFailed(prisma, transaction.id);
        reconciled += 1;
        console.info("midtrans_creation_released", {
          transactionId: transaction.id,
          shopId: transaction.shopId,
          providerOrderId,
        });
        continue;
      }

      failed += 1;
      console.error("midtrans_reconciliation_failed", {
        transactionId: transaction.id,
        shopId: transaction.shopId,
        providerOrderId,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  console.info("midtrans_reconciliation_complete", {
    scanned: transactions.length,
    reconciled,
    failed,
  });
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(
      "midtrans_reconciliation_aborted",
      error instanceof Error ? error.message : "unknown",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
