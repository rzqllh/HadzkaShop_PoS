import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const customersRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({ shopId: z.string() }))
    .query(async ({ ctx, input }) => {
      const customers = await ctx.db.customer.findMany({
        where: { shopId: input.shopId },
        orderBy: { createdAt: "desc" },
      });
      return customers;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const customer = await ctx.db.customer.findUnique({
        where: { id: input.id },
        include: {
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 50,
          },
        },
      });
      return customer;
    }),

  create: protectedProcedure
    .input(
      z.object({
        shopId: z.string(),
        name: z.string().min(1),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        address: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const customer = await ctx.db.customer.create({
        data: {
          shopId: input.shopId,
          name: input.name,
          phone: input.phone,
          email: input.email === "" ? undefined : input.email,
          address: input.address,
        },
      });
      return customer;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        address: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const customer = await ctx.db.customer.update({
        where: { id: input.id },
        data: {
          name: input.name,
          phone: input.phone,
          email: input.email === "" ? undefined : input.email,
          address: input.address,
        },
      });
      return customer;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.customer.delete({
        where: { id: input.id },
      });
      return { success: true };
    }),
});
