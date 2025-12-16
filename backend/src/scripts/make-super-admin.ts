import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function makeSuperAdmin() {
  try {
    const email = process.argv[2] || 'znp.esmer@gmail.com';

    console.log(`🔍 Kullanıcı aranıyor: ${email}...`);

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        superAdmin: true,
      },
    });

    if (!user) {
      console.log(`❌ Kullanıcı bulunamadı: ${email}`);
      process.exit(1);
    }

    if (user.superAdmin) {
      console.log(`✅ ${user.username} zaten SUPER ADMIN! 💥`);
      console.log(`📧 Email: ${user.email}`);
      process.exit(0);
    }

    await prisma.user.update({
      where: { email },
      data: {
        superAdmin: true,
        isAdmin: true, // SuperAdmin otomatik olarak admin de
      },
    });

    console.log(`✅ ${user.username} kullanıcısı SUPER ADMIN yapıldı! 💥`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`🎉 Artık GOD-MODE aktif! Tüm yetkilere sahipsin.`);
  } catch (error) {
    console.error('❌ Hata:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

makeSuperAdmin()
  .then(() => {
    console.log('🎉 İşlem tamamlandı');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 İşlem başarısız:', error);
    process.exit(1);
  });








