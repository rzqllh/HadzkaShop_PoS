import { prisma } from "../src/lib/prisma";


async function main() {
  console.log("Seeding database...");

  // Check if owner exists
  const existingOwner = await prisma.user.findFirst({
    where: { role: "OWNER" },
  });

  if (!existingOwner) {

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
        role: "OWNER",
      },
    });

    console.log("Created development Shop and unlinked Owner record.");
    console.log("Run pnpm bootstrap:owner to provision a login securely.");
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
