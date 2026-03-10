import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class SearchService implements OnModuleInit {
    private configService;
    private prisma;
    private client;
    private usersIndex;
    private hashtagsIndex;
    private readonly logger;
    private isDisabled;
    private readonly defaultAvatar;
    private readonly FORCE_FALLBACK;
    constructor(configService: ConfigService, prisma: PrismaService);
    onModuleInit(): Promise<void>;
    indexUser(user: any): Promise<void>;
    indexHashtag(hashtag: any): Promise<void>;
    searchUsers(query: string, limit?: number, excludeUserId?: string): Promise<any>;
    searchHashtags(query: string, limit?: number): Promise<any>;
    private shouldUseSearch;
    private disableSearch;
    private getAvatarUrl;
    private searchUsersFallback;
    private searchHashtagsFallback;
}
