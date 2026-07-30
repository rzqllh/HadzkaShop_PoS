import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  createMidtransClientFromEnv,
  midtransServerKey,
} from "@/server/payments/midtrans/client";
import { processMidtransNotification } from "@/server/payments/midtrans/webhook";

export async function POST(request: Request) {
  const rawBody = await request.text();
  try {
    const result = await processMidtransNotification(
      prisma,
      createMidtransClientFromEnv(),
      midtransServerKey(),
      rawBody,
    );
    console.info("midtrans_webhook_processed", {
      transactionId: result.transactionId,
      shopId: result.shopId,
      providerOrderId: result.providerOrderId,
      status: result.status,
      changed: result.changed,
      conflict: result.conflict,
    });
    return NextResponse.json({ accepted: true });
  } catch (error) {
    console.error("midtrans_webhook_rejected", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Notification rejected" },
      { status: 400 },
    );
  }
}
