import { z } from "zod";
import { createTRPCRouter, ownerProcedure, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import {
  adjustInventory,
  adjustInventoryInTransaction,
} from "@/server/inventory/service";
import { isProductImageUrlForShop } from "@/server/storage/product-images";

function validateImageUrl(imageUrl: string | null | undefined, shopId: string) {
  if (!imageUrl) return null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (
    !supabaseUrl ||
    !isProductImageUrlForShop(imageUrl, { supabaseUrl, shopId })
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "URL gambar produk tidak valid untuk toko ini",
    });
  }
  return imageUrl;
}

export const productsRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.product.findMany({
      where: { shopId: ctx.session.user.shopId, isActive: true },
      include: { category: true },
      orderBy: { name: "asc" },
    });
  }),

  create: ownerProcedure
    .input(z.object({
      name: z.string().min(1),
      sku: z.string().min(1),
      price: z.number().min(0),
      categoryId: z.string().optional().nullable(),
      imageUrl: z.string().url().optional().nullable(),
      initialStock: z.number().int().min(0).default(0),
      lowStockThreshold: z.number().int().min(0).default(10),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.categoryId) {
        const category = await ctx.db.category.findFirst({
          where: {
            id: input.categoryId,
            shopId: ctx.session.user.shopId,
          },
          select: { id: true },
        });
        if (!category) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Kategori tidak ditemukan untuk toko ini",
          });
        }
      }
      // Check for duplicate SKU
      const existing = await ctx.db.product.findUnique({
        where: { shopId_sku: { shopId: ctx.session.user.shopId, sku: input.sku } }
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "SKU sudah digunakan" });
      }

      // Create product and initial stock movement if > 0
      return ctx.db.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            name: input.name,
            sku: input.sku,
            price: input.price,
            stock: 0,
            categoryId: input.categoryId,
            imageUrl: validateImageUrl(input.imageUrl, ctx.session.user.shopId),
            lowStockThreshold: input.lowStockThreshold,
            shopId: ctx.session.user.shopId,
          }
        });

        if (input.initialStock > 0) {
          await adjustInventoryInTransaction(tx, {
            shopId: ctx.session.user.shopId,
            productId: product.id,
            userId: ctx.session.user.id,
            mode: "ADD",
            quantity: input.initialStock,
            reason: "Stok awal",
          });
        }

        return tx.product.findUniqueOrThrow({ where: { id: product.id } });
      });
    }),

  update: ownerProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1),
      sku: z.string().min(1),
      price: z.number().min(0),
      categoryId: z.string().optional().nullable(),
      imageUrl: z.string().url().optional().nullable(),
      lowStockThreshold: z.number().int().min(0).default(10),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.categoryId) {
        const category = await ctx.db.category.findFirst({
          where: {
            id: input.categoryId,
            shopId: ctx.session.user.shopId,
          },
          select: { id: true },
        });
        if (!category) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Kategori tidak ditemukan untuk toko ini",
          });
        }
      }
      // Check for duplicate SKU if changed
      const existing = await ctx.db.product.findUnique({
        where: { shopId_sku: { shopId: ctx.session.user.shopId, sku: input.sku } }
      });
      if (existing && existing.id !== input.id) {
        throw new TRPCError({ code: "CONFLICT", message: "SKU sudah digunakan" });
      }

      return ctx.db.product.update({
        where: { id: input.id, shopId: ctx.session.user.shopId },
        data: {
          name: input.name,
          sku: input.sku,
          price: input.price,
          categoryId: input.categoryId,
          imageUrl: validateImageUrl(input.imageUrl, ctx.session.user.shopId),
          lowStockThreshold: input.lowStockThreshold,
        },
      });
    }),

  // Soft delete
  delete: ownerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.product.update({
        where: { id: input.id, shopId: ctx.session.user.shopId },
        data: { isActive: false },
      });
    }),

  getLowStockCount: protectedProcedure.query(async ({ ctx }) => {
    const products = await ctx.db.product.findMany({
      where: { shopId: ctx.session.user.shopId, isActive: true },
      select: { stock: true, lowStockThreshold: true }
    });
    return products.filter(p => p.stock <= (p.lowStockThreshold || 0)).length;
  }),

  adjustStock: ownerProcedure
    .input(z.object({
      id: z.string(),
      type: z.enum(["ADD", "SUBTRACT", "SET"]),
      quantity: z.number().int().min(0),
      reason: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await adjustInventory(ctx.db, {
          shopId: ctx.session.user.shopId,
          productId: input.id,
          userId: ctx.session.user.id,
          mode: input.type,
          quantity: input.quantity,
          reason: input.reason,
        });
      } catch (error) {
        throw new TRPCError({
          code: error instanceof Error && error.message.includes("ditemukan")
            ? "NOT_FOUND"
            : "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Gagal mengubah stok",
        });
      }
    }),
});
