import { Injectable, NotFoundException, ForbiddenException, BadRequestException, InternalServerErrorException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ensureRoleAssignment, computeCapabilities, getRoleOverview, getSidebarVisibility } from '../roles/roles.utils';
import { CapabilitySummary, SubscriptionPlanCode, RoleOverview, UserRoleCode } from '../roles/roles.types';
import { getDashboardSnapshot } from '../dashboard/dashboard.features';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileGridOrderDto } from './dto/update-profile-grid-order.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { isValidTürkiyeCity } from '../constants/cities.tr';
import { NotificationsService } from '../notifications/notifications.service';

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

// Feature Flags
const SMS_VERIFICATION_ENABLED = false; // SMS doğrulama özelliği kapalı

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  async getProfile(username: string, currentUserId?: string) {
    try {
      // 🔥 KRİTİK: Username null/undefined/geçersiz kontrolü
      if (!username || username === 'undefined' || username === 'null' || username === '[object Object]') {
        throw new NotFoundException('Geçersiz kullanıcı adı.');
      }
      
      console.log('[getProfile] Starting profile lookup for:', username);

      let user = null;

      {
        // PostgreSQL: mode: 'insensitive' natively çalışır — tüm kullanıcıları çekmeye gerek yok
        user = await this.prisma.user.findFirst({
          where: {
            username: { equals: username, mode: 'insensitive' },
            isDeleted: false,
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
            isAdmin: true,
            createdAt: true,
            profileCompleted: true,
            dateOfBirth: true,
            country: true,
            city: true,
            gender: true,
            showProfileColorSignature: true,
            isDeleted: true,
            profilePostOrder: true,
            profileArtworkOrder: true,
            _count: {
              select: {
                posts: true,
                followers: true,
                following: true,
              },
            },
          },
        });
      }

      if (!user) {
        throw new NotFoundException('Kullanıcı bulunamadı. Lütfen kullanıcı adını kontrol edin.');
      }

      // 🗑️ Silinmiş kullanıcı profili döndürme (DB'de alan eksik/undefined olanlar dahil edilir)
      if (user.isDeleted === true) {
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
    // ✅ NOT: getProfile endpoint'inden gelen posts artık kullanılmıyor
    // Frontend'de /posts/user/:userId?type=post veya /posts/user/:userId?type=artwork kullanılıyor
    // Bu yüzden burada posts array'ini boş bırakıyoruz (geriye dönük uyumluluk için)
    let posts = [];
    const canViewPosts =
      isOwnProfile ||
      !user.isPrivate ||
      isFollowing ||
      !currentUserId; // For non-authenticated users, show nothing

    // Calculate counts from relations - manual count for accuracy
    // followerCount = how many users follow this user (followingId = user.id)
    // followingCount = how many users this user follows (followerId = user.id)
    // postsCount = active posts (not deleted)
    const [followerCount, followingCount, postsCount] = await Promise.all([
      this.prisma.follow.count({
        where: { followingId: user.id },
      }),
      this.prisma.follow.count({
        where: { followerId: user.id },
      }),
      this.prisma.post.count({
        where: { 
          userId: user.id,
          isDeleted: false, // 🗑️ Only count active posts
        },
      }),
    ]);

    const badgeIds = Array.isArray(user.badges) ? (user.badges as string[]) : [];
    const plan: SubscriptionPlanCode = (user.plan as SubscriptionPlanCode) ?? 'FREE';
    const capabilities = computeCapabilities(user.roles as string[], plan, badgeIds);

    const sidebar = getSidebarVisibility(capabilities);

    // ✅ Aktif rolü hesapla (öncelik sırasına göre)
    const getActiveRole = (roles: string[], isAdmin: boolean): string | null => {
      console.log('[getProfile] getActiveRole called with:', { roles, isAdmin });
      if (isAdmin) {
        console.log('[getProfile] User is admin, returning "Admin"');
        return 'Admin';
      }
      if (!roles || roles.length === 0) {
        console.log('[getProfile] No roles found, returning null');
        return null;
      }
      
      // Öncelik sırası: corporate > collector > artist > art_lover
      const rolePriority: Record<string, number> = {
        corporate: 1,
        collector: 2,
        artist: 3,
        art_lover: 4,
      };
      
      const sortedRoles = roles
        .filter((r) => rolePriority[r] !== undefined)
        .sort((a, b) => rolePriority[a] - rolePriority[b]);
      
      console.log('[getProfile] Sorted roles:', sortedRoles);
      
      if (sortedRoles.length === 0) {
        console.log('[getProfile] No valid roles after filtering, returning null');
        return null;
      }
      
      const activeRoleCode = sortedRoles[0];
      const roleLabels: Record<string, string> = {
        art_lover: 'Sanatsever',
        corporate: 'Kurum',
        collector: 'Koleksiyoner',
        artist: 'Sanatçı',
      };
      
      const result = roleLabels[activeRoleCode] || null;
      console.log('[getProfile] Active role result:', result);
      return result;
    };

    // ✅ KRİTİK: isAdmin'i garantile (undefined ise false)
    const userIsAdmin = user.isAdmin === true;
    const activeRole = getActiveRole(user.roles as string[], userIsAdmin);
    console.log('[getProfile] Final activeRole:', activeRole, 'for user:', {
      roles: user.roles,
      isAdmin: user.isAdmin,
      userIsAdmin,
    });

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

    // ✅ KRİTİK: isAdmin'i garantile (undefined ise false) - zaten yukarıda tanımlanmış
    console.log('[getProfile] User isAdmin check:', { 
      isAdmin: user.isAdmin, 
      userIsAdmin,
      roles: user.roles,
      activeRole 
    });

    const { isDeleted: _omit, ...userSafe } = user as typeof user & { isDeleted?: boolean };
    return {
      ...userSafe,
      isAdmin: userIsAdmin, // ✅ isAdmin'i garantile (undefined ise false)
      avatar: transformAvatarUrl(user.avatar),
      isFollowing,
      hasRequested,
      isOwnProfile,
      posts: transformedPosts,
      canViewPosts,
      followerCount,
      followingCount,
      // Keep _count for posts count - use manually calculated count
      _count: {
        posts: postsCount, // 🗑️ Manuel hesaplanan active post sayısı
      },
      badges: badgeIds,
      capabilities,
      sidebar,
      // 🔒 KRİTİK: Profil bilgileri response'a ekleniyor
      dateOfBirth: user.dateOfBirth,
      country: user.country,
      city: user.city,
      gender: user.gender,
      profileCompleted: user.profileCompleted,
      // ✅ Aktif rol (profil header'da gösterilecek)
      activeRole: activeRole || null, // ✅ null ise null döndür (undefined değil)
      // 🎨 Profil renk imzası göster/gizle flag'i
      showProfileColorSignature: user.showProfileColorSignature ?? true, // Default: true (geriye dönük uyumluluk)
      profilePostOrder: user.profilePostOrder ?? [],
      profileArtworkOrder: user.profileArtworkOrder ?? [],
    };
    } catch (error) {
      // HttpException ise olduğu gibi fırlat
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      // Prisma veya diğer hatalar için
      console.error('❌ [getProfile] Error:', error);
      console.error('❌ [getProfile] Error details:', {
        message: error?.message,
        stack: error?.stack,
        username: username,
        currentUserId: currentUserId,
        errorName: error?.constructor?.name,
      });
      // Daha detaylı hata mesajı
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      console.error('❌ [getProfile] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      throw new NotFoundException(`Profil yüklenirken bir hata oluştu: ${errorMessage}. Lütfen tekrar deneyin.`);
    }
  }

  private async sanitizeProfileGridOrder(
    userId: string,
    raw: string[] | undefined,
    slot: 'post' | 'artwork',
  ): Promise<string[]> {
    if (!raw || !Array.isArray(raw)) return [];
    const MAX = 500;
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const id of raw) {
      if (typeof id !== 'string' || !id.trim()) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      unique.push(id);
      if (unique.length >= MAX) break;
    }
    if (unique.length === 0) return [];

    const typeWhere =
      slot === 'artwork'
        ? { type: 'artwork' as const }
        : { NOT: { type: 'artwork' } };

    const validRows = await this.prisma.post.findMany({
      where: {
        userId,
        isDeleted: false,
        id: { in: unique },
        ...typeWhere,
      },
      select: { id: true },
    });
    const validSet = new Set(validRows.map((p) => p.id));
    return unique.filter((id) => validSet.has(id));
  }

  async updateProfileGridOrder(userId: string, dto: UpdateProfileGridOrderDto) {
    if (!userId) {
      throw new BadRequestException('Kullanıcı kimliği geçersiz.');
    }
    const hasPost = dto.postOrder !== undefined;
    const hasArt = dto.artworkOrder !== undefined;
    if (!hasPost && !hasArt) {
      throw new BadRequestException('postOrder veya artworkOrder alanlarından en az biri gönderilmelidir.');
    }

    const data: { profilePostOrder?: string[]; profileArtworkOrder?: string[] } = {};
    if (hasPost) {
      data.profilePostOrder = await this.sanitizeProfileGridOrder(userId, dto.postOrder, 'post');
    }
    if (hasArt) {
      data.profileArtworkOrder = await this.sanitizeProfileGridOrder(userId, dto.artworkOrder, 'artwork');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { profilePostOrder: true, profileArtworkOrder: true },
    });
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
        profileCompleted: true,
        dateOfBirth: true,
        country: true,
        city: true,
        gender: true,
        phoneNumber: true,
        phoneVerified: true,
        accountStatus: true, // 🔒 Hesap durumu
        suspendedUntil: true, // 🔒 Askıya alma bitiş tarihi
        suspensionReason: true, // 🔒 Askıya alma nedeni
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

    // 🔔 Profil eksikse bildirim oluştur (kullanıcıyı kilitlemeden)
    // 🔥 KRİTİK: profileCompleted kontrolü MUTLAKA yapılmalı (tek otorite)
    const hasRequiredFields = user.dateOfBirth && user.country && user.city && user.gender;
    const isProfileCompleted = user.profileCompleted === true || hasRequiredFields;
    
    // Sadece profil tamamlanmamışsa bildirim oluştur
    if (!isProfileCompleted) {
      // Mevcut "profile_incomplete" bildirimi var mı kontrol et (isRead durumuna bakılmaz - kalıcı bildirim)
      const existingNotification = await this.prisma.notification.findFirst({
        where: {
          userId: user.id,
          type: 'profile_incomplete',
        },
      });

      // Yoksa yeni bildirim oluştur
      if (!existingNotification) {
        try {
          await this.notificationsService.createNotification({
            userId: user.id,
            type: 'profile_incomplete',
            message: 'Profil bilgilerini tamamladığında Feellink deneyimin çok daha güçlü hale gelir.',
            targetPath: '/settings',
            targetUrl: '/settings',
          });
        } catch (notifError) {
          // Bildirim oluşturma hatası kritik değil, logla
          console.warn('[UsersService] Failed to create profile_incomplete notification:', notifError);
        }
      }
    } else {
      // 🔥 Profil tamamlandıysa mevcut bildirimleri sil (kalıcı çözüm)
      try {
        await this.prisma.notification.deleteMany({
          where: {
            userId: user.id,
            type: 'profile_incomplete',
          },
        });
      } catch (notifError) {
        console.warn('[UsersService] Failed to delete profile_incomplete notifications:', notifError);
      }
    }

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
      phoneNumber: user.phoneNumber,
      phoneVerified: user.phoneVerified,
      profileCompleted: user.profileCompleted,
      dateOfBirth: user.dateOfBirth,
      country: user.country,
      city: user.city,
      gender: user.gender,
      accountStatus: user.accountStatus, // 🔒 Hesap durumu
      suspendedUntil: user.suspendedUntil, // 🔒 Askıya alma bitiş tarihi
      suspensionReason: user.suspensionReason, // 🔒 Askıya alma nedeni
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

  async updateUsername(userId: string, newUsername: string) {
    // 🔒 KRİTİK: Kullanıcıyı bul ve usernameLastChangedAt kontrolü yap
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        usernameLastChangedAt: true,
      },
    });

    if (!currentUser) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    // 🔒 14 günlük limit kontrolü
    if (currentUser.usernameLastChangedAt) {
      const now = new Date();
      const lastChanged = currentUser.usernameLastChangedAt;
      const diffInDays = (now.getTime() - lastChanged.getTime()) / (1000 * 60 * 60 * 24);

      if (diffInDays < 14) {
        const remainingDays = Math.ceil(14 - diffInDays);
        throw new BadRequestException(
          `Kullanıcı adını yalnızca 14 günde bir değiştirebilirsiniz. Kalan süre: ${remainingDays} gün`
        );
      }
    }

    // 🔒 Username uniqueness kontrolü
    const normalizedNewUsername = newUsername.toLowerCase().trim();
    
    // ✅ Mevcut username ile aynıysa değişiklik yok, direkt return et
    if (currentUser.username.toLowerCase().trim() === normalizedNewUsername) {
      return {
        id: currentUser.id,
        username: currentUser.username,
        usernameLastChangedAt: currentUser.usernameLastChangedAt,
      };
    }
    
    // ✅ MongoDB için case-insensitive arama (mode: 'insensitive' MongoDB'de çalışmaz)
    // Tüm kullanıcıları çek ve JavaScript'te filtrele
    const allUsers = await this.prisma.user.findMany({
      where: {
        id: { not: userId },
      },
      select: {
        id: true,
        username: true,
      },
    });
    
    // Case-insensitive kontrol
    const existingUser = allUsers.find(
      (u) => u.username?.toLowerCase().trim() === normalizedNewUsername
    );

    if (existingUser) {
      throw new BadRequestException('Bu kullanıcı adı zaten kullanılıyor.');
    }

    // ✅ Username güncelle
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        username: normalizedNewUsername,
        usernameLastChangedAt: new Date(),
      },
      select: {
        id: true,
        username: true,
        usernameLastChangedAt: true,
        email: true,
        fullName: true,
        avatar: true,
        bio: true,
        roles: true,
        plan: true,
        badges: true,
        isPrivate: true,
        isVerified: true,
        profileCompleted: true,
        dateOfBirth: true,
        country: true,
        city: true,
        gender: true,
        website: true,
      },
    });

    console.log('✅ [updateUsername] Username güncellendi:', {
      userId,
      oldUsername: currentUser.username,
      newUsername: normalizedNewUsername,
      updatedUser: updatedUser.username,
    });

    return updatedUser;
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

    // 🔒 DEBUG: Update data'yı logla
    console.log('[updateProfile] UPDATE DATA:', JSON.stringify(updateData, null, 2));

    // 🔒 KRİTİK: Username ASLA güncellenmez - profil URL'ini korumak için
    // Username değişikliği ayrı bir endpoint'te yapılmalı (gelecekte)
    delete updateData.username; // Username'i updateData'dan tamamen kaldır
    delete updateData.coverImage; // coverImage DB'de henüz yok, migration gerekiyor

    // Convert empty website string to null
    if (updateData.website === '' || updateData.website === undefined) {
      updateData.website = null;
    }

    // Convert dateOfBirth string to Date if provided
    if (updateData.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    }

    // 🔒 Şehir validasyonu (Türkiye için)
    if (updateData.city && updateData.country === 'TR') {
      if (!isValidTürkiyeCity(updateData.city)) {
        throw new BadRequestException('Geçersiz şehir adı. Lütfen geçerli bir Türkiye ili seçin.');
      }
    }

    // 🔒 KRİTİK: Username güncelleme kontrolü kaldırıldı - username ASLA güncellenmez

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

    // 🔒 KRİTİK: Username uniqueness kontrolü kaldırıldı - username ASLA güncellenmez

    // Eğer phoneNumber güncelleniyorsa, phoneVerified'i false yap
    let devModeCode: string | null = null;
    if (data.phoneNumber !== undefined && data.phoneNumber !== null) {
      // SMS doğrulama kapalıysa telefon numarası güncellemesini reddet
      if (!SMS_VERIFICATION_ENABLED) {
        throw new BadRequestException('SMS doğrulama özelliği şu anda kapalıdır.');
      }
      
      // Telefon numarasını temizle (sadece rakamlar ve +)
      const cleanedPhone = data.phoneNumber.replace(/\s/g, '').replace(/[()-]/g, '');
      updateData.phoneNumber = cleanedPhone;
      updateData.phoneVerified = false; // Yeni numara doğrulanmamış
      
      // SMS kodu oluştur ve gönder
      devModeCode = await this.sendPhoneVerificationCode(userId, cleanedPhone);
    }

    // 🔥 KRİTİK: profileCompleted her update'te tekrar hesaplanmalı (garantili)
    // Mevcut kullanıcıyı kontrol et (güncellemeden önce)
    const currentUserData = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { dateOfBirth: true, country: true, city: true, gender: true },
    });
    
    // Güncellenmiş verilerle birlikte kontrol et (updateData + mevcut data)
    const finalDateOfBirth = updateData.dateOfBirth !== undefined ? updateData.dateOfBirth : currentUserData?.dateOfBirth;
    const finalCountry = updateData.country !== undefined ? updateData.country : currentUserData?.country;
    const finalCity = updateData.city !== undefined ? updateData.city : currentUserData?.city;
    const finalGender = updateData.gender !== undefined ? updateData.gender : currentUserData?.gender;
    
    // 🔥 HER UPDATE'TE profileCompleted hesaplanır (true veya false)
    const allRequiredFieldsPresent = Boolean(finalDateOfBirth && finalCountry && finalCity && finalGender);
    updateData.profileCompleted = allRequiredFieldsPresent;

    const updatedUser = await this.prisma.user.update({
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
        profileCompleted: true,
        phoneNumber: true,
        phoneVerified: true,
        dateOfBirth: true,
        country: true,
        city: true,
        gender: true,
        showProfileColorSignature: true, // 🎨 Profil renk imzası göster/gizle
      },
    });

    // 🔒 DEBUG: Updated user'ı logla
    console.log('[updateProfile] UPDATED USER:', JSON.stringify(updatedUser, null, 2));
    console.log('[updateProfile] USERNAME FROM DB:', updatedUser.username);
    console.log('[updateProfile] PROFILE COMPLETED:', updatedUser.profileCompleted);

    // 🔔 Zorunlu alanlar tamamlandıysa bildirimi sil (kalıcı çözüm)
    if (allRequiredFieldsPresent) {
      try {
        // "profile_incomplete" bildirimlerini sil (kalıcı çözüm)
        await this.prisma.notification.deleteMany({
          where: {
            userId: userId,
            type: 'profile_incomplete',
          },
        });
        console.log('[updateProfile] ✅ Profile completed - deleted profile_incomplete notifications');
      } catch (notifError) {
        console.warn('[UsersService] Failed to delete profile_incomplete notifications:', notifError);
      }
    }

    return updatedUser;
  }

  async completeOnboarding(userId: string, data: CompleteOnboardingDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, profileCompleted: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    if (user.profileCompleted) {
      throw new BadRequestException('Profil zaten tamamlanmış.');
    }

    // Date string'i Date object'e çevir
    const dateOfBirth = new Date(data.dateOfBirth);

    // Yaşı hesapla (sadece kayıt için, DB'de saklama - KVKK uyumlu)
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }

    // Minimum yaş kontrolü (13 yaş - COPPA, GDPR-K uyumlu)
    if (age < 13) {
      throw new BadRequestException('Feellink\'i kullanmak için en az 13 yaşında olmalısınız.');
    }

    // GDPR consent kontrolü
    if (!data.gdprConsent) {
      throw new BadRequestException('Kişisel verilerin işlenmesi için onay gereklidir.');
    }

    // 🔒 Şehir validasyonu (Türkiye için)
    if (data.city && data.country === 'TR') {
      if (!isValidTürkiyeCity(data.city)) {
        throw new BadRequestException('Geçersiz şehir adı. Lütfen geçerli bir Türkiye ili seçin.');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        dateOfBirth,
        country: data.country,
        city: data.city,
        gender: data.gender,
        gdprConsent: data.gdprConsent,
        gdprConsentAt: data.gdprConsent ? new Date() : null,
        analyticsConsent: data.analyticsConsent || false,
        profileCompleted: true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        avatar: true,
        bio: true,
        profileCompleted: true,
        dateOfBirth: true,
        country: true,
        city: true,
        gender: true,
        roles: true,
        plan: true,
        badges: true,
        isPrivate: true,
        isVerified: true,
        isAdmin: true,
        superAdmin: true,
      },
    });

    // 🔔 Zorunlu alanlar tamamlandıysa bildirimi sil (kalıcı çözüm)
    const hasRequiredFields = updatedUser.dateOfBirth && updatedUser.country && updatedUser.city && updatedUser.gender;
    if (hasRequiredFields) {
      try {
        // "profile_incomplete" bildirimlerini sil (kalıcı çözüm)
        await this.prisma.notification.deleteMany({
          where: {
            userId: userId,
            type: 'profile_incomplete',
          },
        });
      } catch (notifError) {
        console.warn('[UsersService] Failed to delete profile_incomplete notifications:', notifError);
      }
    }

    // 🔒 KRİTİK: Response formatı - frontend'in beklediği formatta döndür
    return {
      success: true,
      user: updatedUser,
      message: 'Profil başarıyla tamamlandı.',
    };
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
        roles: true,
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
      roles: u.roles,
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
        roles: true,
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
          roles: true,
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
        isAdmin: true, // 🎯 activeRole hesaplaması için gerekli
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
        isAdmin: true, // 🎯 activeRole hesaplaması için gerekli
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

    // 🎯 Aktif rolü hesapla (getProfile metodundaki mantıkla aynı)
    const getActiveRole = (roles: string[], isAdmin: boolean): string | null => {
      if (isAdmin) {
        return 'Admin';
      }
      if (!roles || roles.length === 0) {
        return null;
      }
      
      // Öncelik sırası: corporate > collector > artist > art_lover
      const rolePriority: Record<string, number> = {
        corporate: 1,
        collector: 2,
        artist: 3,
        art_lover: 4,
      };
      
      const sortedRoles = roles
        .filter((r) => rolePriority[r] !== undefined)
        .sort((a, b) => rolePriority[a] - rolePriority[b]);
      
      if (sortedRoles.length === 0) {
        return null;
      }
      
      const activeRoleCode = sortedRoles[0];
      const roleLabels: Record<string, string> = {
        art_lover: 'Sanatsever',
        corporate: 'Kurum',
        collector: 'Koleksiyoner',
        artist: 'Sanatçı',
      };
      
      return roleLabels[activeRoleCode] || null;
    };

    const userIsAdmin = current.isAdmin === true;
    const activeRole = getActiveRole(normalizedRoles, userIsAdmin);

    return {
      message: 'Rol ve plan bilgileri güncellendi',
      user: {
        ...updatedUser,
        activeRole: activeRole || null, // 🎯 Aktif rol eklendi
      },
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    const now = new Date();
    const scheduledDeletionAt = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            accountStatus: 'PENDING_DELETION',
            deletionRequestedAt: now,
            scheduledDeletionAt,
          },
        });
        await tx.refreshToken.deleteMany({ where: { userId } });
      });
    } catch (err: any) {
      console.error('[UsersService] deleteAccount error:', err?.message || err);
      throw new InternalServerErrorException('Hesap silinirken bir sorun oluştu. Lütfen tekrar deneyin.');
    }

    return { message: 'Hesabınız silme sürecine alındı. 15 gün içinde giriş yaparak hesabınızı yeniden aktif hale getirebilirsiniz.' };
  }

  /** Kalıcı silme: 15 gün dolan PENDING_DELETION hesaplarını siler (cron tarafından çağrılır). */
  async purgeScheduledDeletions(): Promise<number> {
    const now = new Date();
    const usersToPurge = await this.prisma.user.findMany({
      where: {
        accountStatus: 'PENDING_DELETION',
        scheduledDeletionAt: { lte: now },
      },
      select: { id: true },
    });

    let purged = 0;
    for (const u of usersToPurge) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.refreshToken.deleteMany({ where: { userId: u.id } });
          await tx.user.delete({ where: { id: u.id } });
        });
        purged++;
      } catch (err: any) {
        console.error('[UsersService] purgeScheduledDeletions error for', u.id, err?.message || err);
      }
    }
    return purged;
  }

  async getSavedArtworks(userId: string) {
    const savedArtworks = await this.prisma.savedArtwork.findMany({
      where: {
        userId,
        post: {
          type: 'artwork',
        },
      },
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
    });

    // Filter out null posts (in case artwork was deleted) - SAFE TYPE CHECK
    const validArtworks = savedArtworks.filter((sa): sa is typeof sa & { post: NonNullable<typeof sa.post> } => sa.post !== null);

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
        where: {
          userId,
          // ❌ post filtresi YOK - MongoDB nested query sorunu önlenir
        },
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
        where: {
          userId,
          // ❌ post filtresi YOK - MongoDB nested query sorunu önlenir
        },
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

  /**
   * SMS doğrulama kodu gönder (DEV MODE: console log)
   * @returns Dev mode'da kodu döner, production'da null
   */
  private async sendPhoneVerificationCode(userId: string, phoneNumber: string): Promise<string | null> {
    // 6 haneli kod üret
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 5 dakika sonra expire
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // Eski kodları sil (aynı kullanıcı için)
    await this.prisma.phoneVerification.deleteMany({
      where: {
        userId,
        verified: false,
      },
    });

    // Yeni kod kaydet
    await this.prisma.phoneVerification.create({
      data: {
        userId,
        phoneNumber,
        code,
        expiresAt,
      },
    });

    // TODO: Gerçek SMS servisi entegrasyonu (Twilio, Netgsm, vb.)
    // await this.smsService.send(phoneNumber, `Feellink doğrulama kodunuz: ${code}`);
    return null;
  }

  /**
   * Telefon numarası doğrulama
   */
  async verifyPhone(userId: string, code: string): Promise<{ success: boolean; message: string }> {
    if (!SMS_VERIFICATION_ENABLED) {
      throw new BadRequestException('SMS doğrulama özelliği şu anda kapalıdır.');
    }

    // Kullanıcının en son gönderilen, doğrulanmamış kodunu bul
    const verification = await this.prisma.phoneVerification.findFirst({
      where: {
        userId,
        code,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      throw new BadRequestException('Geçersiz veya süresi dolmuş doğrulama kodu.');
    }

    // Kodu doğrula
    await this.prisma.phoneVerification.update({
      where: { id: verification.id },
      data: { verified: true },
    });

    // Kullanıcının telefon numarasını doğrula
    await this.prisma.user.update({
      where: { id: userId },
      data: { phoneVerified: true },
    });

    return {
      success: true,
      message: 'Telefon numarası başarıyla doğrulandı.',
    };
  }

  /**
   * SMS doğrulama kodunu yeniden gönder
   */
  async resendPhoneCode(userId: string): Promise<{ success: boolean; message: string; _devMode?: { smsCode: string } }> {
    if (!SMS_VERIFICATION_ENABLED) {
      throw new BadRequestException('SMS doğrulama özelliği şu anda kapalıdır.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phoneNumber: true },
    });

    if (!user || !user.phoneNumber) {
      throw new BadRequestException('Telefon numarası bulunamadı. Lütfen önce telefon numaranızı ekleyin.');
    }

    await this.sendPhoneVerificationCode(userId, user.phoneNumber);

    return {
      success: true,
      message: 'Doğrulama kodu yeniden gönderildi.',
    };
  }

  /**
   * 🎨 Kullanıcının renk imzasını döndürür (tüm artwork'lerinden en çok kullanılan 5 renk)
   * @param username - Kullanıcı adı veya ID
   * @returns En çok kullanılan 5 renk (HEX formatında)
   * 
   * NOT: Bu metod sadece profil seviyesinde renk imzası için kullanılır.
   * Eser kartları veya eser grid'i ile ilgili değildir.
   */
  async getColorSignature(username: string): Promise<{ topColors: string[] }> {
    // Önce kullanıcıyı bul (username veya cuid ID ile)
    let user = await this.prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
      select: { id: true },
    });
    if (!user) {
      user = await this.prisma.user.findFirst({
        where: { id: username },
        select: { id: true },
      });
    }

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    // ✅ Circular dependency olmadan doğrudan Prisma kullanarak renkleri hesapla
    // ✅ Tüm artwork'leri al (renk olmasa bile - çünkü media'dan renk çıkarabiliriz)
    const userArtworks = await this.prisma.post.findMany({
      where: {
        userId: user.id,
        type: 'artwork',
      },
      select: {
        id: true,
        colorPalette: true,
        colors: true, // Eski eserler için fallback
        media: {
          select: {
            url: true,
            type: true,
          },
          orderBy: { order: 'asc' },
          take: 1, // İlk görseli al
        },
      },
    });

    // Tüm renkleri topla (colorPalette öncelikli, colors fallback)
    const allColors: string[] = [];
    
    for (const artwork of userArtworks) {
      // Önce colorPalette'e bak
      if (artwork.colorPalette && artwork.colorPalette.length > 0) {
        allColors.push(...artwork.colorPalette);
      } 
      // Sonra colors'a bak (eski eserler için)
      else if (artwork.colors && artwork.colors.length > 0) {
        allColors.push(...artwork.colors);
      }
      // Eğer hiç renk yoksa ve görsel varsa, backend'de renk analizi yapılabilir
      // Ama şu an için sadece mevcut renkleri kullanıyoruz (performans için)
    }

    // Renk sıklığını hesapla
    const colorFrequency: Record<string, number> = {};
    for (const color of allColors) {
      if (color && typeof color === 'string' && color.trim() !== '') {
        colorFrequency[color] = (colorFrequency[color] || 0) + 1;
      }
    }

    // En sık kullanılan renkleri sırala ve ilk 5'i al
    const topColors = Object.entries(colorFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color]) => color);

    return { topColors };
  }

  /**
   * Profil analizi: palet (Renk İmzası en fazla 15 renk), üretim ritmi, etkileşim, sanatsal özet.
   * Görsel Karakter oranları ilk 6 baskın renk üzerinden hesaplanır (önceki davranış).
   * Gizli profilde sadece profil sahibi erişebilir.
   */
  async getProfileAnalysis(
    username: string,
    currentUserId: string,
  ): Promise<{
    userId: string;
    username: string;
    visibility: 'public' | 'private';
    palette: string[];
    colorProfile?: {
      warmRatio: number;
      coolRatio: number;
      avgBrightness: number;
      avgSaturation: number;
      dominantMood?: string;
    };
    productionProfile: {
      totalPosts: number;
      activeMonth: string | null;
      postingFrequency: 'low' | 'medium' | 'high';
    };
    engagement: {
      totalLikes: number;
      totalComments: number;
      avgLikesPerPost: number;
      mostEngagedPostId: string | null;
    };
    summary: string;
  }> {
    let user: { id: string; username: string; isPrivate: boolean } | null = null;

    user = await this.prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
      select: { id: true, username: true, isPrivate: true },
    });
    if (!user) {
      user = await this.prisma.user.findFirst({
        where: { id: username },
        select: { id: true, username: true, isPrivate: true },
      });
    }

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    const isOwnProfile = currentUserId === user.id;
    if (user.isPrivate && !isOwnProfile) {
      const acceptedFollow = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: user.id,
          },
        },
      });
      if (!acceptedFollow) {
        throw new ForbiddenException(
          'Bu hesabın analiz bilgileri yalnızca takipçilerine açıktır.',
        );
      }
    }

    const posts = await this.prisma.post.findMany({
      where: { userId: user.id, isDeleted: false },
      select: {
        id: true,
        colorPalette: true,
        colors: true,
        createdAt: true,
      },
    });

    const postIds = posts.map((p) => p.id);
    const [likesByPost, commentsByPost] = await Promise.all([
      postIds.length > 0
        ? this.prisma.like.findMany({
            where: { postId: { in: postIds } },
            select: { postId: true },
          })
        : [],
      postIds.length > 0
        ? this.prisma.comment.findMany({
            where: { postId: { in: postIds } },
            select: { postId: true },
          })
        : [],
    ]);

    const likeCountByPost: Record<string, number> = {};
    const commentCountByPost: Record<string, number> = {};
    for (const id of postIds) {
      likeCountByPost[id] = 0;
      commentCountByPost[id] = 0;
    }
    for (const l of likesByPost) {
      if (likeCountByPost[l.postId] !== undefined) likeCountByPost[l.postId]++;
    }
    for (const c of commentsByPost) {
      if (commentCountByPost[c.postId] !== undefined) commentCountByPost[c.postId]++;
    }

    const totalPosts = posts.length;
    const totalLikes = Object.values(likeCountByPost).reduce((a, b) => a + b, 0);
    const totalComments = Object.values(commentCountByPost).reduce((a, b) => a + b, 0);
    const avgLikesPerPost = totalPosts > 0 ? totalLikes / totalPosts : 0;

    const postEngagement = postIds.map((id) => ({
      id,
      score: (likeCountByPost[id] ?? 0) + (commentCountByPost[id] ?? 0),
    }));
    postEngagement.sort((a, b) => b.score - a.score);
    const mostEngagedPostId =
      postEngagement.length > 0 && postEngagement[0].score > 0 ? postEngagement[0].id : null;

    const allColors: string[] = [];
    for (const post of posts) {
      if (post.colorPalette?.length) allColors.push(...post.colorPalette);
      else if (post.colors?.length) allColors.push(...post.colors);
    }
    const colorFreq: Record<string, number> = {};
    for (const c of allColors) {
      if (c && typeof c === 'string' && c.trim()) colorFreq[c] = (colorFreq[c] || 0) + 1;
    }
    const rankedColors = Object.entries(colorFreq).sort((a, b) => b[1] - a[1]);
    // Renk İmzası: en fazla 15; Görsel Karakter metrikleri önceki davranış için ilk 6 baskın renk
    const palette = rankedColors.slice(0, 15).map(([color]) => color);
    const paletteForMetrics = rankedColors.slice(0, 6).map(([color]) => color);

    const MONTH_NAMES_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const monthCounts: Record<number, number> = {};
    for (const p of posts) {
      const m = new Date(p.createdAt).getMonth();
      monthCounts[m] = (monthCounts[m] || 0) + 1;
    }
    const activeMonthEntry = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0];
    const activeMonth = activeMonthEntry ? MONTH_NAMES_TR[Number(activeMonthEntry[0])] ?? null : null;

    const now = new Date();
    const firstPost = posts.length ? new Date(Math.min(...posts.map((p) => p.createdAt.getTime()))) : now;
    const monthsDiff = Math.max(1, (now.getFullYear() - firstPost.getFullYear()) * 12 + (now.getMonth() - firstPost.getMonth()));
    const postsPerMonth = totalPosts / monthsDiff;
    const postingFrequency: 'low' | 'medium' | 'high' =
      postsPerMonth < 2 ? 'low' : postsPerMonth < 6 ? 'medium' : 'high';

    function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
      const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!match) return null;
      const r = parseInt(match[1], 16) / 255;
      const g = parseInt(match[2], 16) / 255;
      const b = parseInt(match[3], 16) / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
        return { h: h * 360, s: s ?? 0, l };
      }
      return { h: 0, s: 0, l };
    }

    let colorProfile: {
      warmRatio: number;
      coolRatio: number;
      avgBrightness: number;
      avgSaturation: number;
      dominantMood?: string;
    } | undefined;
    if (paletteForMetrics.length > 0) {
      const hslList = paletteForMetrics
        .map(hexToHsl)
        .filter((x): x is { h: number; s: number; l: number } => x != null);
      if (hslList.length > 0) {
        const warmCount = hslList.filter((hsl) => (hsl.h >= 0 && hsl.h < 60) || (hsl.h >= 300 && hsl.h <= 360)).length;
        const coolCount = hslList.filter((hsl) => hsl.h >= 120 && hsl.h < 300).length;
        const total = hslList.length;
        const warmRatio = total ? warmCount / total : 0.5;
        const coolRatio = total ? coolCount / total : 0.5;
        const avgBrightness = hslList.reduce((s, x) => s + x.l, 0) / hslList.length;
        const avgSaturation = hslList.reduce((s, x) => s + x.s, 0) / hslList.length;
        let dominantMood = 'balanced';
        if (warmRatio > 0.6 && avgSaturation > 0.5) dominantMood = 'warm-vivid';
        else if (coolRatio > 0.6 && avgSaturation > 0.5) dominantMood = 'cool-vivid';
        else if (warmRatio > 0.6) dominantMood = 'warm';
        else if (coolRatio > 0.6) dominantMood = 'cool';
        colorProfile = { warmRatio, coolRatio, avgBrightness, avgSaturation, dominantMood };
      }
    }

    const parts: string[] = [];
    if (colorProfile) {
      if (colorProfile.dominantMood === 'warm-vivid') parts.push('Üretimlerinde sıcak ve yüksek doygunluklu tonlar öne çıkıyor.');
      else if (colorProfile.dominantMood === 'cool-vivid') parts.push('Soğuk ve canlı renk paleti görsel dilini yansıtıyor.');
      else if (colorProfile.dominantMood === 'warm') parts.push('Sıcak tonlar ağırlıklı.');
      else if (colorProfile.dominantMood === 'cool') parts.push('Soğuk ton eğilimi belirgin.');
      else if (colorProfile.avgSaturation > 0.6) parts.push('Yüksek doygunluklu renkler kullanılıyor.');
    }
    if (postingFrequency === 'high') parts.push('Üretim ritmi yoğun.');
    else if (postingFrequency === 'medium') parts.push('Düzenli paylaşım ritmi görülüyor.');
    if (totalLikes + totalComments > 0) parts.push('Etkileşim alan paylaşımlar öne çıkıyor.');
    const summary = parts.length > 0 ? parts.join(' ') : 'Profil analizi henüz yeterli veriyle zenginleştirilecek.';

    return {
      userId: user.id,
      username: user.username,
      visibility: user.isPrivate ? 'private' : 'public',
      palette,
      colorProfile,
      productionProfile: {
        totalPosts,
        activeMonth,
        postingFrequency,
      },
      engagement: {
        totalLikes,
        totalComments,
        avgLikesPerPost: Math.round(avgLikesPerPost * 10) / 10,
        mostEngagedPostId,
      },
      summary,
    };
  }

  async createRoleChangeRequest(userId: string, dto: { requestedRole: string; message?: string }) {
    // Kullanıcının mevcut rolünü kontrol et
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true, username: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    // Aynı rolü seçmişse hata ver
    const currentRole = user.roles?.[0];
    if (dto.requestedRole === currentRole) {
      throw new BadRequestException('Zaten bu role sahipsiniz.');
    }

    // Bekleyen bir talebi varsa hata ver
    const existingRequest = await this.prisma.roleChangeRequest.findFirst({
      where: {
        userId,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      throw new BadRequestException('Zaten bekleyen bir rol değişikliği talebiniz var.');
    }

    // Yeni talep oluştur
    const request = await this.prisma.roleChangeRequest.create({
      data: {
        userId,
        requestedRole: dto.requestedRole as any,
        message: dto.message || null,
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    // Admin'lere bildirim gönder (notifications service kullanarak)
    try {
      const admins = await this.prisma.user.findMany({
        where: {
          OR: [{ isAdmin: true }, { superAdmin: true }],
        },
        select: { id: true },
      });

      for (const admin of admins) {
        await this.notificationsService.createNotification({
          userId: admin.id,
          type: 'role_change_request',
          message: `${user.username || 'Bir kullanıcı'} rol değişikliği talebinde bulundu.`,
          meta: {
            requestId: request.id,
            requestedRole: dto.requestedRole,
          },
        });
      }
    } catch (error) {
      console.error('Bildirim gönderilirken hata:', error);
      // Bildirim hatası talep oluşturmayı engellemez
    }

    return {
      success: true,
      message: 'Rol değişikliği talebiniz gönderildi. Yöneticiler tarafından incelenecektir.',
      request: {
        id: request.id,
        requestedRole: request.requestedRole,
        status: request.status,
        createdAt: request.createdAt,
      },
    };
  }
}

