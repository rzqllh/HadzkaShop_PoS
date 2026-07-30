import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeCallbackUrl } from "../src/lib/safe-redirect";

test("accepts an application-relative callback path", () => {
  assert.equal(sanitizeCallbackUrl("/pos"), "/pos");
  assert.equal(sanitizeCallbackUrl("/receipt/123?print=1"), "/receipt/123?print=1");
});

test("rejects absolute, protocol-relative, scheme, and backslash callbacks", () => {
  for (const callbackUrl of [
    "https://evil.example",
    "//evil.example",
    "javascript:alert(1)",
    String.raw`\evil.example`,
    String.raw`/\evil.example`,
  ]) {
    assert.equal(sanitizeCallbackUrl(callbackUrl), "/pos");
  }
});

test("falls back when the callback is missing or does not start with one slash", () => {
  assert.equal(sanitizeCallbackUrl(null), "/pos");
  assert.equal(sanitizeCallbackUrl("dashboard"), "/pos");
  assert.equal(sanitizeCallbackUrl(""), "/pos");
});
