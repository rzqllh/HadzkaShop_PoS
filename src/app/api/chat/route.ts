import { google } from '@ai-sdk/google';
import { streamText, tool, convertToModelMessages } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  
  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const shopId = session.user.shopId;
  const userId = session.user.id;

  const { messages } = await req.json();
  const coreMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: google('gemini-3.6-flash'),
    system: "Anda adalah AI Copilot cerdas untuk aplikasi Point of Sale (POS) Hadzka's Shop. Tugas Anda adalah membantu pemilik toko dan staf dalam mengelola kasir, mengecek inventaris, menambah stok, serta melihat data penjualan harian. Jawablah dalam bahasa Indonesia yang ramah, profesional, dan ringkas. Jika ada anggota keluarga yang tidak mengerti fitur tertentu, Anda bisa menjelaskannya dengan mudah. Selalu gunakan alat (tools) yang tersedia jika diminta informasi atau tindakan yang spesifik. Misalnya, gunakan `addStock` untuk menambah stok, `getInventory` untuk mengecek stok, dan `getSalesToday` untuk melihat penjualan. PENTING: Jika alat mengembalikan pesan error seperti 'Product not found', JANGAN memanggil alat yang sama berulang kali. Langsung beritahu pengguna bahwa produk tidak ditemukan atau belum terdaftar di sistem.",
    messages: coreMessages,
    tools: {
      getInventory: tool({
        description: 'Get the current stock of a product by SKU or Name',
        inputSchema: z.object({
          productNameOrSku: z.string(),
        }),
        execute: async (args: { productNameOrSku: string }) => {
          const product = await prisma.product.findFirst({
            where: {
              shopId,
              OR: [
                { name: { contains: args.productNameOrSku, mode: 'insensitive' } },
                { sku: { contains: args.productNameOrSku, mode: 'insensitive' } }
              ]
            }
          });
          if (!product) return 'Product not found';
          return { stock: product.stock, name: product.name, sku: product.sku, price: Number(product.price) };
        },
      }),
      addStock: tool({
        description: 'Add physical stock to a product when new items arrive from a supplier.',
        inputSchema: z.object({
          productNameOrSku: z.string(),
          quantity: z.number(),
          reason: z.string().optional(),
        }),
        execute: async (args: { productNameOrSku: string; quantity: number; reason?: string }) => {
          const product = await prisma.product.findFirst({
            where: {
              shopId,
              OR: [
                { name: { contains: args.productNameOrSku, mode: 'insensitive' } },
                { sku: { contains: args.productNameOrSku, mode: 'insensitive' } }
              ]
            }
          });
          if (!product) return 'Product not found';
          
          try {
            await prisma.$transaction(async (tx) => {
              await tx.product.update({
                where: { id: product.id },
                data: { stock: { increment: args.quantity } }
              });
              
              await tx.stockMovement.create({
                data: {
                  shopId,
                  productId: product.id,
                  userId,
                  type: 'ADD',
                  quantity: args.quantity,
                  previousStock: product.stock,
                  newStock: product.stock + args.quantity,
                  reason: args.reason || 'AI Copilot added stock',
                }
              });
            });
            return `Added ${args.quantity} to ${product.name}. New stock is ${product.stock + args.quantity}.`;
          } catch (error) {
            return 'Failed to add stock';
          }
        }
      }),
      getSalesToday: tool({
        description: 'Get aggregated sales data for today',
        inputSchema: z.object({}),
        execute: async () => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const transactions = await prisma.transaction.findMany({
            where: {
              shopId,
              createdAt: { gte: today },
              status: 'COMPLETED'
            },
            include: { items: true }
          });
          
          const totalRevenue = transactions.reduce((sum, tx) => sum + Number(tx.total), 0);
          const totalTransactions = transactions.length;
          
          return { totalRevenue, totalTransactions, date: today.toISOString() };
        }
      })
    }
  });

  return result.toUIMessageStreamResponse();
}
