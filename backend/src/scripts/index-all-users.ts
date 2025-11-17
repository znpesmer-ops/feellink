import { PrismaClient } from '@prisma/client';
import { MeiliSearch } from 'meilisearch';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const client = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_API_KEY || 'masterKey',
});

async function indexAllUsers() {
  try {
    console.log('🚀 Starting user indexing...');

    // Get all users from database
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        bio: true,
        avatar: true,
        isVerified: true,
      },
    });

    console.log(`📊 Found ${users.length} users to index`);

    if (users.length === 0) {
      console.log('⚠️  No users found in database');
      return;
    }

    // Prepare documents for Meilisearch
    const documents = users.map((user) => ({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      bio: user.bio,
      avatar: user.avatar,
      isVerified: user.isVerified,
    }));

    // Get or create index
    const index = client.index('users');

    // Add documents to Meilisearch
    const task = await index.addDocuments(documents);
    console.log(`✅ Added ${documents.length} users to Meilisearch`);
    console.log(`📝 Task ID: ${task.taskUid}`);

    // Wait for indexing to complete
    await client.waitForTask(task.taskUid);
    console.log('✨ Indexing completed successfully!');
  } catch (error) {
    console.error('❌ Error indexing users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

indexAllUsers()
  .then(() => {
    console.log('🎉 Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
















