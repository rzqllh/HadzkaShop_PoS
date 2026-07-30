import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  MAX_PRODUCT_IMAGE_BYTES,
  PRODUCT_IMAGES_BUCKET,
  canUploadProductImage,
  validateProductImage,
} from "@/server/storage/product-images";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canUploadProductImage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await request.formData();
    const file = data.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File wajib diunggah" }, { status: 400 });
    }
    if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Ukuran gambar harus maksimal 2 MiB" },
        { status: 413 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const image = validateProductImage({
      bytes,
      declaredMimeType: file.type,
      size: file.size,
    });
    const objectPath = `${session.user.shopId}/${randomUUID()}.${image.extension}`;
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(objectPath, bytes, {
        contentType: image.contentType,
        cacheControl: "31536000",
        upsert: false,
      });
    if (error) throw error;

    const { data: publicUrl } = supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .getPublicUrl(objectPath);
    return NextResponse.json({ url: publicUrl.publicUrl }, { status: 201 });
  } catch (error) {
    console.error("product_image_upload_failed", {
      shopId: session.user.shopId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload gagal" },
      { status: 400 },
    );
  }
}
