import { PrismaService } from '../prisma/prisma.service';
import { LimitsService } from '../limits/limits.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class CollectionsService {
    private prisma;
    private limitsService;
    private notificationsService;
    constructor(prisma: PrismaService, limitsService: LimitsService, notificationsService: NotificationsService);
    private ensurePermission;
    getMyCollections(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string;
        coverImage: string;
        ownerId: string;
        isPublic: boolean;
    }[]>;
    getAllCollections(): Promise<({
        owner: {
            username: string;
            fullName: string;
            id: string;
            avatar: string;
            roles: import(".prisma/client").$Enums.UserRole[];
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string;
        coverImage: string;
        ownerId: string;
        isPublic: boolean;
    })[]>;
    createCollection(userId: string, data: {
        title: string;
        description?: string;
        coverImage?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string;
        coverImage: string;
        ownerId: string;
        isPublic: boolean;
    }>;
    updateCollection(userId: string, id: string, data: {
        title?: string;
        description?: string;
        coverImage?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string;
        coverImage: string;
        ownerId: string;
        isPublic: boolean;
    }>;
    deleteCollection(userId: string, id: string): Promise<{
        success: boolean;
    }>;
    getCollectionById(id: string): Promise<any>;
    addItemToCollection(userId: string, collectionId: string, postId: string): Promise<any>;
    removeItemFromCollection(userId: string, collectionId: string, itemId: string): Promise<{
        success: boolean;
    }>;
    reorderItems(userId: string, collectionId: string, itemIds: string[]): Promise<{
        success: boolean;
    }>;
    searchAddableItems(userId: string, collectionId: string, query: string, ownerId?: string, cursor?: string, take?: number): Promise<{
        artworks: {
            id: string;
            title: string;
            caption: string;
            coverUrl: string;
            isAlreadyInCollection: any;
            owner: {
                id: string;
                username: string;
                fullName: string;
                avatar: string;
            };
        }[];
        users: {
            id: any;
            username: any;
            fullName: any;
            avatar: any;
        }[];
        nextCursor: string;
    }>;
}
