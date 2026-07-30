import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const customersRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
      const customers = await ctx.db.customer.findMany({
        where: { shopId: ctx.session.user.shopId },
        orderBy: { createdAt: "desc" },
      });
      return customers;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const customer = await ctx.db.customer.findFirst({
        where: {
          id: input.id,
          shopId: ctx.session.user.shopId,
        },
        include: {
          transactions: {
            where: { shopId: ctx.session.user.shopId },
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
        name: z.string().min(1),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        address: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const customer = await ctx.db.customer.create({
        data: {
          shopId: ctx.session.user.shopId,
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
      const { id, ...data } = input;
      const result = await ctx.db.customer.updateMany({
        where: {
          id,
          shopId: ctx.session.user.shopId,
        },
        data: {
          name: data.name,
          phone: data.phone,
          email: data.email === "" ? null : data.email,
          address: data.address,
        },
      });

      if (result.count !== 1) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pelanggan tidak ditemukan" });
      }

      return ctx.db.customer.findFirstOrThrow({
        where: { id, shopId: ctx.session.user.shopId },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.customer.deleteMany({
        where: {
          id: input.id,
          shopId: ctx.session.user.shopId,
        },
      });

      if (result.count !== 1) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pelanggan tidak ditemukan" });
      }

      return { success: true };
    }),
});
