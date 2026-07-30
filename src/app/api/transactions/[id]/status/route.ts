import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createMidtransClientFromEnv } from "@/server/payments/midtrans/client";
import { applyMidtransStatus } from "@/server/payments/midtrans/transitions";

type RouteContext = { params: Promise<{ id: string }> };

async function scopedTransaction(id: string) {
  const session = await auth();
  if (!session?.user) return null;
  return prisma.transaction.findFirst({
    where: { id, shopId: session.user.shopId },
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      midtransOrderId: true,
      midtransSnapToken: true,
      paymentExpiresAt: true,
    },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const transaction = await scopedTransaction(id);
  if (!transaction) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    status: transaction.status,
    snapToken: transaction.midtransSnapToken,
    expiresAt: transaction.paymentExpiresAt,
  });
}

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const transaction = await scopedTransaction(id);
  if (!transaction?.midtransOrderId || transaction.paymentMethod !== "QRIS") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const providerStatus = await createMidtransClientFromEnv().getStatus(
      transaction.midtransOrderId,
    );
    if (providerStatus.order_id !== transaction.midtransOrderId) {
      throw new Error("Midtrans order ID tidak cocok");
    }
    const result = await applyMidtransStatus(prisma, {
      orderId: providerStatus.order_id,
      transactionStatus: providerStatus.transaction_status,
      transactionId: providerStatus.transaction_id,
      grossAmount: providerStatus.gross_amount,
      fraudStatus: providerStatus.fraud_status,
    });
    return NextResponse.json({ status: result.status });
  } catch (error) {
    console.error("midtrans_status_sync_failed", {
      transactionId: transaction.id,
      providerOrderId: transaction.midtransOrderId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Status sync failed" }, { status: 502 });
  }
}
