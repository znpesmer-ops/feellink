import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async getProfile(username: string, currentUserId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        fullName: true,
        bio: true,
        avatar: true,
        role: true,
        isPrivate: true,
        isVerified: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let isFollowing = false;
    let hasRequested = false;
    let isOwnProfile = false;

    if (currentUserId && currentUserId === user.id) {
      isOwnProfile = true;
    } else if (currentUserId) {
      // Check if blocked
      const isBlocked = await this.prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: currentUserId, blockedId: user.id },
            { blockerId: user.id, blockedId: currentUserId },
          ],
        },
      });

      if (isBlocked) {
        throw new ForbiddenException('Cannot access this profile');
      }

      // Check follow status
      const follow = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: user.id,
          },
        },
      });

      isFollowing = !!follow;

      // Check follow request
      const request = await this.prisma.followRequest.findUnique({
        where: {
          requesterId_requestedId: {
            requesterId: currentUserId,
            requestedId: user.id,
          },
        },
      });

      hasRequested = !!request;
    }

    // Get user posts - only show if public account, own profile, or following
    let posts = [];
    const canViewPosts =
      isOwnProfile ||
      !user.isPrivate ||
      isFollowing ||
      !currentUserId; // For non-authenticated users, show nothing

    if (canViewPosts) {
      posts = await this.prisma.post.findMany({
        where: { userId: user.id },
        include: {
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
        orderBy: { createdAt: 'desc' },
      });
    }

    // Calculate counts from relations - manual count for accuracy
    // followerCount = how many users follow this user (followingId = user.id)
    // followingCount = how many users this user follows (followerId = user.id)
    const [followerCount, followingCount] = await Promise.all([
      this.prisma.follow.count({
        where: { followingId: user.id },
      }),
      this.prisma.follow.count({
        where: { followerId: user.id },
      }),
    ]);

    return {
      ...user,
      isFollowing,
      hasRequested,
      isOwnProfile,
      posts,
      canViewPosts,
      followerCount,
      followingCount,
      // Keep _count for posts count
      _count: {
        posts: user._count.posts,
      },
    };
  }

  async updateProfile(
    userId: string,
    data: { fullName?: string; bio?: string; avatar?: string; isPrivate?: boolean }
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        bio: true,
        avatar: true,
        isPrivate: true,
        isVerified: true,
      },
    });
  }

  async searchUsers(query: string, currentUserId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { fullName: { contains: query, mode: 'insensitive' } },
            ],
          },
          { id: { not: currentUserId } },
        ],
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        avatar: true,
        isVerified: true,
      },
      take: 20,
    });

    // Avatar URL'lerini dönüştür (MinIO veya CDN)
    const getAvatarUrl = (avatar: string | null): string | null => {
      if (!avatar) return null;
      if (avatar.startsWith('http')) return avatar;
      
      // MinIO URL oluştur
      const minioEndpoint = this.configService.get('MINIO_ENDPOINT') || 'localhost';
      const minioPort = this.configService.get('MINIO_PORT') || '9000';
      const minioUseSSL = this.configService.get('MINIO_USE_SSL') === 'true';
      const minioBucket = this.configService.get('MINIO_BUCKET_NAME') || 'instagram-uploads';
      const protocol = minioUseSSL ? 'https' : 'http';
      
      // CDN_BASE_URL varsa onu kullan, yoksa MinIO URL'i oluştur
      const CDN_BASE = this.configService.get('CDN_BASE_URL');
      if (CDN_BASE) {
        return `${CDN_BASE}${avatar.startsWith('/') ? avatar : `/${avatar}`}`;
      }
      
      return `${protocol}://${minioEndpoint}:${minioPort}/${minioBucket}/${avatar}`;
    };

    return users.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      avatar: getAvatarUrl(u.avatar),
      avatarUrl: getAvatarUrl(u.avatar), // Geriye uyumluluk için
      isVerified: u.isVerified,
    }));
  }

  async getHighlights(userId: string) {
    // Get users that the current user follows who have active stories
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = following.map(f => f.followingId);

    // Get users with active stories
    const usersWithStories = await this.prisma.user.findMany({
      where: {
        id: { in: followingIds },
        stories: {
          some: {
            expiresAt: { gt: new Date() },
          },
        },
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        avatar: true,
        isVerified: true,
      },
      take: 20,
    });

    // If no stories, return active users (online) from following list
    if (usersWithStories.length === 0) {
      const activeUsers = await this.prisma.user.findMany({
        where: {
          id: { in: followingIds },
          isOnline: true,
        },
        select: {
          id: true,
          username: true,
          fullName: true,
          avatar: true,
          isVerified: true,
        },
        take: 10,
      });

      return activeUsers;
    }

    return usersWithStories;
  }
}

