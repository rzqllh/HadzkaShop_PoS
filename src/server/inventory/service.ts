import {
  Prisma,
  type PrismaClient,
  type StockMovementType,
} from "@/generated/prisma/client";

export type LockedProduct = {
  id: string;
  name: string;
  price: string;
  costPrice: string | null;
  stock: number;
  reservedStock: number;
  isActive: boolean;
};

export async function lockInventoryProducts(
  tx: Prisma.TransactionClient,
  shopId: string,
  productIds: string[],
) {
  if (productIds.length === 0) return [];

  return tx.$queryRaw<LockedProduct[]>(Prisma.sql`
    SELECT
      "id",
      "name",
      "price"::text AS "price",
      "costPrice"::text AS "costPrice",
      "stock",
      "reservedStock",
      "isActive"
    FROM "Product"
    WHERE "shopId" = ${shopId}
      AND "id" IN (${Prisma.join(productIds)})
    ORDER BY "id"
    FOR UPDATE
  `);
}

type CheckoutInventoryItem = {
  product: LockedProduct;
  quantity: number;
};

export async function applyCashSaleInventory(
  tx: Prisma.TransactionClient,
  input: {
    shopId: string;
    userId: string;
    transactionId: string;
    transactionNumber: string;
    items: CheckoutInventoryItem[];
  },
) {
  for (const { product, quantity } of input.items) {
    const availableStock = product.stock - product.reservedStock;
    if (availableStock < quantity) {
      throw new Error(
        `Stok "${product.name}" tidak cukup. Tersedia: ${availableStock}`,
      );
    }

    const newStock = product.stock - quantity;
    await tx.product.update({
      where: { id: product.id },
      data: { stock: newStock },
    });
    await tx.stockMovement.create({
      data: {
        shopId: input.shopId,
        productId: product.id,
        userId: input.userId,
        type: "SALE",
        quantity,
        reason: `Sale #${input.transactionNumber}`,
        referenceId: input.transactionId,
        previousStock: product.stock,
        newStock,
      },
    });
  }
}

export async function reserveCheckoutInventory(
  tx: Prisma.TransactionClient,
  items: CheckoutInventoryItem[],
) {
  for (const { product, quantity } of items) {
    const availableStock = product.stock - product.reservedStock;
    if (availableStock < quantity) {
      throw new Error(
        `Stok "${product.name}" tidak cukup. Tersedia: ${availableStock}`,
      );
    }

    await tx.product.update({
      where: { id: product.id },
      data: { reservedStock: product.reservedStock + quantity },
    });
  }
}

export type AdjustmentInput = {
  shopId: string;
  productId: string;
  userId: string;
  mode: "ADD" | "SUBTRACT" | "SET";
  quantity: number;
  reason: string;
};

export async function adjustInventoryInTransaction(
  tx: Prisma.TransactionClient,
  input: AdjustmentInput,
) {
  if (!Number.isSafeInteger(input.quantity) || input.quantity < 0) {
    throw new Error("Jumlah stok harus berupa bilangan bulat non-negatif");
  }
  if (!input.reason.trim()) {
    throw new Error("Alasan perubahan stok wajib diisi");
  }

  const [product] = await lockInventoryProducts(tx, input.shopId, [
    input.productId,
  ]);
  if (!product) throw new Error("Produk tidak ditemukan");

  let newStock: number;
  let movementType: StockMovementType;

  if (input.mode === "ADD") {
    if (input.quantity === 0) return product;
    newStock = product.stock + input.quantity;
    movementType = "ADD";
  } else if (input.mode === "SUBTRACT") {
    if (input.quantity === 0) return product;
    if (input.quantity > product.stock - product.reservedStock) {
      throw new Error("Stok yang sedang direservasi tidak dapat dikurangi");
    }
    newStock = product.stock - input.quantity;
    movementType = "SUBTRACT";
  } else {
    if (input.quantity < product.reservedStock) {
      throw new Error("Stok baru tidak boleh lebih kecil dari stok terreservasi");
    }
    if (input.quantity === product.stock) return product;
    newStock = input.quantity;
    movementType = newStock > product.stock ? "ADD" : "SUBTRACT";
  }

  const updated = await tx.product.update({
    where: { id: product.id },
    data: { stock: newStock },
  });
  await tx.stockMovement.create({
    data: {
      shopId: input.shopId,
      productId: product.id,
      userId: input.userId,
      type: movementType,
      quantity: Math.abs(newStock - product.stock),
      reason: input.reason.trim(),
      previousStock: product.stock,
      newStock,
    },
  });

  return updated;
}

export async function adjustInventory(
  db: PrismaClient,
  input: AdjustmentInput,
) {
  return db.$transaction(async (tx) => {
    return adjustInventoryInTransaction(tx, input);
  });
}
