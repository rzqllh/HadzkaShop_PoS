export const PRODUCT_IMAGES_BUCKET = "product-images";
export const MAX_PRODUCT_IMAGE_BYTES = 2 * 1024 * 1024;
export const PRODUCT_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export function canUploadProductImage(role: string) {
  return role === "OWNER";
}

type ImageType = {
  extension: "jpg" | "png" | "webp";
  contentType: (typeof PRODUCT_IMAGE_MIME_TYPES)[number];
};

function detectImageType(bytes: Uint8Array): ImageType | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { extension: "jpg", contentType: "image/jpeg" };
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { extension: "png", contentType: "image/png" };
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { extension: "webp", contentType: "image/webp" };
  }
  return null;
}

export function validateProductImage(input: {
  bytes: Uint8Array;
  declaredMimeType: string;
  size: number;
}) {
  if (input.size <= 0 || input.size > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error("Ukuran gambar harus maksimal 2 MiB");
  }

  const detected = detectImageType(input.bytes);
  if (!detected) {
    throw new Error("File harus berupa JPEG, PNG, atau WebP yang valid");
  }
  if (input.declaredMimeType !== detected.contentType) {
    throw new Error("MIME type tidak cocok dengan isi file");
  }
  return detected;
}

export function isProductImageUrlForShop(
  imageUrl: string,
  input: { supabaseUrl: string; shopId: string },
) {
  try {
    const url = new URL(imageUrl);
    const supabaseUrl = new URL(input.supabaseUrl);
    if (url.origin !== supabaseUrl.origin || url.search || url.hash) return false;

    const prefix = `/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${input.shopId}/`;
    if (!url.pathname.startsWith(prefix)) return false;
    const filename = url.pathname.slice(prefix.length);
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i.test(
      filename,
    );
  } catch {
    return false;
  }
}
