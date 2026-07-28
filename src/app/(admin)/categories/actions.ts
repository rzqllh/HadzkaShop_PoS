"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const CategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  sortOrder: z.coerce.number().int().default(0),
});

export type CategoryFormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};

async function getOwnerShopId(): Promise<string | null> {
  const session = await auth();
  if (session?.user?.role !== "OWNER") return null;
  return session.user.shopId;
}

export async function createCategory(
  prevState: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> {
  const shopId = await getOwnerShopId();
  if (!shopId) return { message: "Unauthorized", success: false };

  const result = CategorySchema.safeParse({
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder") || 0,
  });
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors, success: false };
  }

  await prisma.category.create({
    data: { shopId, ...result.data },
  });

  revalidatePath("/categories");
  return { message: "Category created.", success: true };
}

export async function updateCategory(
  id: string,
  prevState: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> {
  const shopId = await getOwnerShopId();
  if (!shopId) return { message: "Unauthorized", success: false };

  const result = CategorySchema.safeParse({
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder") || 0,
  });
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors, success: false };
  }

  await prisma.category.update({
    where: { id, shopId },
    data: result.data,
  });

  revalidatePath("/categories");
  return { message: "Category updated.", success: true };
}

export async function deleteCategory(id: string): Promise<{ success: boolean; message: string }> {
  const shopId = await getOwnerShopId();
  if (!shopId) return { success: false, message: "Unauthorized" };

  // Check if any products use this category
  const count = await prisma.product.count({ where: { categoryId: id, isActive: true } });
  if (count > 0) {
    return {
      success: false,
      message: `Cannot delete — ${count} active product(s) use this category. Reassign them first.`,
    };
  }

  await prisma.category.delete({ where: { id, shopId } });
  revalidatePath("/categories");
  return { success: true, message: "Category deleted." };
}
