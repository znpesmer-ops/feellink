import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function updateAdminRoles() {
  try {
    console.log('🔍 Admin kullanıcıları kontrol ediliyor...\n');

    const legacyAdmins = await prisma.user.findMany({
      where: {
        isAdmin: true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        roles: true,
      },
    });

    if (legacyAdmins.length === 0) {
      console.log('✅ Kayıtlı admin kullanıcısı bulunamadı.');
      return;
    }

    console.log(`📝 ${legacyAdmins.length} admin kullanıcı kontrol edilecek:\n`);

    for (const user of legacyAdmins) {
      if (user.roles && user.roles.length > 0) {
        console.log(`ℹ️  ${user.username} (${user.email}) → mevcut roller: [${user.roles.join(', ')}]`);
        continue;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { roles: { set: ['art_lover'] } },
      });

      console.log(`✅ ${user.username} (${user.email}) → varsayılan rol atandı: [art_lover]`);
    }

    console.log('\n🎉 Tüm admin kullanıcılar güncellendi!');
  } catch (error) {
    console.error('❌ Hata:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminRoles()
  .then(() => {
    console.log('\n✅ İşlem tamamlandı');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 İşlem başarısız:', error);
    process.exit(1);
  });


