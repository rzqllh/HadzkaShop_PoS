import { createSupabaseAdminClient } from "../src/lib/supabase-admin";
import {
  MAX_PRODUCT_IMAGE_BYTES,
  PRODUCT_IMAGE_MIME_TYPES,
  PRODUCT_IMAGES_BUCKET,
} from "../src/server/storage/product-images";

async function main() {
  const supabase = createSupabaseAdminClient();
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  const options = {
    public: true,
    allowedMimeTypes: [...PRODUCT_IMAGE_MIME_TYPES],
    fileSizeLimit: MAX_PRODUCT_IMAGE_BYTES,
  };
  const existing = buckets.find((bucket) => bucket.id === PRODUCT_IMAGES_BUCKET);
  const { error } = existing
    ? await supabase.storage.updateBucket(PRODUCT_IMAGES_BUCKET, options)
    : await supabase.storage.createBucket(PRODUCT_IMAGES_BUCKET, options);
  if (error) throw error;

  console.info("product_images_bucket_ready", {
    bucket: PRODUCT_IMAGES_BUCKET,
    public: true,
    fileSizeLimit: MAX_PRODUCT_IMAGE_BYTES,
  });
}

main().catch((error) => {
  console.error("product_images_bucket_failed", {
    error: error instanceof Error ? error.message : "unknown",
  });
  process.exitCode = 1;
});
