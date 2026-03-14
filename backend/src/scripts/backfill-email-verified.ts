import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.user.count({
    where: { isVerified: false },
  });
  console.log(`Users to update: ${count}`);

  const result = await prisma.user.updateMany({
    where: { isVerified: false },
    data: { isVerified: true },
  });

  console.log(`Updated users: ${result.count}`);
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
