import { createTRPCRouter, ownerProcedure } from "@/server/api/trpc";
import { z } from "zod";

export const shiftsRouter = createTRPCRouter({
  getAll: ownerProcedure.query(async ({ ctx }) => {
    return ctx.db.tillSession.findMany({
      where: { shopId: ctx.session.user.shopId },
      include: {
        cashier: {
          select: { name: true },
        },
      },
      orderBy: { openedAt: "desc" },
    });
  }),
});
