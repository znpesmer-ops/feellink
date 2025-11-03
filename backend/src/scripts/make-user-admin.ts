import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function makeUserAdmin() {
  try {
    // Get username from command line arguments
    const username = process.argv[2];

    if (!username) {
      console.log('❌ Lütfen bir kullanıcı adı belirtin!');
      console.log('📝 Kullanım: ts-node -r tsconfig-paths/register src/scripts/make-user-admin.ts <username>');
      process.exit(1);
    }

    console.log(`🔍 Kullanıcı aranıyor: ${username}...`);

    // Find user
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
      },
    });

    if (!user) {
      console.log(`❌ Kullanıcı bulunamadı: ${username}`);
      console.log('💡 Mevcut kullanıcıları görmek için Prisma Studio kullanabilirsiniz: pnpm prisma:studio');
      process.exit(1);
    }

    if (user.isAdmin) {
      console.log(`✅ ${username} zaten admin!`);
      console.log(`📧 Email: ${user.email}`);
      process.exit(0);
    }

    // Update user to admin
    await prisma.user.update({
      where: { username },
      data: { isAdmin: true },
    });

    console.log(`✅ ${username} kullanıcısı admin yapıldı!`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`🎉 Artık admin paneline erişebilir: http://localhost:3000/admin`);
  } catch (error) {
    console.error('❌ Hata:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

makeUserAdmin()
  .then(() => {
    console.log('🎉 İşlem tamamlandı');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 İşlem başarısız:', error);
    process.exit(1);
  });




