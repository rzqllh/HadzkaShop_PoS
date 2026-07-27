import { z } from "zod";
import { createTRPCRouter, ownerProcedure } from "@/server/api/trpc";

export const shopRouter = createTRPCRouter({
  getSettings: ownerProcedure.query(async ({ ctx }) => {
    return ctx.db.shop.findUnique({
      where: { id: ctx.session.user.shopId },
    });
  }),

  updateSettings: ownerProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nama toko wajib diisi"),
        address: z.string().optional(),
        phone: z.string().optional(),
        taxRate: z.number().min(0).max(100),
        lowStockThreshold: z.number().min(0),
        receiptHeader: z.string().optional(),
        receiptFooter: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.shop.update({
        where: { id: ctx.session.user.shopId },
        data: input,
      });
    }),
});
