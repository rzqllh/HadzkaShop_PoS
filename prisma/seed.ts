import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Check if owner exists
  const existingOwner = await prisma.user.findFirst({
    where: { role: "OWNER" },
  });

  if (!existingOwner) {
    const passwordHash = await bcrypt.hash("password123", 10);

    const shop = await prisma.shop.create({
      data: {
        name: "Hadzka Shop",
        address: "Jl. Merdeka No. 1",
        phone: "081234567890",
        taxRate: 11.0,
      },
    });

    await prisma.user.create({
      data: {
        shopId: shop.id,
        name: "Admin Owner",
        email: "owner@hadzkashop.com",
        passwordHash,
        role: "OWNER",
      },
    });

    console.log("Created Shop and Owner account:");
    console.log("Email: owner@hadzkashop.com");
    console.log("Password: password123");
  } else {
    console.log("Owner already exists. Skipping seed.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
