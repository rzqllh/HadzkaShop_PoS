import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, ownerProcedure } from "@/server/api/trpc";
import { createAuthAdminGateway } from "@/lib/supabase-admin";
import {
  createStaffWithDatabase,
  deactivateUserWithDatabase,
  updateUserEmailWithDatabase,
  updateUserPassword,
  updateUserProfileWithDatabase,
} from "@/server/users/service";

function userMutationError(error: unknown): never {
  throw new TRPCError({
    code:
      error instanceof Error && error.message.includes("digunakan")
        ? "CONFLICT"
        : "BAD_REQUEST",
    message: error instanceof Error ? error.message : "Operasi pengguna gagal",
  });
}

export const usersRouter = createTRPCRouter({
  getAll: ownerProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
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
  }),

  create: ownerProcedure
    .input(
      z.object({
        name: z.string().trim().min(1),
        email: z.string().email(),
        password: z.string().min(8, "Password minimal 8 karakter"),
        role: z.enum(["OWNER", "CASHIER"]).default("CASHIER"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createStaffWithDatabase(
          ctx.db,
          createAuthAdminGateway(),
          {
            actorId: ctx.session.user.id,
            shopId: ctx.session.user.shopId,
            input,
          },
        );
      } catch (error) {
        userMutationError(error);
      }
    }),

  updateProfile: ownerProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().trim().min(1),
        role: z.enum(["OWNER", "CASHIER"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateUserProfileWithDatabase(ctx.db, {
          actorId: ctx.session.user.id,
          shopId: ctx.session.user.shopId,
          userId: input.id,
          name: input.name,
          role: input.role,
        });
      } catch (error) {
        userMutationError(error);
      }
    }),

  updateEmail: ownerProcedure
    .input(z.object({ id: z.string().uuid(), email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateUserEmailWithDatabase(
          ctx.db,
          createAuthAdminGateway(),
          {
            actorId: ctx.session.user.id,
            shopId: ctx.session.user.shopId,
            userId: input.id,
            email: input.email,
          },
        );
      } catch (error) {
        userMutationError(error);
      }
    }),

  updatePassword: ownerProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        password: z.string().min(8, "Password minimal 8 karakter"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await updateUserPassword(ctx.db, createAuthAdminGateway(), {
          actorId: ctx.session.user.id,
          shopId: ctx.session.user.shopId,
          userId: input.id,
          password: input.password,
        });
        return { success: true };
      } catch (error) {
        userMutationError(error);
      }
    }),

  deactivate: ownerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await deactivateUserWithDatabase(
          ctx.db,
          createAuthAdminGateway(),
          {
            actorId: ctx.session.user.id,
            shopId: ctx.session.user.shopId,
            userId: input.id,
          },
        );
        return { success: true };
      } catch (error) {
        userMutationError(error);
      }
    }),
});
