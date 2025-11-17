import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ensureRoleAssignment, computeCapabilities, getRoleOverview, getSidebarVisibility } from '../roles/roles.utils';
import { CapabilitySummary, SubscriptionPlanCode, RoleOverview, UserRoleCode } from '../roles/roles.types';
import { getDashboardSnapshot } from '../dashboard/dashboard.features';

type BadgeRoleCode = 'sanatsever' | 'kurumsal' | 'koleksiyoner' | 'sanatci';
type BadgeExtraCode = 'koleksiyoner-extra' | 'sanatci-extra';

const ROLE_BADGE_CODE_MAP: Record<UserRoleCode, BadgeRoleCode> = {
  art_lover: 'sanatsever',
  corporate: 'kurumsal',
  collector: 'koleksiyoner',
  artist: 'sanatci',
};

const EXTRA_BADGE_CODE_MAP: Record<string, BadgeExtraCode> = {
  collector: 'koleksiyoner-extra',
  koleksiyoner: 'koleksiyoner-extra',
  'koleksiyoner-extra': 'koleksiyoner-extra',
  koleksiyoner_extra: 'koleksiyoner-extra',
  collector_extra: 'koleksiyoner-extra',
  artist: 'sanatci-extra',
  sanatci: 'sanatci-extra',
  'sanatci-extra': 'sanatci-extra',
  sanatci_extra: 'sanatci-extra',
  artist_extra: 'sanatci-extra',
};

function mapExtrasForBadges(extras: string[] = []): BadgeExtraCode[] {
  const mapped = extras
    .map((extra) => EXTRA_BADGE_CODE_MAP[extra])
    .filter((extra): extra is BadgeExtraCode => Boolean(extra));
  return Array.from(new Set(mapped));
}

