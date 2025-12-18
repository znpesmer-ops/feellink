import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ensureRoleAssignment, computeCapabilities, getRoleOverview, getSidebarVisibility } from '../roles/roles.utils';
import { CapabilitySummary, SubscriptionPlanCode, RoleOverview, UserRoleCode } from '../roles/roles.types';
import { getDashboardSnapshot } from '../dashboard/dashboard.features';
import { UpdateUserDto } from './dto/update-user.dto';

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

  // Plan kontrolü kaldırıldı - artık sadece rol bazlı badge'ler
  // Tüm roller için badge'ler otomatik olarak ekleniyor
  if (badgeRoles.includes('sanatsever')) {
    badges.push('sanatsever-pro');
  }

  if (badgeRoles.includes('kurumsal')) {
    badges.push('kurumsal-pro');
  }

  if (badgeRoles.includes('koleksiyoner')) {
    badges.push('koleksiyoner-ori');
  }

  if (badgeRoles.includes('koleksiyoner') && extrasForBadges.includes('koleksiyoner-extra')) {
    badges.push('koleksiyoner-extra');
  }

  if (badgeRoles.includes('sanatci')) {
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
    try {
      // 🔥 KRİTİK: Username null/undefined/geçersiz kontrolü
      if (!username || username === 'undefined' || username === 'null' || username === '[object Object]') {
        throw new NotFoundException('Geçersiz kullanıcı adı.');
      }

      // Hem username hem id ile arama yap (Instagram mantığı)
      const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { id: username }
        ]
      },
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
    const plan: SubscriptionPlanCode = (user.plan as SubscriptionPlanCode) ?? 'FREE';
    const capabilities = computeCapabilities(user.roles as string[], plan, badgeIds);

    const sidebar = getSidebarVisibility(capabilities);

    // Transform avatar URL for mobile compatibility
    const transformAvatarUrl = (avatar: string | null): string | null => {
      if (!avatar) return null;
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
      const baseUrl = this.configService.get('BASE_URL');
      if (baseUrl) {
        const cleanPath = avatar.startsWith('/') ? avatar : `/${avatar}`;
        return `${baseUrl}${cleanPath}`;
      }
      const backendPort = this.configService.get('PORT') || '3002';
      const endpoint = this.configService.get('MINIO_ENDPOINT') || 'localhost';
      const resolvedEndpoint = endpoint === 'localhost' || endpoint === '127.0.0.1' 
        ? '192.168.1.38' 
        : endpoint;
      const cleanPath = avatar.startsWith('/') ? avatar : `/${avatar}`;
      return `http://${resolvedEndpoint}:${backendPort}${cleanPath}`;
    };

    // Transform post media URLs
    const transformedPosts = posts.map((post: any) => ({
      ...post,
      media: post.media?.map((m: any) => {
        if (!m.url) return m;
        if (m.url.startsWith('http://') || m.url.startsWith('https://')) {
          const baseUrl = this.configService.get('BASE_URL');
          if (baseUrl && (m.url.includes('localhost') || m.url.includes('127.0.0.1'))) {
            try {
              const urlObj = new URL(m.url);
              return { ...m, url: `${baseUrl}${urlObj.pathname}${urlObj.search}` };
            } catch {
              return m;
            }
          }
          return m;
        }
        const baseUrl = this.configService.get('BASE_URL');
        if (baseUrl) {
          const cleanPath = m.url.startsWith('/') ? m.url : `/${m.url}`;
          return { ...m, url: `${baseUrl}${cleanPath}` };
        }
        const backendPort = this.configService.get('PORT') || '3002';
        const endpoint = this.configService.get('MINIO_ENDPOINT') || 'localhost';
        const resolvedEndpoint = endpoint === 'localhost' || endpoint === '127.0.0.1' 
          ? '192.168.1.38' 
          : endpoint;
        const cleanPath = m.url.startsWith('/') ? m.url : `/${m.url}`;
        return { ...m, url: `http://${resolvedEndpoint}:${backendPort}${cleanPath}` };
      }) || [],
    }));

    return {
      ...user,
      avatar: transformAvatarUrl(user.avatar),
      isFollowing,
      hasRequested,
      isOwnProfile,
      posts: transformedPosts,
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
    } catch (error) {
      // HttpException ise olduğu gibi fırlat
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      // Prisma veya diğer hatalar için
      console.error('getProfile error:', error);
      throw new NotFoundException('Profil yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  }

  async getSelf(userId: string) {
    try {
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
        website: true,
        roles: true,
        extras: true,
        plan: true,
        badges: true,
        createdAt: true,
        usernameLastChangedAt: true,
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

    // Transform avatar URL for mobile compatibility
    const transformAvatarUrl = (avatar: string | null): string | null => {
      if (!avatar) return null;
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
      const baseUrl = this.configService.get('BASE_URL');
      if (baseUrl) {
        const cleanPath = avatar.startsWith('/') ? avatar : `/${avatar}`;
        return `${baseUrl}${cleanPath}`;
      }
      const backendPort = this.configService.get('PORT') || '3002';
      const endpoint = this.configService.get('MINIO_ENDPOINT') || 'localhost';
      const resolvedEndpoint = endpoint === 'localhost' || endpoint === '127.0.0.1' 
        ? '192.168.1.38' 
        : endpoint;
      const cleanPath = avatar.startsWith('/') ? avatar : `/${avatar}`;
      return `http://${resolvedEndpoint}:${backendPort}${cleanPath}`;
    };

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      avatar: transformAvatarUrl(user.avatar),
      bio: user.bio,
      website: user.website,
      roles: normalizedRoles,
      extras: (user.extras as string[]) ?? [],
      plan,
      badges: badgeIds,
      createdAt: user.createdAt,
      usernameLastChangedAt: user.usernameLastChangedAt,
      capabilities,
      sidebar,
      dashboard,
    };
    } catch (error) {
      // HttpException ise olduğu gibi fırlat
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Prisma veya diğer hatalar için
      console.error('getSelf error:', error);
      throw new NotFoundException('Kullanıcı bilgileri yüklenirken bir hata oluştu. Lütfen tekrar giriş yapın.');
    }
  }

  async updateProfile(
    userId: string,
    data: UpdateUserDto
  ): Promise<any> {
    // Get current user data
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        fullName: true,
        usernameLastChangedAt: true,
        nameLastChangedAt: true,
      },
    });

    if (!currentUser) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    const updateData: any = { ...data };

    // Convert empty website string to null
    if (updateData.website === '' || updateData.website === undefined) {
      updateData.website = null;
    }

    // Check 14-day rule for username
    if (data.username && data.username !== currentUser.username) {
      if (currentUser.usernameLastChangedAt) {
        const diffDays = (Date.now() - currentUser.usernameLastChangedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays < 14) {
          const remainingDays = Math.ceil(14 - diffDays);
          throw new BadRequestException(
            `Kullanıcı adını yalnızca 14 günde bir değiştirebilirsiniz. Kalan süre: ${remainingDays} gün`
          );
        }
      }
      updateData.usernameLastChangedAt = new Date();
    }

    // Check 14-day rule for fullName
    if (data.fullName && data.fullName !== currentUser.fullName) {
      if (currentUser.nameLastChangedAt) {
        const diffDays = (Date.now() - currentUser.nameLastChangedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays < 14) {
          const remainingDays = Math.ceil(14 - diffDays);
          throw new BadRequestException(
            `Ad Soyad'ı yalnızca 14 günde bir değiştirebilirsiniz. Kalan süre: ${remainingDays} gün`
          );
        }
      }
      updateData.nameLastChangedAt = new Date();
    }

    // Check username uniqueness if changing
    if (data.username && data.username !== currentUser.username) {
      const existingUser = await this.prisma.user.findUnique({
        where: { username: data.username },
      });
      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException('Bu kullanıcı adı zaten kullanılıyor.');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        bio: true,
        avatar: true,
        isPrivate: true,
        isVerified: true,
        website: true,
      },
    });
  }

  async searchUsers(query: string, currentUserId: string) {
    // ✅ Engellenen kullanıcıları bul
    const blockedUserIds = await this.prisma.block.findMany({
      where: {
        OR: [
          { blockerId: currentUserId },
          { blockedId: currentUserId },
        ],
      },
      select: {
        blockerId: true,
        blockedId: true,
      },
    });

    // Engellenen kullanıcı ID'lerini topla
    const excludedUserIds = new Set<string>();
    blockedUserIds.forEach((block) => {
      if (block.blockerId === currentUserId) {
        excludedUserIds.add(block.blockedId);
      } else {
        excludedUserIds.add(block.blockerId);
      }
    });
    excludedUserIds.add(currentUserId);

    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { fullName: { contains: query, mode: 'insensitive' } },
            ],
          },
          { id: { notIn: Array.from(excludedUserIds) } },
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
      if (baseUrl) {
        const cleanPath = avatar.startsWith('/') ? avatar : `/${avatar}`;
        return `${baseUrl}${cleanPath}`;
      }
      
      // Fallback: Use backend port (3001) NOT MinIO port (9000)
      const backendPort = this.configService.get('PORT') || '3002';
      const endpoint = this.configService.get('MINIO_ENDPOINT') || 'localhost';
      const resolvedEndpoint = endpoint === 'localhost' || endpoint === '127.0.0.1' 
        ? '192.168.1.38' 
        : endpoint;
      const cleanPath = avatar.startsWith('/') ? avatar : `/${avatar}`;
      return `http://${resolvedEndpoint}:${backendPort}${cleanPath}`;
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

    // nextPlan zaten null-safe olarak tanımlı, updatedUser.plan ile aynı olmalı
    const userPlan: SubscriptionPlanCode = (updatedUser.plan as SubscriptionPlanCode) ?? nextPlan;
    const capabilities = computeCapabilities(
      updatedUser.roles as string[],
      userPlan,
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

    const plan: SubscriptionPlanCode = (user.plan as SubscriptionPlanCode) ?? 'FREE';
    return computeCapabilities(
      (user.roles as string[]) ?? [],
      plan,
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

    // updatedUser.plan zaten parametre olarak gelen plan ile set edildi, null olamaz
    const userPlan: SubscriptionPlanCode = (updatedUser.plan as SubscriptionPlanCode) ?? plan;
    const capabilities = computeCapabilities(
      updatedUser.roles as string[],
      userPlan,
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

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new BadRequestException('Kendinizi engelleyemezsiniz.');
    }

    const blockedUser = await this.prisma.user.findUnique({
      where: { id: blockedId },
    });

    if (!blockedUser) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    // Zaten engellenmiş mi kontrol et
    const existingBlock = await this.prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });

    if (existingBlock) {
      throw new BadRequestException('Bu kullanıcı zaten engellenmiş.');
    }

    // ✅ Engelleme kaydı oluştur
    await this.prisma.block.create({
      data: {
        blockerId,
        blockedId,
      },
    });

    // ✅ Instagram mantığı: Engelleme sırasında tüm takip ilişkilerini sil
    // 1. blockerId → blockedId takip ilişkisini sil (engelleyen, engelleneni takip ediyorsa)
    await this.prisma.follow.deleteMany({
      where: {
        followerId: blockerId,
        followingId: blockedId,
      },
    });

    // 2. blockedId → blockerId takip ilişkisini sil (engellenen, engelleyeni takip ediyorsa)
    await this.prisma.follow.deleteMany({
      where: {
        followerId: blockedId,
        followingId: blockerId,
      },
    });

    // ✅ Takip isteklerini de sil (eğer varsa)
    await this.prisma.followRequest.deleteMany({
      where: {
        OR: [
          { requesterId: blockerId, requestedId: blockedId },
          { requesterId: blockedId, requestedId: blockerId },
        ],
      },
    });

    // ✅ Follower/Following sayılarını güncelle
    const [blockerFollowingCount, blockedFollowerCount] = await Promise.all([
      this.prisma.follow.count({
        where: { followerId: blockerId },
      }),
      this.prisma.follow.count({
        where: { followingId: blockedId },
      }),
    ]);

    await Promise.all([
      this.prisma.user.update({
        where: { id: blockerId },
        data: { followingCount: blockerFollowingCount },
      }),
      this.prisma.user.update({
        where: { id: blockedId },
        data: { followerCount: blockedFollowerCount },
      }),
    ]);

    return { message: 'Kullanıcı başarıyla engellendi.' };
  }

  async unblockUser(blockerId: string, blockedId: string) {
    const block = await this.prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });

    if (!block) {
      throw new NotFoundException('Bu kullanıcı engellenmemiş.');
    }

    await this.prisma.block.delete({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });

    return { message: 'Engel başarıyla kaldırıldı.' };
  }

  async getBlockedUsers(blockerId: string) {
    const blocks = await this.prisma.block.findMany({
      where: { blockerId },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
            isVerified: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return blocks.map((block) => ({
      id: block.blocked.id,
      username: block.blocked.username,
      fullName: block.blocked.fullName,
      avatar: block.blocked.avatar,
      isVerified: block.blocked.isVerified,
      blockedAt: block.createdAt,
    }));
  }

  async deleteAccount(userId: string) {
    // 🔥 KRİTİK: Kullanıcının var olduğunu kontrol et
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    // 🔥 KRİTİK: Transaction ile tüm ilişkili verileri sil
    // Prisma schema'da çoğu ilişki onDelete: Cascade ile tanımlı,
    // ancak bazı manuel silmeler gerekebilir
    await this.prisma.$transaction(async (tx) => {
      // User'ı sil - CASCADE ile ilişkili tüm veriler otomatik silinir
      await tx.user.delete({
        where: { id: userId },
      });
    });

    return { message: 'Hesap başarıyla silindi.' };
  }

  async getSavedArtworks(userId: string) {
    const savedArtworks = await this.prisma.savedArtwork.findMany({
      where: { userId },
      include: {
        post: {
          where: {
            type: 'artwork',
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
            _count: {
              select: {
                likes: true,
                comments: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter out null posts (in case artwork was deleted)
    const validArtworks = savedArtworks.filter(sa => sa.post !== null);

    // Check if liked
    const postIds = validArtworks.map(sa => sa.postId);
    const likes = await this.prisma.like.findMany({
      where: {
        postId: { in: postIds },
        userId,
      },
    });

    const likedPostIds = new Set(likes.map(l => l.postId));

    return validArtworks.map(savedArtwork => ({
      ...savedArtwork.post,
      isLiked: likedPostIds.has(savedArtwork.postId),
      savedAt: savedArtwork.createdAt,
    }));
  }

  async getSaved(userId: string) {
    // Fetch both saved posts and saved artworks
    const [savedPosts, savedArtworks] = await Promise.all([
      this.prisma.savedPost.findMany({
        where: { userId },
        include: {
          post: {
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
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.savedArtwork.findMany({
        where: { userId },
        include: {
          post: {
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
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Filter out null posts (in case post/artwork was deleted)
    const validPosts = savedPosts.filter(sp => sp.post !== null);
    // Filter artworks: only include posts with type === 'artwork'
    const validArtworks = savedArtworks.filter(sa => sa.post !== null && sa.post.type === 'artwork');

    // Get all post IDs for like check
    const allPostIds = [
      ...validPosts.map(sp => sp.postId),
      ...validArtworks.map(sa => sa.postId),
    ];

    // Check if liked
    const likes = await this.prisma.like.findMany({
      where: {
        postId: { in: allPostIds },
        userId,
      },
    });

    const likedPostIds = new Set(likes.map(l => l.postId));

    // Combine and format both types
    const savedItems = [
      ...validPosts.map(savedPost => ({
        type: 'post' as const,
        ...savedPost.post,
        isLiked: likedPostIds.has(savedPost.postId),
        savedAt: savedPost.createdAt,
      })),
      ...validArtworks.map(savedArtwork => ({
        type: 'artwork' as const,
        ...savedArtwork.post,
        isLiked: likedPostIds.has(savedArtwork.postId),
        savedAt: savedArtwork.createdAt,
      })),
    ];

    // Sort by savedAt (most recent first)
    return savedItems.sort((a, b) => {
      const aDate = new Date(a.savedAt).getTime();
      const bDate = new Date(b.savedAt).getTime();
      return bDate - aDate;
    });
  }
}

