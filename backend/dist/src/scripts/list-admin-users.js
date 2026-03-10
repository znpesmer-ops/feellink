"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const dotenv = require("dotenv");
dotenv.config();
const prisma = new client_1.PrismaClient();
async function listAdminUsers() {
    try {
        console.log('🔍 Admin yetkisine sahip kullanıcılar aranıyor...\n');
        const adminUsers = await prisma.user.findMany({
            where: {
                isAdmin: true,
            },
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                roles: true,
                isAdmin: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        if (adminUsers.length === 0) {
            console.log('❌ Hiç admin kullanıcı bulunamadı!');
            console.log('\n💡 Admin yapmak için:');
            console.log('   npm run make:admin <username>');
            console.log('   veya');
            console.log('   UPDATE "users" SET "isAdmin" = true WHERE username = \'<username>\';');
            return;
        }
        console.log(`✅ ${adminUsers.length} admin kullanıcı bulundu:\n`);
        console.log('─'.repeat(80));
        adminUsers.forEach((user, index) => {
            console.log(`\n${index + 1}. 👤 ${user.username}`);
            console.log(`   📧 Email: ${user.email}`);
            if (user.fullName) {
                console.log(`   📝 İsim: ${user.fullName}`);
            }
            console.log(`   🔑 Roller: ${user.roles.length > 0 ? user.roles.join(', ') : 'Yok'}`);
            console.log(`   🏷️  Legacy isAdmin: ${user.isAdmin ? '✅ Evet' : '❌ Hayır'}`);
            console.log(`   📅 Kayıt: ${new Date(user.createdAt).toLocaleString('tr-TR')}`);
        });
        console.log('\n' + '─'.repeat(80));
        console.log('\n💡 Admin paneline erişim: http://localhost:3000/admin');
    }
    catch (error) {
        console.error('❌ Hata:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
listAdminUsers()
    .then(() => {
    console.log('\n🎉 İşlem tamamlandı');
    process.exit(0);
})
    .catch((error) => {
    console.error('💥 İşlem başarısız:', error);
    process.exit(1);
});
//# sourceMappingURL=list-admin-users.js.map