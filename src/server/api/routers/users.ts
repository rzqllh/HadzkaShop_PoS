import { z } from "zod";
import { createTRPCRouter, ownerProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";

export const usersRouter = createTRPCRouter({
  getAll: ownerProcedure.query(async ({ ctx }) => {
    const users = await ctx.db.user.findMany({
      where: { shopId: ctx.session.user.shopId, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    return users;
  }),

  create: ownerProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(6, "Password minimal 6 karakter"),
      role: z.enum(["OWNER", "CASHIER"]).default("CASHIER"),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Email sudah digunakan" });
      }

      const passwordHash = await bcrypt.hash(input.password, 10);

      return ctx.db.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          role: input.role,
          shopId: ctx.session.user.shopId,
        },
        select: { id: true, name: true, email: true, role: true },
      });
    }),

  update: ownerProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().optional().refine(val => !val || val.length >= 6, {
        message: "Password minimal 6 karakter jika ingin diubah",
      }),
      role: z.enum(["OWNER", "CASHIER"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (existing && existing.id !== input.id) {
        throw new TRPCError({ code: "CONFLICT", message: "Email sudah digunakan oleh pengguna lain" });
      }

      // Check if trying to change their own role or remove the last owner
      if (input.id === ctx.session.user.id && input.role !== "OWNER") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Anda tidak dapat mengubah role Anda sendiri dari Owner" });
      }

      const dataToUpdate: any = {
        name: input.name,
        email: input.email,
        role: input.role,
      };

      if (input.password) {
        dataToUpdate.passwordHash = await bcrypt.hash(input.password, 10);
      }

      return ctx.db.user.update({
        where: { id: input.id, shopId: ctx.session.user.shopId },
        data: dataToUpdate,
        select: { id: true, name: true, email: true, role: true },
      });
    }),

  delete: ownerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.id === ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Anda tidak dapat menghapus akun Anda sendiri" });
      }

      return ctx.db.user.update({
        where: { id: input.id, shopId: ctx.session.user.shopId },
        data: { isActive: false },
        select: { id: true, email: true },
      });
    }),
});
