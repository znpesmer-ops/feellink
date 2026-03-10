"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const dotenv = require("dotenv");
const users_service_1 = require("../users/users.service");
dotenv.config();
const prisma = new client_1.PrismaClient();
async function makeUserCorporate() {
    try {
        const identifier = process.argv[2];
        if (!identifier) {
            console.log('❌ Lütfen bir kullanıcı adı veya email belirtin!');
            console.log('📝 Kullanım: ts-node -r tsconfig-paths/register src/scripts/make-user-corporate.ts <username|email>');
            process.exit(1);
        }
        console.log(`🔍 Kullanıcı aranıyor: ${identifier}...`);
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
                roles: true,
                extras: true,
                plan: true,
                badges: true,
            },
        });
        if (!user) {
            console.log(`❌ Kullanıcı bulunamadı: ${identifier}`);
            console.log('💡 Mevcut kullanıcıları görmek için Prisma Studio kullanabilirsiniz: pnpm prisma:studio');
            process.exit(1);
        }
        const currentRoles = Array.from(new Set([...(user.roles || [])]));
        if (currentRoles.includes('corporate')) {
            console.log(`✅ ${user.username} zaten kurumsal kullanıcı!`);
            console.log(`📧 Email: ${user.email}`);
            console.log(`🏛️ Roller: ${currentRoles.join(', ')}`);
            process.exit(0);
        }
        const nextRoles = Array.from(new Set([...currentRoles, 'corporate']));
        const extras = Array.isArray(user.extras) ? user.extras : [];
        const plan = user.plan ?? 'FREE';
        const nextBadges = (0, users_service_1.getBadgesFromSelection)(nextRoles, plan, extras);
        await prisma.user.update({
            where: { id: user.id },
            data: {
                roles: nextRoles,
                badges: nextBadges,
            },
        });
        console.log(`✅ ${user.username} kullanıcısı kurumsal yapıldı!`);
        console.log(`📧 Email: ${user.email}`);
        console.log(`🏛️ Roller: ${nextRoles.join(', ')}`);
        console.log(`🎉 Artık kurumsal giriş yapabilir: http://localhost:3000/login → "Kurumsal Giriş"`);
    }
    catch (error) {
        console.error('❌ Hata:', error);
        throw error;
    }
    finally {
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
//# sourceMappingURL=make-user-corporate.js.map