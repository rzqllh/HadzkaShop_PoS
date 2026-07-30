import { NextResponse } from "next/server";

import { createClient } from "@/lib/server";
import { sanitizeCallbackUrl } from "@/lib/safe-redirect";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = sanitizeCallbackUrl(url.searchParams.get("next"), "/pos");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

  return NextResponse.redirect(
    new URL("/login?error=InvalidRecoveryLink", url.origin),
  );
}
