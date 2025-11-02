import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function makeUserCorporate() {
  try {
    // Get username or email from command line arguments
    const identifier = process.argv[2];

    if (!identifier) {
      console.log('❌ Lütfen bir kullanıcı adı veya email belirtin!');
      console.log('📝 Kullanım: ts-node -r tsconfig-paths/register src/scripts/make-user-corporate.ts <username|email>');
      process.exit(1);
    }

    console.log(`🔍 Kullanıcı aranıyor: ${identifier}...`);

    // Find user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      console.log(`❌ Kullanıcı bulunamadı: ${identifier}`);
      console.log('💡 Mevcut kullanıcıları görmek için Prisma Studio kullanabilirsiniz: pnpm prisma:studio');
      process.exit(1);
    }

    if (user.role === 'CORPORATE') {
      console.log(`✅ ${user.username} zaten kurumsal kullanıcı!`);
      console.log(`📧 Email: ${user.email}`);
      console.log(`🏛️  Role: ${user.role}`);
      process.exit(0);
    }

    // Update user to corporate
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'CORPORATE' },
    });

    console.log(`✅ ${user.username} kullanıcısı kurumsal yapıldı!`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`🏛️  Role: CORPORATE`);
    console.log(`🎉 Artık kurumsal giriş yapabilir: http://localhost:3000/login → "Kurumsal Giriş"`);
  } catch (error) {
    console.error('❌ Hata:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

makeUserCorporate()
  .then(() => {
    console.log('🎉 İşlem tamamlandı');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 İşlem başarısız:', error);
    process.exit(1);
  });

