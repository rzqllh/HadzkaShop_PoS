import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const maxDuration = 60;

export async function GET(req: Request) {
  const session = await auth();
  
  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const shopId = session.user.shopId;

  // Get some basic context to make suggestions relevant
  const productCount = await prisma.product.count({ where: { shopId } });
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const salesCount = await prisma.transaction.count({ 
    where: { 
      shopId,
      createdAt: { gte: today }
    } 
  });

  const lowStockCount = await prisma.product.count({
    where: {
      shopId,
      stock: { lt: 5 } // Assuming < 5 is low stock for this context
    }
  });

  const { object } = await generateObject({
    model: google('gemini-3.6-flash'),
    schema: z.object({
      suggestions: z.array(
        z.object({
          label: z.string().describe("Short label for the button, e.g. 'Cek produk habis'"),
          prompt: z.string().describe("The actual prompt sent to the AI when clicked"),
          emoji: z.string().describe("A single relevant emoji")
        })
      ).length(2)
    }),
    system: "Anda adalah asisten POS Hadzka's Shop. Berdasarkan konteks data toko saat ini, berikan 2 saran pertanyaan/perintah yang paling berguna bagi pemilik toko. Gunakan bahasa Indonesia yang singkat dan natural.",
    prompt: `Konteks Toko Saat Ini:
- Jumlah Produk Aktif: ${productCount}
- Transaksi Hari Ini: ${salesCount}
- Produk Stok Menipis (<5): ${lowStockCount}

Jika produk aktif 0, sarankan untuk menambahkan produk. Jika ada stok menipis, sarankan untuk mengecek stok menipis. Berikan 2 saran yang variatif.`
  });

  return Response.json(object);
}
