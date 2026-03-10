"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const dotenv = require("dotenv");
dotenv.config();
const prisma = new client_1.PrismaClient();
async function makeUserAdmin() {
    try {
        const username = process.argv[2];
        if (!username) {
            console.log('❌ Lütfen bir kullanıcı adı belirtin!');
            console.log('📝 Kullanım: ts-node -r tsconfig-paths/register src/scripts/make-user-admin.ts <username>');
            process.exit(1);
        }
        console.log(`🔍 Kullanıcı aranıyor: ${username}...`);
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
        await prisma.user.update({
            where: { username },
            data: { isAdmin: true },
        });
        console.log(`✅ ${username} kullanıcısı admin yapıldı!`);
        console.log(`📧 Email: ${user.email}`);
        console.log(`🎉 Artık admin paneline erişebilir: http://localhost:3000/admin`);
    }
    catch (error) {
        console.error('❌ Hata:', error);
        throw error;
    }
    finally {
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
//# sourceMappingURL=make-user-admin.js.map