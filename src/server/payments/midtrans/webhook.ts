import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import {
  midtransStatusSchema,
  verifyNotificationSignature,
  type MidtransStatus,
} from "@/server/payments/midtrans/client";
import {
  isTerminalTransactionStatus,
  providerTransactionStatus,
} from "@/server/payments/midtrans/status";
import { applyMidtransStatus } from "@/server/payments/midtrans/transitions";

type StatusClient = {
  getStatus(orderId: string): Promise<MidtransStatus>;
};

export async function processMidtransNotification(
  db: PrismaClient,
  client: StatusClient,
  serverKey: string,
  rawBody: string,
) {
  const notification = midtransStatusSchema
    .extend({ signature_key: midtransStatusSchema.shape.signature_key.unwrap() })
    .parse(JSON.parse(rawBody));
  if (
    !verifyNotificationSignature(
      {
        orderId: notification.order_id,
        statusCode: notification.status_code,
        grossAmount: notification.gross_amount,
        signature: notification.signature_key,
      },
      serverKey,
    )
  ) {
    throw new Error("Signature Midtrans tidak valid");
  }

  const transaction = await db.transaction.findUnique({
    where: { midtransOrderId: notification.order_id },
    select: { id: true, shopId: true, status: true, total: true },
  });
  if (!transaction) throw new Error("Order Midtrans tidak ditemukan");

  const providerState = providerTransactionStatus(
    notification.transaction_status,
    notification.fraud_status,
  );
  const amountMismatch = !new Prisma.Decimal(
    notification.gross_amount,
  ).equals(transaction.total);
  const outOfOrder =
    !providerState ||
    (isTerminalTransactionStatus(transaction.status) &&
      providerState !== transaction.status);
  const status = amountMismatch || outOfOrder
    ? await client.getStatus(notification.order_id)
    : notification;

  if (
    status.order_id !== notification.order_id ||
    !new Prisma.Decimal(status.gross_amount).equals(transaction.total)
  ) {
    throw new Error("Status Midtrans tidak cocok dengan order lokal");
  }

  const transition = await applyMidtransStatus(db, {
    orderId: status.order_id,
    transactionStatus: status.transaction_status,
    transactionId: status.transaction_id,
    grossAmount: status.gross_amount,
    fraudStatus: status.fraud_status,
  });
  return {
    ...transition,
    transactionId: transaction.id,
    shopId: transaction.shopId,
    providerOrderId: notification.order_id,
  };
}
