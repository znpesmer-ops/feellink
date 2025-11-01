import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch } from 'meilisearch';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService implements OnModuleInit {
  private client: MeiliSearch;
  private usersIndex: any;
  private hashtagsIndex: any;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.client = new MeiliSearch({
      host: this.configService.get('MEILISEARCH_HOST'),
      apiKey: this.configService.get('MEILISEARCH_API_KEY'),
    });
  }

  async onModuleInit() {
    // Initialize indexes
    try {
      this.usersIndex = this.client.index('users');
      this.hashtagsIndex = this.client.index('hashtags');

      // Configure searchable attributes
      await this.usersIndex.updateSearchableAttributes(['username', 'fullName', 'bio']);
      await this.hashtagsIndex.updateSearchableAttributes(['name']);
    } catch (error) {
      console.error('Error initializing Meilisearch:', error);
    }
  }

  async indexUser(user: any) {
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
      console.error('Error indexing user:', error);
    }
  }

  async indexHashtag(hashtag: any) {
    try {
      await this.hashtagsIndex.addDocuments([{
        id: hashtag.id,
        name: hashtag.name,
        postCount: hashtag.postCount,
      }]);
    } catch (error) {
      console.error('Error indexing hashtag:', error);
    }
  }

  async searchUsers(query: string, limit: number = 20, excludeUserId?: string) {
    try {
      const results = await this.usersIndex.search(query, {
        limit: limit + (excludeUserId ? 1 : 0), // Get one extra to account for exclusion
      });
      
      // Filter out current user if provided
      let hits = results.hits || [];
      if (excludeUserId) {
        hits = hits.filter((hit: any) => hit.id !== excludeUserId);
      }
      
      // Avatar URL'lerini dönüştür (MeiliSearch sonuçları için)
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
      
      return hits.slice(0, limit).map((hit: any) => ({
        ...hit,
        avatar: getAvatarUrl(hit.avatar),
        avatarUrl: getAvatarUrl(hit.avatar),
      }));
    } catch (error) {
      console.error('Error searching users:', error);
      // Fallback to database search
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
      
      return users.map((u: any) => ({
        ...u,
        avatar: getAvatarUrl(u.avatar),
        avatarUrl: getAvatarUrl(u.avatar), // Geriye uyumluluk için
      }));
    }
  }

  async searchHashtags(query: string, limit: number = 20) {
    try {
      const results = await this.hashtagsIndex.search(query, {
        limit,
      });
      return results.hits;
    } catch (error) {
      console.error('Error searching hashtags:', error);
      // Fallback to database search
      return this.prisma.hashtag.findMany({
        where: {
          name: { contains: query, mode: 'insensitive' },
        },
        take: limit,
        orderBy: { postCount: 'desc' },
      });
    }
  }
}


