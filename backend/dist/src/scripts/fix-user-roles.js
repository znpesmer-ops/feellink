"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const dotenv = require("dotenv");
dotenv.config();
const prisma = new client_1.PrismaClient();
async function fixUserRoles() {
    try {
        console.log('🔍 Kullanıcı rolleri kontrol ediliyor...');
        const allUsers = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                roles: true,
            },
        });
        const usersWithoutRoles = allUsers.filter((user) => !user.roles || user.roles.length === 0);
        console.log(`📝 ${usersWithoutRoles.length} kullanıcı güncellenecek:\n`);
        for (const user of usersWithoutRoles) {
            const roleMap = {
                art_lover: client_1.UserRole.art_lover,
                user: client_1.UserRole.art_lover,
                USER: client_1.UserRole.art_lover,
                corporate: client_1.UserRole.corporate,
                CORPORATE: client_1.UserRole.corporate,
                collector: client_1.UserRole.collector,
                COLLECTOR: client_1.UserRole.collector,
                artist: client_1.UserRole.artist,
                ARTIST: client_1.UserRole.artist,
                museum: client_1.UserRole.artist,
                MUSEUM: client_1.UserRole.artist,
            };
            const normalized = Array.from(new Set((user.roles || [])
                .map((r) => roleMap[r] || null)
                .filter((value) => value !== null)));
            const defaultRoles = normalized.length > 0 ? normalized : [client_1.UserRole.art_lover];
            await prisma.user.update({
                where: { id: user.id },
                data: { roles: { set: defaultRoles } },
            });
            console.log(`✅ ${user.username || user.email} → roles: [${defaultRoles.join(', ')}]`);
        }
        console.log('\n🎉 Tüm kullanıcı rolleri güncellendi!');
        const allUsersCheck = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                roles: true,
            },
        });
        const usersStillWithoutRoles = allUsersCheck.filter((u) => !u.roles || u.roles.length === 0);
        if (usersStillWithoutRoles.length > 0) {
            console.log(`\n⚠️  Hala ${usersStillWithoutRoles.length} kullanıcıda rol yok. Tekrar güncelleniyor...`);
            for (const user of usersStillWithoutRoles) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { roles: { set: [client_1.UserRole.art_lover] } },
                });
            }
            console.log('✅ Tüm kullanıcılar varsayılan "art_lover" rolüne atandı.');
        }
    }
    catch (error) {
        console.error('❌ Hata:', error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
fixUserRoles()
    .then(() => {
    console.log('✅ İşlem tamamlandı');
    process.exit(0);
})
    .catch((error) => {
    console.error('💥 İşlem başarısız:', error);
    process.exit(1);
});
//# sourceMappingURL=fix-user-roles.js.map