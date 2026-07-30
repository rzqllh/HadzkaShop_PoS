import { Prisma } from "@/generated/prisma/client";

type DecimalInput = string | Prisma.Decimal;

type TotalsInput = {
  products: Array<{
    id: string;
    price: DecimalInput;
    quantity: number;
  }>;
  discount: { type: "FIXED" | "PERCENTAGE"; value: string } | null;
  taxRate: DecimalInput;
  shippingCost: string;
  paymentMethod: "CASH" | "QRIS";
  amountPaid?: string;
};

const HUNDRED = new Prisma.Decimal(100);
const ZERO = new Prisma.Decimal(0);

function decimal(value: DecimalInput, label: string) {
  let parsed: Prisma.Decimal;
  try {
    parsed = new Prisma.Decimal(value);
  } catch {
    throw new Error(`${label} tidak valid`);
  }

  if (!parsed.isFinite() || parsed.isNegative()) {
    throw new Error(`${label} harus berupa angka non-negatif`);
  }
  return parsed;
}

export function roundIdr(value: DecimalInput) {
  return decimal(value, "Nominal").toDecimalPlaces(
    0,
    Prisma.Decimal.ROUND_HALF_UP,
  );
}

export function calculateCheckoutTotals(input: TotalsInput) {
  const subtotal = input.products.reduce((sum, product) => {
    if (!Number.isSafeInteger(product.quantity) || product.quantity <= 0) {
      throw new Error("Jumlah produk harus berupa bilangan bulat positif");
    }
    return sum.plus(roundIdr(product.price).times(product.quantity));
  }, ZERO);

  let discountAmount = ZERO;
  if (input.discount) {
    const discountValue = decimal(input.discount.value, "Diskon");
    if (input.discount.type === "PERCENTAGE") {
      if (discountValue.greaterThan(HUNDRED)) {
        throw new Error("Diskon persentase tidak boleh lebih dari 100");
      }
      discountAmount = subtotal
        .times(discountValue)
        .dividedBy(HUNDRED)
        .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
    } else {
      discountAmount = roundIdr(discountValue);
      if (discountAmount.greaterThan(subtotal)) {
        throw new Error("Diskon tetap tidak boleh melebihi subtotal");
      }
    }
  }

  const taxRate = decimal(input.taxRate, "Pajak");
  if (taxRate.greaterThan(HUNDRED)) {
    throw new Error("Pajak tidak boleh lebih dari 100");
  }

  const taxableAmount = subtotal.minus(discountAmount);
  const taxAmount = taxableAmount
    .times(taxRate)
    .dividedBy(HUNDRED)
    .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
  const shippingCost = roundIdr(input.shippingCost);
  const total = taxableAmount.plus(taxAmount).plus(shippingCost);

  const amountPaid =
    input.paymentMethod === "CASH"
      ? roundIdr(input.amountPaid ?? "")
      : ZERO;
  if (input.paymentMethod === "CASH" && amountPaid.lessThan(total)) {
    throw new Error("Uang diterima kurang dari total transaksi");
  }

  return {
    subtotal,
    discountAmount,
    taxRate,
    taxAmount,
    shippingCost,
    total,
    amountPaid,
    changeDue:
      input.paymentMethod === "CASH" ? amountPaid.minus(total) : ZERO,
  };
}

export function getBusinessDate(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return new Date(
    Date.UTC(Number(value.year), Number(value.month) - 1, Number(value.day)),
  );
}

export function transactionNumberFor(businessDate: Date, sequence: number) {
  if (!Number.isSafeInteger(sequence) || sequence <= 0) {
    throw new Error("Nomor urut transaksi tidak valid");
  }

  const date = businessDate.toISOString().slice(0, 10).replaceAll("-", "");
  return `TXN-${date}-${String(sequence).padStart(4, "0")}`;
}
