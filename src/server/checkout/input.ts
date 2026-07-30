import { z } from "zod";

const decimalIntent = z
  .string()
  .trim()
  .regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/, "Nilai harus berupa angka non-negatif");

const checkoutItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export const checkoutInputSchema = z
  .object({
    clientRequestId: z.string().uuid(),
    items: z.array(checkoutItemSchema).min(1).max(100),
    discount: z
      .object({
        type: z.enum(["FIXED", "PERCENTAGE"]),
        value: decimalIntent,
      })
      .nullable(),
    taxRateOverride: decimalIntent.nullable(),
    shippingCost: decimalIntent,
    paymentMethod: z.enum(["CASH", "QRIS"]),
    amountPaid: decimalIntent.optional(),
    note: z.string().trim().max(1_000).optional(),
    customerId: z.string().uuid().optional(),
  })
  .superRefine((input, context) => {
    if (input.paymentMethod === "CASH" && input.amountPaid === undefined) {
      context.addIssue({
        code: "custom",
        path: ["amountPaid"],
        message: "Uang diterima wajib diisi untuk pembayaran tunai",
      });
    }
  });

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;
export type CheckoutItem = CheckoutInput["items"][number];

export function aggregateCheckoutItems(items: CheckoutItem[]) {
  const quantities = new Map<string, number>();

  for (const item of items) {
    const quantity = (quantities.get(item.productId) ?? 0) + item.quantity;
    if (!Number.isSafeInteger(quantity) || quantity > 2_147_483_647) {
      throw new Error("Jumlah produk melampaui batas yang didukung");
    }
    quantities.set(item.productId, quantity);
  }

  return [...quantities]
    .map(([productId, quantity]) => ({ productId, quantity }))
    .sort((left, right) => left.productId.localeCompare(right.productId));
}
