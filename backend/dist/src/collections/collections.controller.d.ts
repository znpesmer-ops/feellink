import { CollectionsService } from './collections.service';
export declare class CollectionsController {
    private collectionsService;
    constructor(collectionsService: CollectionsService);
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
    getMyCollections(user: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        coverImage: string;
        description: string;
        isPublic: boolean;
        ownerId: string;
    }[]>;
    getCollectionById(id: string): Promise<any>;
    searchAddableItems(user: any, collectionId: string, query?: string, ownerId?: string, cursor?: string, take?: string): Promise<{
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
    createCollection(user: any, data: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        coverImage: string;
        description: string;
        isPublic: boolean;
        ownerId: string;
    }>;
    updateCollection(user: any, id: string, data: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        coverImage: string;
        description: string;
        isPublic: boolean;
        ownerId: string;
    }>;
    deleteCollection(user: any, id: string): Promise<{
        success: boolean;
    }>;
    addItemToCollection(user: any, collectionId: string, data: {
        postId: string;
    }): Promise<any>;
    removeItemFromCollection(user: any, collectionId: string, itemId: string): Promise<{
        success: boolean;
    }>;
    reorderItems(user: any, collectionId: string, data: {
        itemIds: string[];
    }): Promise<{
        success: boolean;
    }>;
}
