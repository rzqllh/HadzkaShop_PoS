import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublicRoute = nextUrl.pathname === "/login" || nextUrl.pathname.startsWith("/api/midtrans");

      if (isPublicRoute) {
        if (isLoggedIn && nextUrl.pathname === "/login") {
          return Response.redirect(new URL("/pos", nextUrl));
        }
        return true;
      }

      if (isLoggedIn) return true;
      return false; // Redirect unauthenticated users to login page
    },
  },
  providers: [], // Add providers in auth.ts
} satisfies NextAuthConfig;