export function getBadgesFromSelection(
  roles: UserRoleCode[],
  plan: SubscriptionPlanCode | null,
  extras: string[] = [],
): string[] {
  const badgeRoles = roles.map((role) => ROLE_BADGE_CODE_MAP[role]).filter(Boolean);
  const extrasForBadges = mapExtrasForBadges(extras);
  const badges: string[] = [];

  if (badgeRoles.includes('sanatsever') && plan === 'PRO') {
    badges.push('sanatsever-pro');
  }

  if (badgeRoles.includes('kurumsal') && plan === 'PRO') {
    badges.push('kurumsal-pro');
  }

  if (badgeRoles.includes('koleksiyoner') && plan === 'ORI') {
    badges.push('koleksiyoner-ori');
  }

  if (badgeRoles.includes('koleksiyoner') && extrasForBadges.includes('koleksiyoner-extra')) {
    badges.push('koleksiyoner-extra');
  }

  if (badgeRoles.includes('sanatci') && plan === 'PRO') {
    badges.push('sanatci-pro');
  }

  if (badgeRoles.includes('sanatci') && extrasForBadges.includes('sanatci-extra')) {
    badges.push('sanatci-extra');
  }

  return Array.from(new Set(badges));
}

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async getProfile(username: string, currentUserId?: string) {
    // 🔥 KRİTİK: Username null/undefined/geçersiz kontrolü
    if (!username || username === 'undefined' || username === 'null' || username === '[object Object]') {
      throw new NotFoundException('Geçersiz kullanıcı adı.');
    }

    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        fullName: true,
        bio: true,
        avatar: true,
        roles: true,
        plan: true,
        badges: true,
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
      throw new NotFoundException('Kullanıcı bulunamadı. Lütfen kullanıcı adını kontrol edin.');
    }
    
    // 🔥 KRİTİK: User id null kontrolü (veritabanı hatası durumunda)
    if (!user.id) {
      throw new NotFoundException('Kullanıcı kimliği geçersiz. Lütfen destek ekibiyle iletişime geçin.');
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

    const badgeIds = Array.isArray(user.badges) ? (user.badges as string[]) : [];
    const capabilities = computeCapabilities(user.roles as string[], user.plan as SubscriptionPlanCode, badgeIds);

    const sidebar = getSidebarVisibility(capabilities);

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
      badges: badgeIds,
      capabilities,
      sidebar,
    };
  }

  async getSelf(userId: string) {
    // 🔥 KRİTİK: userId null/undefined kontrolü
    if (!userId) {
      throw new NotFoundException('Kullanıcı kimliği geçersiz.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        avatar: true,
        bio: true,
        roles: true,
        extras: true,
        plan: true,
        badges: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.');
    }
    
    // 🔥 KRİTİK: Username null kontrolü
    if (!user.username) {
      throw new NotFoundException('Kullanıcı adı bulunamadı. Lütfen profil bilgilerinizi güncelleyin.');
    }

    const normalizedRoles = ensureRoleAssignment((user.roles as string[]) ?? []) as UserRoleCode[];
    const plan = (user.plan as SubscriptionPlanCode) ?? 'FREE';
    const badgeIds = Array.isArray(user.badges) ? (user.badges as string[]) : [];
    const capabilities = computeCapabilities(normalizedRoles, plan, badgeIds);
    const dashboard = getDashboardSnapshot(normalizedRoles[0], plan);
    const sidebar = getSidebarVisibility(capabilities);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      avatar: user.avatar,
      bio: user.bio,
      roles: normalizedRoles,
      extras: (user.extras as string[]) ?? [],
      plan,
      badges: badgeIds,
      createdAt: user.createdAt,
      capabilities,
      sidebar,
      dashboard,
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

  async updateRoles(
    userId: string,
    payload: string[] | { roles?: string[]; plan?: SubscriptionPlanCode; extras?: string[] },
  ) {
    const input =
      Array.isArray(payload) ? { roles: payload } : payload ?? { roles: undefined, plan: undefined, extras: undefined };

    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: true,
        extras: true,
        plan: true,
        badges: true,
      },
    });

    if (!current) {
      throw new NotFoundException('User not found');
    }

    const normalizedRoles = ensureRoleAssignment(
      input.roles ?? ((current.roles as string[]) ?? []),
    ) as UserRoleCode[];

    const nextPlan = (input.plan ?? (current.plan as SubscriptionPlanCode) ?? 'FREE') as SubscriptionPlanCode;
    const extrasNormalized = Array.from(
      new Set(
        (input.extras ?? ((current.extras as string[]) ?? []))
          .filter((extra) => typeof extra === 'string')
          .map((extra) => extra.trim())
          .filter((extra) => extra.length > 0)
          .map((extra) => EXTRA_BADGE_CODE_MAP[extra] ?? extra),
      ),
    );

    const nextBadges = getBadgesFromSelection(normalizedRoles, nextPlan, extrasNormalized);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        roles: normalizedRoles,
        extras: extrasNormalized,
        plan: nextPlan,
        badges: nextBadges,
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        roles: true,
        extras: true,
        plan: true,
        badges: true,
      },
    });

    const capabilities = computeCapabilities(
      updatedUser.roles as string[],
      updatedUser.plan as SubscriptionPlanCode,
      (updatedUser.badges as string[]) ?? [],
    );
    const sidebar = getSidebarVisibility(capabilities);

    return {
      message: 'Rol ve plan bilgileri güncellendi',
      user: updatedUser,
      capabilities,
      sidebar,
    };
  }

  async getRoleCapabilities(userId: string): Promise<CapabilitySummary> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: true,
        plan: true,
        badges: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return computeCapabilities(
      (user.roles as string[]) ?? [],
      user.plan as SubscriptionPlanCode,
      (user.badges as string[]) ?? [],
    );
  }

  async updatePlan(userId: string, plan: SubscriptionPlanCode) {
    if (!['FREE', 'PRO', 'ORI'].includes(plan)) {
      throw new BadRequestException('Geçersiz plan seçimi');
    }

    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: true,
        extras: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const normalizedRoles = ensureRoleAssignment((existing.roles as string[]) ?? []) as UserRoleCode[];
    const extrasNormalized = Array.from(
      new Set(
        (Array.isArray(existing.extras) ? (existing.extras as string[]) : []).map(
          (extra) => EXTRA_BADGE_CODE_MAP[extra] ?? extra,
        ),
      ),
    );
    const nextBadges = getBadgesFromSelection(normalizedRoles, plan, extrasNormalized);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        plan,
        extras: extrasNormalized,
        badges: nextBadges,
      },
      select: {
        id: true,
        username: true,
        plan: true,
        roles: true,
        extras: true,
        badges: true,
      },
    });

    const capabilities = computeCapabilities(
      updatedUser.roles as string[],
      updatedUser.plan as SubscriptionPlanCode,
      (updatedUser.badges as string[]) ?? [],
    );
    const sidebar = getSidebarVisibility(capabilities);

    return {
      message: plan === 'PRO' ? 'Pro üyeliğe geçildi' : 'Free plana geri dönüldü',
      user: updatedUser,
      capabilities,
      sidebar,
    };
  }

  getRolesOverview(): RoleOverview {
    return getRoleOverview();
  }
}

