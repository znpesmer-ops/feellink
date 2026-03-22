import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
export declare class EventsController {
    private eventsService;
    constructor(eventsService: EventsService);
    getAllEvents(): Promise<{
        events: (Record<string, unknown> & {
            approvedParticipantsCount: number;
            capacity: number;
        })[];
    }>;
    getMyEvents(user: any): Promise<(Record<string, unknown> & {
        approvedParticipantsCount: number;
        capacity: number;
    })[]>;
    getEvents(authorId?: string): Promise<(Record<string, unknown> & {
        approvedParticipantsCount: number;
        capacity: number;
    })[]>;
    getEvent(id: string, user?: {
        id: string;
    }): Promise<Record<string, unknown> & {
        approvedParticipantsCount: number;
        capacity: number;
    }>;
    createEvent(user: any, dto: CreateEventDto): Promise<{
        date: Date;
        participantCount: number;
        maxParticipants: number;
        id: string;
        title: string;
        description: string;
        coverImage: string;
        ticketUrl: string;
        price: number;
        isFree: boolean;
        location: string;
        ownerId: string;
        reminderMailSent: boolean;
        isDeleted: boolean;
        deletedAt: Date;
        createdAt: Date;
        updatedAt: Date;
    }>;
    joinEvent(user: any, id: string): Promise<Record<string, unknown> & {
        approvedParticipantsCount: number;
        capacity: number;
    }>;
    getParticipants(id: string, user: any): Promise<{
        id: string;
        username: string;
        fullName: string;
        avatar: string;
    }[]>;
    getEventComments(id: string): Promise<({
        author: {
            id: string;
            isDeleted: boolean;
            deletedAt: Date;
            createdAt: Date;
            updatedAt: Date;
            username: string;
            email: string;
            password: string;
            fullName: string;
            bio: string;
            avatar: string;
            roles: import(".prisma/client").$Enums.UserRole[];
            extras: string[];
            plan: import(".prisma/client").$Enums.SubscriptionPlan;
            badges: string[];
            isPrivate: boolean;
            isVerified: boolean;
            isAdmin: boolean;
            superAdmin: boolean;
            followerCount: number;
            followingCount: number;
            isOnline: boolean;
            lastSeen: Date;
            lastActiveAt: Date;
            passwordResetToken: string;
            passwordResetExpires: Date;
            usernameLastChangedAt: Date;
            nameLastChangedAt: Date;
            website: string;
            dateOfBirth: Date;
            country: string;
            city: string;
            gender: string;
            profileCompleted: boolean;
            phoneNumber: string;
            phoneVerified: boolean;
            gdprConsent: boolean;
            gdprConsentAt: Date;
            analyticsConsent: boolean;
            showProfileColorSignature: boolean;
            termsAccepted: boolean;
            termsAcceptedAt: Date;
            accountStatus: import(".prisma/client").$Enums.AccountStatus;
            suspendedAt: Date;
            suspendedUntil: Date;
            suspensionReason: string;
            suspensionNote: string;
            suspendedByAdminId: string;
            deletionRequestedAt: Date;
            scheduledDeletionAt: Date;
            deletedBy: string;
        };
    } & {
        text: string;
        id: string;
        createdAt: Date;
        eventId: string;
        authorId: string;
    })[]>;
    createEventComment(user: any, id: string, data: any): Promise<{
        author: {
            id: string;
            isDeleted: boolean;
            deletedAt: Date;
            createdAt: Date;
            updatedAt: Date;
            username: string;
            email: string;
            password: string;
            fullName: string;
            bio: string;
            avatar: string;
            roles: import(".prisma/client").$Enums.UserRole[];
            extras: string[];
            plan: import(".prisma/client").$Enums.SubscriptionPlan;
            badges: string[];
            isPrivate: boolean;
            isVerified: boolean;
            isAdmin: boolean;
            superAdmin: boolean;
            followerCount: number;
            followingCount: number;
            isOnline: boolean;
            lastSeen: Date;
            lastActiveAt: Date;
            passwordResetToken: string;
            passwordResetExpires: Date;
            usernameLastChangedAt: Date;
            nameLastChangedAt: Date;
            website: string;
            dateOfBirth: Date;
            country: string;
            city: string;
            gender: string;
            profileCompleted: boolean;
            phoneNumber: string;
            phoneVerified: boolean;
            gdprConsent: boolean;
            gdprConsentAt: Date;
            analyticsConsent: boolean;
            showProfileColorSignature: boolean;
            termsAccepted: boolean;
            termsAcceptedAt: Date;
            accountStatus: import(".prisma/client").$Enums.AccountStatus;
            suspendedAt: Date;
            suspendedUntil: Date;
            suspensionReason: string;
            suspensionNote: string;
            suspendedByAdminId: string;
            deletionRequestedAt: Date;
            scheduledDeletionAt: Date;
            deletedBy: string;
        };
    } & {
        text: string;
        id: string;
        createdAt: Date;
        eventId: string;
        authorId: string;
    }>;
    updateEvent(user: any, id: string, data: any): Promise<{
        date: Date;
        participantCount: number;
        maxParticipants: number;
        id: string;
        title: string;
        description: string;
        coverImage: string;
        ticketUrl: string;
        price: number;
        isFree: boolean;
        location: string;
        ownerId: string;
        reminderMailSent: boolean;
        isDeleted: boolean;
        deletedAt: Date;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteEvent(user: any, id: string): Promise<{
        success: boolean;
    }>;
    getPendingRequests(user: any, id: string): Promise<{
        id: string;
        userId: string;
        status: import(".prisma/client").$Enums.EventParticipantStatus;
        createdAt: Date;
        user: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    }[]>;
    updateRequestStatus(user: any, eventId: string, requestUserId: string, body: {
        status: 'APPROVED' | 'REJECTED';
    }): Promise<{
        user: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        eventId: string;
        userId: string;
        status: import(".prisma/client").$Enums.EventParticipantStatus;
        reminderSentAt: Date;
        reminder24hSentAt: Date;
        reminder2hSentAt: Date;
    }>;
}
