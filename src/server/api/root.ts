import { createTRPCRouter, createCallerFactory } from "@/server/api/trpc";
import { shopRouter } from "./routers/shop";
import { categoriesRouter } from "./routers/categories";
import { productsRouter } from "./routers/products";
import { usersRouter } from "./routers/users";
import { shiftsRouter } from "./routers/shifts";

export const appRouter = createTRPCRouter({
  shop: shopRouter,
  categories: categoriesRouter,
  products: productsRouter,
  users: usersRouter,
  shifts: shiftsRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
