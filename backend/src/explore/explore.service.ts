import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExploreService {
  constructor(private prisma: PrismaService) {}

  async getExplorePosts(userId: string, limit: number = 20, cursor?: string) {
    // Get posts that user hasn't posted
    // Order by likes and comments (popularity)
    const where = cursor
      ? {
          id: { lt: cursor },
          userId: { not: userId },
        }
      : {
          userId: { not: userId },
        };

    const posts = await this.prisma.post.findMany({
      where,
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
          take: 1, // Only first media for grid view
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit + 1, // Get one extra to check if there are more
    });

    const hasMore = posts.length > limit;
    const filteredPosts = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore && filteredPosts.length > 0
      ? filteredPosts[filteredPosts.length - 1].id
      : undefined;

    // Check if liked
    const postIds = filteredPosts.map(p => p.id);
    const likes = await this.prisma.like.findMany({
      where: {
        postId: { in: postIds },
        userId,
      },
    });

    const likedPostIds = new Set(likes.map(l => l.postId));

    return {
      posts: filteredPosts.map(post => ({
        ...post,
        isLiked: likedPostIds.has(post.id),
      })),
      nextCursor,
      hasMore,
    };
  }

  async searchHashtags(query: string, limit: number = 20) {
    // This will use Meilisearch if available, otherwise fallback to Prisma
    const hashtags = await this.prisma.hashtag.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      orderBy: {
        postCount: 'desc',
      },
      take: limit,
    });

    return hashtags;
  }

  async getHashtagPosts(hashtagName: string, userId: string, limit: number = 20, cursor?: string) {
    const hashtag = await this.prisma.hashtag.findUnique({
      where: { name: hashtagName.toLowerCase() },
    });

    if (!hashtag) {
      return {
        posts: [],
        nextCursor: undefined,
        hasMore: false,
      };
    }

    const where = cursor
      ? {
          hashtags: {
            some: {
              hashtagId: hashtag.id,
            },
          },
          id: { lt: cursor },
        }
      : {
          hashtags: {
            some: {
              hashtagId: hashtag.id,
            },
          },
        };

    const posts = await this.prisma.post.findMany({
      where,
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
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = posts.length > limit;
    const filteredPosts = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore && filteredPosts.length > 0
      ? filteredPosts[filteredPosts.length - 1].id
      : undefined;

    // Check if liked
    const postIds = filteredPosts.map(p => p.id);
    const likes = await this.prisma.like.findMany({
      where: {
        postId: { in: postIds },
        userId,
      },
    });

    const likedPostIds = new Set(likes.map(l => l.postId));

    return {
      posts: filteredPosts.map(post => ({
        ...post,
        isLiked: likedPostIds.has(post.id),
      })),
      nextCursor,
      hasMore,
    };
  }
}

