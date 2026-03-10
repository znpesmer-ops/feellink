"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SearchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const meilisearch_1 = require("meilisearch");
const prisma_service_1 = require("../prisma/prisma.service");
let SearchService = SearchService_1 = class SearchService {
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
        this.client = null;
        this.usersIndex = null;
        this.hashtagsIndex = null;
        this.logger = new common_1.Logger(SearchService_1.name);
        this.isDisabled = false;
        this.defaultAvatar = null;
        this.FORCE_FALLBACK = true;
        const isServerless = process.env.VERCEL === '1';
        const isProd = process.env.NODE_ENV === 'production';
        if (isServerless || isProd) {
            this.disableSearch('Meilisearch devre dışı bırakıldı (serverless-safe).');
            return;
        }
        const host = this.configService.get('MEILISEARCH_HOST');
        const apiKey = this.configService.get('MEILISEARCH_API_KEY');
        const shouldDisable = !host ||
            !apiKey ||
            apiKey === 'master_key_change_in_production' ||
            apiKey.trim().length === 0;
        if (shouldDisable) {
            this.disableSearch('Meilisearch devre dışı bırakıldı (host veya API anahtarı tanımlı değil).');
            return;
        }
        try {
            this.client = new meilisearch_1.MeiliSearch({
                host,
                apiKey,
            });
        }
        catch (error) {
            this.disableSearch('Meilisearch istemcisi başlatılamadı.', error);
        }
    }
    async onModuleInit() {
        if (this.isDisabled || !this.client) {
            return;
        }
        try {
            this.usersIndex = this.client.index('users');
            this.hashtagsIndex = this.client.index('hashtags');
            await this.usersIndex.updateSearchableAttributes(['username', 'fullName', 'bio']);
            await this.hashtagsIndex.updateSearchableAttributes(['name']);
        }
        catch (error) {
            this.disableSearch('Meilisearch indeksleri hazırlanırken hata oluştu.', error);
        }
    }
    async indexUser(user) {
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
        }
        catch (error) {
            this.disableSearch('Kullanıcı indeksleme işlemi başarısız oldu.', error);
        }
    }
    async indexHashtag(hashtag) {
        if (!this.shouldUseSearch()) {
            return;
        }
        try {
            await this.hashtagsIndex.addDocuments([{
                    id: hashtag.id,
                    name: hashtag.name,
                    postCount: hashtag.postCount,
                }]);
        }
        catch (error) {
            this.disableSearch('Hashtag indeksleme işlemi başarısız oldu.', error);
        }
    }
    async searchUsers(query, limit = 20, excludeUserId) {
        if (!this.shouldUseSearch()) {
            return this.searchUsersFallback(query, limit, excludeUserId);
        }
        try {
            const results = await this.usersIndex.search(query, {
                limit: limit + (excludeUserId ? 1 : 0),
            });
            let hits = results.hits || [];
            if (excludeUserId) {
                hits = hits.filter((hit) => hit.id !== excludeUserId);
            }
            return hits.slice(0, limit).map((hit) => ({
                ...hit,
                avatar: this.getAvatarUrl(hit.avatar ?? null),
                avatarUrl: this.getAvatarUrl(hit.avatar ?? null),
            }));
        }
        catch (error) {
            this.disableSearch('Kullanıcı arama işlemi Meilisearch üzerinde başarısız oldu.', error);
            return this.searchUsersFallback(query, limit, excludeUserId);
        }
    }
    async searchHashtags(query, limit = 20) {
        if (!this.shouldUseSearch()) {
            return this.searchHashtagsFallback(query, limit);
        }
        try {
            const results = await this.hashtagsIndex.search(query, {
                limit,
            });
            return results.hits;
        }
        catch (error) {
            this.disableSearch('Hashtag arama işlemi Meilisearch üzerinde başarısız oldu.', error);
            return this.searchHashtagsFallback(query, limit);
        }
    }
    shouldUseSearch() {
        if (this.FORCE_FALLBACK) {
            return false;
        }
        return !this.isDisabled && !!this.client && !!this.usersIndex && !!this.hashtagsIndex;
    }
    disableSearch(message, error) {
        if (this.isDisabled) {
            return;
        }
        const errorDetail = error instanceof Error ? error.message : error;
        if (error) {
            this.logger.warn(`${message} Detay: ${errorDetail}`);
        }
        else {
            this.logger.warn(message);
        }
        this.isDisabled = true;
        this.client = null;
        this.usersIndex = null;
        this.hashtagsIndex = null;
    }
    getAvatarUrl(avatar) {
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
    async searchUsersFallback(query, limit, excludeUserId) {
        const where = {
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
        return users.map((u) => ({
            ...u,
            avatar: this.getAvatarUrl(u.avatar),
            avatarUrl: this.getAvatarUrl(u.avatar),
        }));
    }
    async searchHashtagsFallback(query, limit) {
        return this.prisma.hashtag.findMany({
            where: {
                name: { contains: query, mode: 'insensitive' },
            },
            take: limit,
            orderBy: { postCount: 'desc' },
        });
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = SearchService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], SearchService);
//# sourceMappingURL=search.service.js.map