"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkoutWithDatabase } from "@/server/checkout/service";
import type { CheckoutInput } from "@/server/checkout/input";
import { qrisEnabled } from "@/server/config/features";
import {
  createMidtransClientFromEnv,
  MidtransHttpError,
} from "@/server/payments/midtrans/client";
import {
  applyMidtransStatus,
  markPaymentCreationFailed,
  markPaymentPending,
} from "@/server/payments/midtrans/transitions";

type CheckoutActionResult = {
  success: boolean;
  message: string;
  transactionId?: string;
  transactionNumber?: string;
  status?: string;
  total?: string;
  snapToken?: string;
};

export async function submitTransaction(
  input: CheckoutInput,
): Promise<CheckoutActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, message: "Sesi tidak valid. Silakan login ulang." };
  }

  if (input.paymentMethod === "QRIS" && !qrisEnabled) {
    return {
      success: false,
      message: "QRIS belum tersedia sampai konfigurasi pembayaran diverifikasi.",
    };
  }

  try {
    const result = await checkoutWithDatabase(
      prisma,
      {
        shopId: session.user.shopId,
        userId: session.user.id,
      },
      input,
    );

    let snapToken: string | undefined;
    let status = result.status;
    if (input.paymentMethod === "QRIS") {
      const stored = await prisma.transaction.findFirst({
        where: {
          id: result.transactionId,
          shopId: session.user.shopId,
          paymentMethod: "QRIS",
        },
        select: { midtransSnapToken: true, status: true },
      });
      if (!stored) throw new Error("Transaksi QRIS tidak ditemukan");

      if (!result.reused && stored.status === "CREATING_PAYMENT") {
        const client = createMidtransClientFromEnv();
        let providerFailure: unknown;
        let provider:
          | Awaited<ReturnType<typeof client.createSnapQrisToken>>
          | undefined;
        try {
          provider = await client.createSnapQrisToken({
            orderId: result.transactionId,
            grossAmount: Number(result.total),
          });
        } catch (creationError) {
          providerFailure = creationError;
          try {
            const recovered = await client.getStatus(result.transactionId);
            if (recovered.order_id !== result.transactionId) {
              throw new Error("Midtrans order ID tidak cocok");
            }
            const providerStatus = ["pending", "authorize"].includes(
              recovered.transaction_status,
            )
              ? await client.cancel(result.transactionId)
              : recovered;
            if (providerStatus.order_id !== result.transactionId) {
              throw new Error("Midtrans order ID tidak cocok");
            }
            await applyMidtransStatus(prisma, {
              orderId: providerStatus.order_id,
              transactionStatus: providerStatus.transaction_status,
              transactionId: providerStatus.transaction_id,
              grossAmount: providerStatus.gross_amount,
              fraudStatus: providerStatus.fraud_status,
            });
          } catch (recoveryError) {
            if (
              recoveryError instanceof MidtransHttpError &&
              recoveryError.httpStatus === 404
            ) {
              await markPaymentCreationFailed(prisma, result.transactionId);
            } else {
              console.error("midtrans_creation_recovery_deferred", {
                transactionId: result.transactionId,
                shopId: session.user.shopId,
                providerOrderId: result.transactionId,
                error:
                  recoveryError instanceof Error
                    ? recoveryError.message
                    : "unknown",
              });
            }
          }
        }

        if (provider) {
          try {
            const pending = await markPaymentPending(prisma, {
              transactionId: result.transactionId,
              snapToken: provider.token,
              expiresAt: new Date(Date.now() + 15 * 60_000),
            });
            snapToken = provider.token;
            status = pending.status;
          } catch (persistenceError) {
            providerFailure = persistenceError;
            try {
              const cancelled = await client.cancel(result.transactionId);
              if (cancelled.order_id !== result.transactionId) {
                throw new Error("Midtrans order ID tidak cocok");
              }
              await applyMidtransStatus(prisma, {
                orderId: cancelled.order_id,
                transactionStatus: cancelled.transaction_status,
                transactionId: cancelled.transaction_id,
                grossAmount: cancelled.gross_amount,
                fraudStatus: cancelled.fraud_status,
              });
            } catch (compensationError) {
              console.error("midtrans_creation_compensation_deferred", {
                transactionId: result.transactionId,
                shopId: session.user.shopId,
                providerOrderId: result.transactionId,
                error:
                  compensationError instanceof Error
                    ? compensationError.message
                    : "unknown",
              });
            }
          }
        }

        if (providerFailure) {
          console.error("midtrans_creation_incomplete", {
            transactionId: result.transactionId,
            shopId: session.user.shopId,
            providerOrderId: result.transactionId,
            error:
              providerFailure instanceof Error
                ? providerFailure.message
                : "unknown",
          });
          const recovered = await prisma.transaction.findUniqueOrThrow({
            where: { id: result.transactionId },
            select: { midtransSnapToken: true, status: true },
          });
          snapToken = recovered.midtransSnapToken ?? undefined;
          status = recovered.status;
        }
      } else {
        snapToken = stored.midtransSnapToken ?? undefined;
        status = stored.status;
      }
    }

    console.info("checkout_created", {
      transactionId: result.transactionId,
      shopId: session.user.shopId,
      status,
      reused: result.reused,
    });

    const success = ["COMPLETED", "CREATING_PAYMENT", "PENDING"].includes(
      status,
    );
    return {
      success,
      message:
        status === "COMPLETED"
          ? "Transaksi berhasil diselesaikan."
          : status === "PENDING"
            ? "Menunggu pembayaran QRIS."
            : status === "CREATING_PAYMENT"
              ? "Pembayaran sedang direkonsiliasi."
              : "Pembayaran gagal atau dibatalkan. Reservasi stok sudah dilepas.",
      transactionId: result.transactionId,
      transactionNumber: result.transactionNumber,
      status,
      total: result.total,
      snapToken,
    };
  } catch (error) {
    console.error("checkout_failed", {
      shopId: session.user.shopId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Transaksi gagal diproses.",
    };
  }
}
