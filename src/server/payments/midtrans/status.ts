import type {
  TransactionStatus,
} from "@/generated/prisma/client";

const TERMINAL_STATUSES = new Set<TransactionStatus>([
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "EXPIRED",
]);

export function providerTransactionStatus(
  status: string,
  fraudStatus?: string | null,
): TransactionStatus | null {
  switch (status) {
    case "settlement":
      return "COMPLETED";
    case "capture":
      return fraudStatus === "accept" ? "COMPLETED" : "PENDING";
    case "pending":
    case "authorize":
      return "PENDING";
    case "expire":
      return "EXPIRED";
    case "cancel":
      return "CANCELLED";
    case "deny":
    case "failure":
      return "FAILED";
    default:
      return null;
  }
}

export function nextTransactionStatus(
  current: TransactionStatus,
  providerStatus: string,
  fraudStatus?: string | null,
) {
  const candidate = providerTransactionStatus(providerStatus, fraudStatus);
  if (!candidate) return current;
  if (current === "COMPLETED") return current;
  if (TERMINAL_STATUSES.has(current)) return current;
  return candidate;
}

export function isTerminalTransactionStatus(status: TransactionStatus) {
  return TERMINAL_STATUSES.has(status);
}
