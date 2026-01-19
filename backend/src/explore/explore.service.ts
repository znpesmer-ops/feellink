import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ExploreService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  // Helper: Transform media URLs for mobile compatibility
  private transformMediaUrl(url: string): string {
    if (!url) return url;
    
    // If it's already a full URL with localhost, replace with BASE_URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const baseUrl = this.configService.get('BASE_URL');
      if (baseUrl && (url.includes('localhost') || url.includes('127.0.0.1'))) {
        try {
          const urlObj = new URL(url);
          // BASE_URL format: http://192.168.1.38:3001
          return `${baseUrl}${urlObj.pathname}${urlObj.search}`;
        } catch {
          return url;
        }
      }
      return url;
    }
    
    // Relative path (e.g., /uploads/image.png) - MUST use BASE_URL with port
    const baseUrl = this.configService.get('BASE_URL');
    if (!baseUrl) {
      // Fallback: Use backend port (3001) not MinIO port (9000)
      const backendPort = this.configService.get('PORT') || '3002';
      const endpoint = this.configService.get('MINIO_ENDPOINT') || 'localhost';
      const resolvedEndpoint = endpoint === 'localhost' || endpoint === '127.0.0.1' 
        ? '192.168.1.38' 
        : endpoint;
      const cleanPath = url.startsWith('/') ? url : `/${url}`;
      return `http://${resolvedEndpoint}:${backendPort}${cleanPath}`;
    }
    
    // BASE_URL format: http://192.168.1.38:3001 (port included)
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
    
    // Relative path - MUST use BASE_URL with port
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

  async getExplorePosts(userId: string | null, limit: number = 20, cursor?: string) {
    console.log('🔍 [EXPLORE] getExplorePosts called:', { userId, limit, cursor });
    
    // ✅ YENİ MANTIK: Hem takip ettiklerin hem de etmediklerin (HERKES)
    // Feed: Sadece takip ettiklerin
    // Explore: HERKES (takip edilen + edilmeyen)
    
    const where: any = userId
      ? (cursor
          ? {
              id: { lt: cursor },
              userId: { not: userId }, // Kendi postlarını hariç tut
              user: {
                isDeleted: { not: true }, // 🔒 Silinen kullanıcıları gizle
                accountStatus: { not: 'SUSPENDED' }, // 🔒 Askıya alınan kullanıcıları gizle
              },
            }
          : {
              userId: { not: userId }, // Kendi postlarını hariç tut
              user: {
                isDeleted: { not: true }, // 🔒 Silinen kullanıcıları gizle
                accountStatus: { not: 'SUSPENDED' }, // 🔒 Askıya alınan kullanıcıları gizle
              },
            })
      : (cursor
          ? {
              id: { lt: cursor },
              user: {
                isDeleted: { not: true }, // 🔒 Silinen kullanıcıları gizle
                accountStatus: { not: 'SUSPENDED' }, // 🔒 Askıya alınan kullanıcıları gizle
              },
            }
          : {
              user: {
                isDeleted: { not: true }, // 🔒 Silinen kullanıcıları gizle
                accountStatus: { not: 'SUSPENDED' }, // 🔒 Askıya alınan kullanıcıları gizle
              },
            });

    console.log('🔍 [EXPLORE] Query where clause:', JSON.stringify(where, null, 2));
    
    const posts = await this.prisma.post.findMany({
      where: {
        ...where,
        isDeleted: false, // 🗑️ Silinen postları gösterme
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
          take: 1, // Only first media for grid view
        },
        comments: {
          where: {
            parentId: null, // Only top-level comments
          },
          take: 6, // Get pinned comment + 5 recent comments for rotation
          include: {
            user: {
              select: {
                username: true,
                fullName: true,
              },
            },
          },
          orderBy: [
            { isPinned: 'desc' }, // Pinned comments first
            { createdAt: 'desc' }, // Then most recent
          ],
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
    
    console.log('✅ [EXPLORE] Query result:', {
      foundPosts: posts.length,
      limit,
      hasMore: posts.length > limit,
      firstPost: posts[0] ? { id: posts[0].id, userId: posts[0].userId, caption: posts[0].caption?.substring(0, 50) } : null,
    });

    const hasMore = posts.length > limit;
    const filteredPosts = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore && filteredPosts.length > 0
      ? filteredPosts[filteredPosts.length - 1].id
      : undefined;

    // Check if liked (only if userId is provided)
    const postIds = filteredPosts.map(p => p.id);
    const likes = userId
      ? await this.prisma.like.findMany({
          where: {
            postId: { in: postIds },
            userId,
          },
        })
      : [];

    const likedPostIds = new Set(likes.map(l => l.postId));

    return {
      posts: filteredPosts.map((post: any) => ({
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
        pinnedComment: post.comments && post.comments.length > 0 && post.comments[0].isPinned ? {
          user: post.comments[0].user.username || post.comments[0].user.fullName || 'Kullanıcı',
          text: post.comments[0].content,
        } : null,
        recentComments: post.comments
          ? post.comments
              .filter((c: any) => !c.isPinned) // Exclude pinned comments
              .slice(0, 5) // Max 5 comments for rotation
              .map((c: any) => ({
                id: c.id,
                content: c.content,
                isPinned: c.isPinned,
                createdAt: c.createdAt,
                user: {
                  username: c.user.username || c.user.fullName || 'Kullanıcı',
                },
              }))
          : [],
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

    // Check if liked (only if userId is provided)
    const postIds = filteredPosts.map(p => p.id);
    const likes = userId
      ? await this.prisma.like.findMany({
          where: {
            postId: { in: postIds },
            userId,
          },
        })
      : [];

    const likedPostIds = new Set(likes.map(l => l.postId));

    return {
      posts: filteredPosts.map(post => ({
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
}

