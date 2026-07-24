import NextAuth, { type DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      role: "OWNER" | "CASHIER";
      shopId: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: "OWNER" | "CASHIER";
    shopId: string;
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    id: string;
    role: "OWNER" | "CASHIER";
    shopId: string;
  }
}
