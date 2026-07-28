import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

import { StockMovementType } from "@/generated/prisma/client";

export const stockMovementsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(25),
        type: z.nativeEnum(StockMovementType).optional(),
        productId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only owners can view stock movements." });
      }

      const where = {
        shopId: ctx.session.user.shopId,
        ...(input.type && { type: input.type }),
        ...(input.productId && { productId: input.productId }),
      };

      const [items, total] = await Promise.all([
        ctx.db.stockMovement.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: {
            user: { select: { name: true } },
            product: { select: { name: true, sku: true } },
          },
        }),
        ctx.db.stockMovement.count({ where }),
      ]);

      return { items, total };
    }),
});
