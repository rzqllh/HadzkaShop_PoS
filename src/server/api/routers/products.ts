import { z } from "zod";
import { createTRPCRouter, ownerProcedure, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

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
      initialStock: z.number().int().min(0).default(0),
      lowStockThreshold: z.number().int().min(0).default(10),
    }))
    .mutation(async ({ ctx, input }) => {
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
            stock: input.initialStock,
            categoryId: input.categoryId,
            lowStockThreshold: input.lowStockThreshold,
            shopId: ctx.session.user.shopId,
          }
        });

        if (input.initialStock > 0) {
          await tx.stockMovement.create({
            data: {
              shopId: ctx.session.user.shopId,
              productId: product.id,
              userId: ctx.session.user.id,
              type: "ADD",
              quantity: input.initialStock,
              reason: "Stok awal",
              previousStock: 0,
              newStock: input.initialStock,
            }
          });
        }

        return product;
      });
    }),

  update: ownerProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1),
      sku: z.string().min(1),
      price: z.number().min(0),
      categoryId: z.string().optional().nullable(),
      lowStockThreshold: z.number().int().min(0).default(10),
    }))
    .mutation(async ({ ctx, input }) => {
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
      return ctx.db.$transaction(async (tx) => {
        const product = await tx.product.findUnique({
          where: { id: input.id, shopId: ctx.session.user.shopId }
        });
        if (!product) throw new TRPCError({ code: "NOT_FOUND" });

        let newStock = product.stock;
        let actualQuantity = input.quantity;
        let type: "ADD" | "SUBTRACT" = "ADD";

        if (input.type === "ADD") {
          newStock += input.quantity;
          type = "ADD";
        } else if (input.type === "SUBTRACT") {
          newStock = Math.max(0, newStock - input.quantity);
          type = "SUBTRACT";
        } else if (input.type === "SET") {
          actualQuantity = Math.abs(input.quantity - product.stock);
          type = input.quantity > product.stock ? "ADD" : "SUBTRACT";
          newStock = input.quantity;
        }

        if (newStock === product.stock) return product;

        await tx.product.update({
          where: { id: product.id },
          data: { stock: newStock }
        });

        await tx.stockMovement.create({
          data: {
            shopId: ctx.session.user.shopId,
            productId: product.id,
            userId: ctx.session.user.id,
            type,
            quantity: actualQuantity,
            reason: input.reason,
            previousStock: product.stock,
            newStock,
          }
        });

        return product;
      });
    }),
});
