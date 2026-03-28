import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class CollectionsService {
    private prisma;
    private notificationsService;
    constructor(prisma: PrismaService, notificationsService: NotificationsService);
    private ensurePermission;
    getMyCollections(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        coverImage: string;
        description: string;
        isPublic: boolean;
        ownerId: string;
    }[]>;
    getAllCollections(): Promise<({
        owner: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
            roles: import(".prisma/client").$Enums.UserRole[];
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        coverImage: string;
        description: string;
        isPublic: boolean;
        ownerId: string;
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
        coverImage: string;
        description: string;
        isPublic: boolean;
        ownerId: string;
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
        coverImage: string;
        description: string;
        isPublic: boolean;
        ownerId: string;
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
