import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function syncFollowerCounts() {
  try {
    console.log('🚀 Starting follower count synchronization...');

    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true },
    });

    console.log(`📊 Found ${users.length} users to sync`);

    // Update counts for each user
    for (const user of users) {
      // Count followers (people who follow this user)
      const followerCount = await prisma.follow.count({
        where: { followingId: user.id },
      });

      // Count following (people this user follows)
      const followingCount = await prisma.follow.count({
        where: { followerId: user.id },
      });

      // Update user
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
  } catch (error) {
    console.error('❌ Error syncing follower counts:', error);
    throw error;
  } finally {
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




