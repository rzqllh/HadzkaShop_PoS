import { z } from "zod";
import { createTRPCRouter, ownerProcedure, protectedProcedure } from "@/server/api/trpc";

export const categoriesRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.category.findMany({
      where: { shopId: ctx.session.user.shopId },
      orderBy: { sortOrder: "asc" },
    });
  }),

  create: ownerProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const highestSort = await ctx.db.category.findFirst({
        where: { shopId: ctx.session.user.shopId },
        orderBy: { sortOrder: "desc" },
      });

      const nextSort = highestSort ? highestSort.sortOrder + 1 : 0;

      return ctx.db.category.create({
        data: {
          name: input.name,
          shopId: ctx.session.user.shopId,
          sortOrder: nextSort,
        },
      });
    }),

  update: ownerProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.category.update({
        where: { id: input.id, shopId: ctx.session.user.shopId },
        data: { name: input.name },
      });
    }),

  delete: ownerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.category.delete({
        where: { id: input.id, shopId: ctx.session.user.shopId },
      });
    }),
});
