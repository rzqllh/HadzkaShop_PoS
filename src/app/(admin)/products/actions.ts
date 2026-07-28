"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be ≥ 0"),
  costPrice: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().int().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).optional(),
  categoryId: z.string().optional(),
  imageUrl: z.string().optional().or(z.literal("")),
});

export type ProductFormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};

async function getOwnerShopId(): Promise<string | null> {
  const session = await auth();
  if (session?.user?.role !== "OWNER") return null;
  return session.user.shopId;
}

export async function createProduct(
  prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const shopId = await getOwnerShopId();
  if (!shopId) return { message: "Unauthorized", success: false };

  const raw = {
    name: formData.get("name"),
    sku: formData.get("sku"),
    barcode: formData.get("barcode") || undefined,
    price: formData.get("price"),
    costPrice: formData.get("costPrice") || undefined,
    stock: formData.get("stock") || 0,
    lowStockThreshold: formData.get("lowStockThreshold") || undefined,
    categoryId: formData.get("categoryId") || undefined,
    imageUrl: formData.get("imageUrl") || undefined,
  };

  const result = ProductSchema.safeParse(raw);
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors, success: false };
  }

  // Check SKU uniqueness within shop
  const existing = await prisma.product.findUnique({
    where: { shopId_sku: { shopId, sku: result.data.sku } },
  });
  if (existing) {
    return { errors: { sku: ["SKU already exists in this shop."] }, success: false };
  }

  await prisma.product.create({
    data: {
      shopId,
      ...result.data,
      categoryId: result.data.categoryId || null,
      imageUrl: result.data.imageUrl || null,
      costPrice: result.data.costPrice ?? null,
      lowStockThreshold: result.data.lowStockThreshold ?? null,
      barcode: result.data.barcode || null,
    },
  });

  revalidatePath("/products");
  return { message: "Product created.", success: true };
}

export async function updateProduct(
  id: string,
  prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const shopId = await getOwnerShopId();
  if (!shopId) return { message: "Unauthorized", success: false };

  const raw = {
    name: formData.get("name"),
    sku: formData.get("sku"),
    barcode: formData.get("barcode") || undefined,
    price: formData.get("price"),
    costPrice: formData.get("costPrice") || undefined,
    stock: formData.get("stock") || 0,
    lowStockThreshold: formData.get("lowStockThreshold") || undefined,
    categoryId: formData.get("categoryId") || undefined,
    imageUrl: formData.get("imageUrl") || undefined,
  };

  const result = ProductSchema.safeParse(raw);
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors, success: false };
  }

  // Check SKU uniqueness (excluding current product)
  const existing = await prisma.product.findFirst({
    where: {
      shopId,
      sku: result.data.sku,
      NOT: { id },
    },
  });
  if (existing) {
    return { errors: { sku: ["SKU already used by another product."] }, success: false };
  }

  await prisma.product.update({
    where: { id, shopId },
    data: {
      ...result.data,
      categoryId: result.data.categoryId || null,
      imageUrl: result.data.imageUrl || null,
      costPrice: result.data.costPrice ?? null,
      lowStockThreshold: result.data.lowStockThreshold ?? null,
      barcode: result.data.barcode || null,
    },
  });

  revalidatePath("/products");
  return { message: "Product updated.", success: true };
}

export async function archiveProduct(id: string): Promise<{ success: boolean; message: string }> {
  const shopId = await getOwnerShopId();
  if (!shopId) return { success: false, message: "Unauthorized" };

  await prisma.product.update({
    where: { id, shopId },
    data: { isActive: false },
  });

  revalidatePath("/products");
  return { success: true, message: "Product archived." };
}

export async function restoreProduct(id: string): Promise<{ success: boolean; message: string }> {
  const shopId = await getOwnerShopId();
  if (!shopId) return { success: false, message: "Unauthorized" };

  await prisma.product.update({
    where: { id, shopId },
    data: { isActive: true },
  });

  revalidatePath("/products");
  return { success: true, message: "Product restored." };
}
