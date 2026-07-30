import assert from "node:assert/strict";
import test from "node:test";

import {
  canUploadProductImage,
  isProductImageUrlForShop,
  validateProductImage,
} from "../src/server/storage/product-images";

const png = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]);

test("only owners may upload product images", () => {
  assert.equal(canUploadProductImage("OWNER"), true);
  assert.equal(canUploadProductImage("CASHIER"), false);
  assert.equal(canUploadProductImage("anonymous"), false);
});

test("image validation detects content from magic bytes instead of filename", () => {
  assert.deepEqual(
    validateProductImage({
      bytes: png,
      declaredMimeType: "image/png",
      size: png.byteLength,
    }),
    { extension: "png", contentType: "image/png" },
  );
});

test("image validation rejects MIME spoofing, magic mismatch, and oversized files", () => {
  assert.throws(() =>
    validateProductImage({
      bytes: png,
      declaredMimeType: "image/jpeg",
      size: png.byteLength,
    }),
  );
  assert.throws(() =>
    validateProductImage({
      bytes: Uint8Array.from([0x3c, 0x73, 0x76, 0x67, 0x3e]),
      declaredMimeType: "image/png",
      size: 5,
    }),
  );
  assert.throws(() =>
    validateProductImage({
      bytes: png,
      declaredMimeType: "image/png",
      size: 2 * 1024 * 1024 + 1,
    }),
  );
});

test("product image URL must use the configured bucket and current shop path", () => {
  const baseUrl = "https://example.supabase.co";
  const shopId = "25ca9e66-952a-460a-85c6-30492f87471b";
  const fileId = "85bc175d-8720-4233-ad46-1565c672dc02";
  assert.equal(
    isProductImageUrlForShop(
      `${baseUrl}/storage/v1/object/public/product-images/${shopId}/${fileId}.png`,
      { supabaseUrl: baseUrl, shopId },
    ),
    true,
  );
  assert.equal(
    isProductImageUrlForShop(
      `${baseUrl}/storage/v1/object/public/product-images/shop-b/${fileId}.png`,
      { supabaseUrl: baseUrl, shopId },
    ),
    false,
  );
  assert.equal(
    isProductImageUrlForShop(
      `https://evil.example/storage/v1/object/public/product-images/${shopId}/${fileId}.png`,
      { supabaseUrl: baseUrl, shopId },
    ),
    false,
  );
});
