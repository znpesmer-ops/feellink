import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch } from 'meilisearch';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService implements OnModuleInit {
  private client: MeiliSearch | null = null;
  private usersIndex: any = null;
  private hashtagsIndex: any = null;
  private readonly logger = new Logger(SearchService.name);
  private isDisabled = false;
  // ✅ Avatar yoksa null döndür - frontend safeAvatar() fonksiyonu fallback kullanacak
  // ✅ Eski Unsplash URL'i kaldırıldı (kadın placeholder sorunu)
  private readonly defaultAvatar = null;
  private readonly FORCE_FALLBACK = true; // Local (Prisma) arama aktif

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const host = this.configService.get<string>('MEILISEARCH_HOST');
    const apiKey = this.configService.get<string>('MEILISEARCH_API_KEY');

    const shouldDisable =
      !host ||
      !apiKey ||
      apiKey === 'master_key_change_in_production' ||
      apiKey.trim().length === 0;

    if (shouldDisable) {
      this.disableSearch('Meilisearch devre dışı bırakıldı (host veya API anahtarı tanımlı değil).');
      return;
    }

    try {
      this.client = new MeiliSearch({
        host,
        apiKey,
      });
    } catch (error) {
      this.disableSearch('Meilisearch istemcisi başlatılamadı.', error);
    }
  }

  async onModuleInit() {
    if (this.isDisabled || !this.client) {
      return;
    }

    // Initialize indexes
    try {
      this.usersIndex = this.client.index('users');
      this.hashtagsIndex = this.client.index('hashtags');

      // Configure searchable attributes
      await this.usersIndex.updateSearchableAttributes(['username', 'fullName', 'bio']);
      await this.hashtagsIndex.updateSearchableAttributes(['name']);
    } catch (error) {
      this.disableSearch('Meilisearch indeksleri hazırlanırken hata oluştu.', error);
    }
  }

  async indexUser(user: any) {
    if (!this.shouldUseSearch()) {
      return;
    }

    try {
      await this.usersIndex.addDocuments([{
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        bio: user.bio,
        avatar: user.avatar,
        isVerified: user.isVerified,
      }]);
    } catch (error) {
      this.disableSearch('Kullanıcı indeksleme işlemi başarısız oldu.', error);
    }
  }

  async indexHashtag(hashtag: any) {
    if (!this.shouldUseSearch()) {
      return;
    }

    try {
      await this.hashtagsIndex.addDocuments([{
        id: hashtag.id,
        name: hashtag.name,
        postCount: hashtag.postCount,
      }]);
    } catch (error) {
      this.disableSearch('Hashtag indeksleme işlemi başarısız oldu.', error);
    }
  }

  async searchUsers(query: string, limit: number = 20, excludeUserId?: string) {
    if (!this.shouldUseSearch()) {
      return this.searchUsersFallback(query, limit, excludeUserId);
    }

    try {
      const results = await this.usersIndex.search(query, {
        limit: limit + (excludeUserId ? 1 : 0), // Get one extra to account for exclusion
      });

      let hits = results.hits || [];
      if (excludeUserId) {
        hits = hits.filter((hit: any) => hit.id !== excludeUserId);
      }

      return hits.slice(0, limit).map((hit: any) => ({
        ...hit,
        avatar: this.getAvatarUrl(hit.avatar ?? null),
        avatarUrl: this.getAvatarUrl(hit.avatar ?? null),
      }));
    } catch (error) {
      this.disableSearch('Kullanıcı arama işlemi Meilisearch üzerinde başarısız oldu.', error);
      return this.searchUsersFallback(query, limit, excludeUserId);
    }
  }

  async searchHashtags(query: string, limit: number = 20) {
    if (!this.shouldUseSearch()) {
      return this.searchHashtagsFallback(query, limit);
    }

    try {
      const results = await this.hashtagsIndex.search(query, {
        limit,
      });
      return results.hits;
    } catch (error) {
      this.disableSearch('Hashtag arama işlemi Meilisearch üzerinde başarısız oldu.', error);
      return this.searchHashtagsFallback(query, limit);
    }
  }

  private shouldUseSearch(): boolean {
    if (this.FORCE_FALLBACK) {
      return false;
    }
    return !this.isDisabled && !!this.client && !!this.usersIndex && !!this.hashtagsIndex;
  }

  private disableSearch(message: string, error?: unknown) {
    if (this.isDisabled) {
      return;
    }

    const errorDetail = error instanceof Error ? error.message : error;
    if (error) {
      this.logger.warn(`${message} Detay: ${errorDetail}`);
    } else {
      this.logger.warn(message);
    }

    this.isDisabled = true;
    this.client = null;
    this.usersIndex = null;
    this.hashtagsIndex = null;
  }

  private getAvatarUrl(avatar: string | null): string | null {
    // ✅ Avatar yoksa null döndür - frontend safeAvatar() fonksiyonu güvenli fallback kullanacak
    if (!avatar || avatar.trim() === '') {
      return null;
    }
    if (avatar.startsWith('http')) {
      return avatar;
    }

    const minioEndpoint = this.configService.get('MINIO_ENDPOINT') || 'localhost';
    const minioPort = this.configService.get('MINIO_PORT') || '9000';
    const minioUseSSL = this.configService.get('MINIO_USE_SSL') === 'true';
    const minioBucket = this.configService.get('MINIO_BUCKET_NAME') || 'instagram-uploads';
    const protocol = minioUseSSL ? 'https' : 'http';
    const CDN_BASE = this.configService.get('CDN_BASE_URL');

    if (CDN_BASE) {
      return `${CDN_BASE}${avatar.startsWith('/') ? avatar : `/${avatar}`}`;
    }

    return `${protocol}://${minioEndpoint}:${minioPort}/${minioBucket}/${avatar}`;
  }

  private async searchUsersFallback(query: string, limit: number, excludeUserId?: string) {
    const where: any = {
      OR: [
        { username: { contains: query, mode: 'insensitive' } },
        { fullName: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (excludeUserId) {
      where.id = { not: excludeUserId };
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        fullName: true,
        avatar: true,
        isVerified: true,
      },
      take: limit,
    });

    return users.map((u: any) => ({
      ...u,
      avatar: this.getAvatarUrl(u.avatar),
      avatarUrl: this.getAvatarUrl(u.avatar),
    }));
  }

  private async searchHashtagsFallback(query: string, limit: number) {
    return this.prisma.hashtag.findMany({
      where: {
        name: { contains: query, mode: 'insensitive' },
      },
      take: limit,
      orderBy: { postCount: 'desc' },
    });
  }
}
