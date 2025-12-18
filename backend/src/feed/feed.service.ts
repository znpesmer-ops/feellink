import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class FeedService {
  private redis: Redis;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }

  // Helper: Transform media URLs for mobile compatibility
  private transformMediaUrl(url: string): string {
    if (!url) return url;
    
    // If it's already a full URL with localhost, replace with BASE_URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const baseUrl = this.configService.get('BASE_URL');
      if (baseUrl && (url.includes('localhost') || url.includes('127.0.0.1'))) {
        try {
          const urlObj = new URL(url);
          return `${baseUrl}${urlObj.pathname}${urlObj.search}`;
        } catch {
          return url;
        }
      }
      return url;
    }
    
    // Relative path - MUST use BASE_URL with port (3001, not MinIO 9000)
    const baseUrl = this.configService.get('BASE_URL');
    if (!baseUrl) {
      const backendPort = this.configService.get('PORT') || '3002';
      const endpoint = this.configService.get('MINIO_ENDPOINT') || 'localhost';
      const resolvedEndpoint = endpoint === 'localhost' || endpoint === '127.0.0.1' 
        ? '192.168.1.38' 
        : endpoint;
      const cleanPath = url.startsWith('/') ? url : `/${url}`;
      return `http://${resolvedEndpoint}:${backendPort}${cleanPath}`;
    }
    
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${cleanPath}`;
  }

  // Helper: Transform avatar URLs
  private transformAvatarUrl(avatar: string | null): string | null {
    if (!avatar) return null;
    
    // If it's already a full URL with localhost, replace with BASE_URL
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
      const baseUrl = this.configService.get('BASE_URL');
      if (baseUrl && (avatar.includes('localhost') || avatar.includes('127.0.0.1'))) {
        try {
          const urlObj = new URL(avatar);
          return `${baseUrl}${urlObj.pathname}${urlObj.search}`;
        } catch {
          return avatar;
        }
      }
      return avatar;
    }
    
    // Relative path - MUST use BASE_URL with port (3001, not MinIO 9000)
    const baseUrl = this.configService.get('BASE_URL');
    if (!baseUrl) {
      const backendPort = this.configService.get('PORT') || '3002';
      const endpoint = this.configService.get('MINIO_ENDPOINT') || 'localhost';
      const resolvedEndpoint = endpoint === 'localhost' || endpoint === '127.0.0.1' 
        ? '192.168.1.38' 
        : endpoint;
      const cleanPath = avatar.startsWith('/') ? avatar : `/${avatar}`;
      return `http://${resolvedEndpoint}:${backendPort}${cleanPath}`;
    }
    
    const cleanPath = avatar.startsWith('/') ? avatar : `/${avatar}`;
    return `${baseUrl}${cleanPath}`;
  }

  async getFeed(userId: string, limit: number = 20, cursor?: string) {
    const cacheKey = `feed:${userId}`;

    let postIds: string[] = [];
    let hasMore = false;
    let nextCursor: string | undefined;

    if (cursor) {
      // Cursor-based pagination from cache
      const cursorIndex = await this.redis.lpos(cacheKey, cursor);
      if (cursorIndex !== null) {
        const startIndex = cursorIndex + 1;
        const endIndex = startIndex + limit - 1;
        postIds = await this.redis.lrange(cacheKey, startIndex, endIndex);
      }
    } else {
      // First page - get from cache or rebuild
      postIds = await this.redis.lrange(cacheKey, 0, limit - 1);
    }

    // If cache is empty or insufficient, rebuild feed
    if (postIds.length === 0) {
      const posts = await this.rebuildFeed(userId, limit);
      return {
        posts,
        nextCursor: posts.length > 0 ? posts[posts.length - 1].id : undefined,
        hasMore: false,
      };
    }

    // Get posts from database
    const posts = await this.prisma.post.findMany({
      where: {
        id: { in: postIds },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
            isVerified: true,
          },
        },
        media: {
          orderBy: { order: 'asc' },
        },
        hashtags: {
          include: {
            hashtag: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Check if liked
    const postIdsForLike = posts.map(p => p.id);
    const likes = await this.prisma.like.findMany({
      where: {
        postId: { in: postIdsForLike },
        userId,
      },
    });

    const likedPostIds = new Set(likes.map(l => l.postId));

    // Check if there are more posts
    if (cursor) {
      const cursorIndex = await this.redis.lpos(cacheKey, cursor);
      if (cursorIndex !== null) {
        const nextIndex = cursorIndex + posts.length + 1;
        const nextPostId = await this.redis.lindex(cacheKey, nextIndex);
        hasMore = nextPostId !== null;
      }
    } else {
      const nextPostId = await this.redis.lindex(cacheKey, limit);
      hasMore = nextPostId !== null;
    }

    nextCursor = posts.length > 0 ? posts[posts.length - 1].id : undefined;

    return {
      posts: posts.map(post => ({
        ...post,
        isLiked: likedPostIds.has(post.id),
        media: post.media?.map((m: any) => ({
          ...m,
          url: this.transformMediaUrl(m.url),
        })) || [],
        user: {
          ...post.user,
          avatar: this.transformAvatarUrl(post.user.avatar),
        },
      })),
      nextCursor,
      hasMore,
    };
  }

  async addToFollowersFeeds(userId: string, postId: string) {
    // Fan-out-on-write: Add post to all followers' feed caches
    const followers = await this.prisma.follow.findMany({
      where: { followingId: userId },
      select: { followerId: true },
    });

    const pipeline = this.redis.pipeline();

    for (const follow of followers) {
      const cacheKey = `feed:${follow.followerId}`;
      pipeline.lpush(cacheKey, postId);
      pipeline.ltrim(cacheKey, 0, 1000); // Keep last 1000 posts
      pipeline.expire(cacheKey, 7 * 24 * 60 * 60); // 7 days
    }

    await pipeline.exec();
  }

  async removeFromFeeds(postId: string) {
    // Remove post from all feed caches
    const keys = await this.redis.keys('feed:*');
    const pipeline = this.redis.pipeline();

    for (const key of keys) {
      pipeline.lrem(key, 0, postId);
    }

    await pipeline.exec();
  }

  private async rebuildFeed(userId: string, limit: number = 20): Promise<any[]> {
    // Get posts from users that the current user follows
    // This creates the "home feed" - only content from users you follow
    // Includes all post types: posts, artworks, articles, events
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = following.map(f => f.followingId);

    // If user follows no one, return empty feed
    if (followingIds.length === 0) {
      return [];
    }

    // Get posts (all types: post, artwork, article, event) from followed users
    const posts = await this.prisma.post.findMany({
      where: {
        userId: { in: followingIds },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
            isVerified: true,
          },
        },
        media: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Cache the post IDs
    if (posts.length > 0) {
      const cacheKey = `feed:${userId}`;
      const postIds = posts.map(p => p.id);
      await this.redis.lpush(cacheKey, ...postIds);
      await this.redis.ltrim(cacheKey, 0, 1000);
      await this.redis.expire(cacheKey, 7 * 24 * 60 * 60);
    }

    // Check if liked
    const postIds = posts.map(p => p.id);
    const likes = await this.prisma.like.findMany({
      where: {
        postId: { in: postIds },
        userId,
      },
    });

    const likedPostIds = new Set(likes.map(l => l.postId));

    return posts.map(post => ({
      ...post,
      isLiked: likedPostIds.has(post.id),
      media: post.media?.map((m: any) => ({
        ...m,
        url: this.transformMediaUrl(m.url),
      })) || [],
      user: {
        ...post.user,
        avatar: this.transformAvatarUrl(post.user.avatar),
      },
    }));
  }
}

