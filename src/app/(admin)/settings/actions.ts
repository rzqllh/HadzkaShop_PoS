"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const SettingsSchema = z.object({
  name: z.string().min(1, "Shop name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  taxRate: z.coerce.number().min(0).max(100),
  currency: z.string().min(1),
  lowStockThreshold: z.coerce.number().int().min(0),
  receiptHeader: z.string().optional(),
  receiptFooter: z.string().optional(),
});

export type SettingsFormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};

export async function updateSettings(
  prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const session = await auth();
  if (session?.user?.role !== "OWNER") {
    return { message: "Unauthorized", success: false };
  }

  const raw = {
    name: formData.get("name"),
    address: formData.get("address"),
    phone: formData.get("phone"),
    taxRate: formData.get("taxRate"),
    currency: formData.get("currency"),
    lowStockThreshold: formData.get("lowStockThreshold"),
    receiptHeader: formData.get("receiptHeader"),
    receiptFooter: formData.get("receiptFooter"),
  };

  const result = SettingsSchema.safeParse(raw);
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors, success: false };
  }

  await prisma.shop.update({
    where: { id: session.user.shopId },
    data: {
      ...result.data,
      taxRate: result.data.taxRate,
    },
  });

  revalidatePath("/settings");
  return { message: "Settings saved.", success: true };
}
