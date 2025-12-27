import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';

dotenv.config();

const prisma = new PrismaClient();

async function resetPassword() {
  try {
    // Get email/username and new password from command line arguments
    const emailOrUsername = process.argv[2];
    const newPassword = process.argv[3];

    if (!emailOrUsername) {
      console.log('❌ Lütfen bir email veya kullanıcı adı belirtin!');
      console.log('📝 Kullanım: ts-node -r tsconfig-paths/register src/scripts/reset-password.ts <email|username> [yeni-sifre]');
      console.log('💡 Şifre belirtilmezse varsayılan şifre: "123456" olacak');
      process.exit(1);
    }

    // Default password if not provided
    const password = newPassword || '123456';

    if (password.length < 6) {
      console.log('❌ Şifre en az 6 karakter olmalı!');
      process.exit(1);
    }

    console.log(`🔍 Kullanıcı aranıyor: ${emailOrUsername}...`);

    // Find user by email or username (case-insensitive)
    const normalized = emailOrUsername.toLowerCase().trim();
    
    // Find user by email or username (case-insensitive for MongoDB)
    let foundUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: normalized, mode: 'insensitive' } },
          { username: { equals: normalized, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });

    // If not found, try getting all users and filtering (MongoDB fallback)
    if (!foundUser) {
      const allUsers = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
        },
      });
      
      foundUser = allUsers.find(
        (u) => u.email?.toLowerCase() === normalized || u.username?.toLowerCase() === normalized
      ) || undefined;
    }
    
    if (!foundUser) {
      console.log(`❌ Kullanıcı bulunamadı: ${emailOrUsername}`);
      console.log('💡 Mevcut kullanıcıları görmek için Prisma Studio kullanabilirsiniz: pnpm prisma:studio');
      process.exit(1);
    }
    console.log(`✅ Kullanıcı bulundu:`);
    console.log(`   👤 Username: ${foundUser.username}`);
    console.log(`   📧 Email: ${foundUser.email}`);

    // Hash the new password
    console.log(`🔐 Şifre hash'leniyor...`);
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    await prisma.user.update({
      where: { id: foundUser.id },
      data: { password: hashedPassword },
    });

    console.log(`✅ Şifre başarıyla sıfırlandı!`);
    console.log(`📧 Email: ${foundUser.email}`);
    console.log(`👤 Username: ${foundUser.username}`);
    console.log(`🔑 Yeni Şifre: ${password}`);
    console.log(`🎉 Artık bu şifre ile giriş yapabilirsiniz!`);
  } catch (error) {
    console.error('❌ Hata:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword()
  .then(() => {
    console.log('🎉 İşlem tamamlandı');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 İşlem başarısız:', error);
    process.exit(1);
  });

