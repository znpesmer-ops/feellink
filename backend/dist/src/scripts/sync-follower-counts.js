"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const dotenv = require("dotenv");
dotenv.config();
const prisma = new client_1.PrismaClient();
async function syncFollowerCounts() {
    try {
        console.log('🚀 Starting follower count synchronization...');
        const users = await prisma.user.findMany({
            select: { id: true },
        });
        console.log(`📊 Found ${users.length} users to sync`);
        for (const user of users) {
            const followerCount = await prisma.follow.count({
                where: { followingId: user.id },
            });
            const followingCount = await prisma.follow.count({
                where: { followerId: user.id },
            });
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    followerCount,
                    followingCount,
                },
            });
            console.log(`✅ Updated user ${user.id}: ${followerCount} followers, ${followingCount} following`);
        }
        console.log('✨ Synchronization completed successfully!');
    }
    catch (error) {
        console.error('❌ Error syncing follower counts:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
syncFollowerCounts()
    .then(() => {
    console.log('🎉 Script completed');
    process.exit(0);
})
    .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
});
//# sourceMappingURL=sync-follower-counts.js.map