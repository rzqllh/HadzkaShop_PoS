const DEFAULT_CALLBACK_PATH = "/pos";

export function sanitizeCallbackUrl(
  callbackUrl: string | null | undefined,
  fallback = DEFAULT_CALLBACK_PATH,
) {
  if (
    !callbackUrl ||
    !callbackUrl.startsWith("/") ||
    callbackUrl.startsWith("//") ||
    callbackUrl.includes("\\")
  ) {
    return fallback;
  }

  return callbackUrl;
}
